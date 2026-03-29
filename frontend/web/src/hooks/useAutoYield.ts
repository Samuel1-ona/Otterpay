import { useEffect, useRef, useState } from 'react';
import { WalletInterface, Amount, Token } from 'starkzap';
import { num, hash } from 'starknet';

// The Transfer event name as defined in ERC20
const TRANSFER_EVENT_SELECTOR = hash.getSelectorFromName('Transfer');

export interface AutoYieldOptions {
  wallet: WalletInterface | null;
  supportedTokens: Token[];
  autoSweepIdleBalances?: boolean;
  pollIntervalMs?: number;
  onDepositSuccess?: (token: Token, amount: Amount, txHash: string) => void;
  onDepositError?: (error: Error) => void;
}

export interface AutoYieldUpdate {
  tokenSymbol: string;
  amountLabel: string;
  txHash: string;
  at: number;
}

/**
 * useAutoYield Hook (Production Ready)
 * 
 * Automatically listens for incoming transfers and deposits them into Vesu.
 * Leverages background polling and atomic Starkzap SDK methods.
 */
export const useAutoYield = ({
  wallet,
  supportedTokens,
  autoSweepIdleBalances = false,
  pollIntervalMs = 60000,
  onDepositSuccess,
  onDepositError,
}: AutoYieldOptions) => {
  const [isDepositing, setIsDepositing] = useState(false);
  const [lastSubmittedDeposit, setLastSubmittedDeposit] = useState<AutoYieldUpdate | null>(null);
  const [lastConfirmedDeposit, setLastConfirmedDeposit] = useState<AutoYieldUpdate | null>(null);
  const [lastDepositError, setLastDepositError] = useState<string | null>(null);
  const lastProcessedBlockRef = useRef<number | 'latest'>('latest');
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const isPollingRef = useRef(false);

  useEffect(() => {
    if (!wallet || supportedTokens.length === 0) return;

    const sweepIdleBalances = async (reason: 'startup' | 'incoming_transfer' | 'scheduled') => {
      let depositedAny = false;

      for (const token of supportedTokens) {
        const walletBalance = await wallet.balanceOf(token);
        const reserve = getGasReserve(token);
        const minDeposit = getMinimumDeposit(token);

        const depositAmount = walletBalance.gt(reserve)
          ? walletBalance.subtract(reserve)
          : Amount.fromRaw(0n, token);

        if (depositAmount.isZero() || depositAmount.lt(minDeposit)) {
          continue;
        }

        console.log(
          `[AutoYield] Sweeping ${depositAmount.toFormatted()} ${token.symbol} into Vesu (${reason}).`
        );

        setIsDepositing(true);
        setLastDepositError(null);
        try {
          const tx = await wallet.lending().deposit({ token, amount: depositAmount });
          const update = {
            tokenSymbol: token.symbol || 'TOKEN',
            amountLabel: depositAmount.toFormatted(true),
            txHash: tx.hash,
            at: Date.now(),
          };

          setLastSubmittedDeposit(update);
          await tx.wait();
          setLastConfirmedDeposit(update);
          depositedAny = true;

          if (onDepositSuccess) {
            onDepositSuccess(token, depositAmount, tx.hash);
          }
        } catch (depositErr: unknown) {
          const error = depositErr instanceof Error ? depositErr : new Error('Auto-deposit failed');
          console.error(`[AutoYield] Failed to auto-deposit ${token.symbol}:`, error);
          setLastDepositError(error.message);
          if (onDepositError) onDepositError(error);
        } finally {
          setIsDepositing(false);
        }
      }

      return depositedAny;
    };

    const pollIncomingTransfers = async () => {
      if (isPollingRef.current) return;
      isPollingRef.current = true;

      try {
        const provider = wallet.getProvider();
        
        // 1. Resolve current block if we just started
        if (lastProcessedBlockRef.current === 'latest') {
          const block = await provider.getBlock('latest');
          lastProcessedBlockRef.current = block.block_number; 
          if (autoSweepIdleBalances) {
            await sweepIdleBalances('startup');
          }
          return;
        }

        const currentAddress = wallet.address;
        let detectedIncomingTransfer = false;

        // 2. Fetch all transfer events to this wallet in one go
        let continuationToken: string | undefined;
        const allEvents: Array<{
          from_address: string;
          data: string[];
        }> = [];
        
        // Use a consistent target block for this poll
        const latestBlock = await provider.getBlock('latest');
        const latestBlockNumber = latestBlock.block_number;

        const fromBlock = lastProcessedBlockRef.current + 1;
        if (fromBlock > latestBlockNumber) {
          // Update ref if we haven't seen this block yet, though typically it should be same
          lastProcessedBlockRef.current = latestBlockNumber;
          return;
        }

        console.log(`[AutoYield] Polling for transfers from block ${fromBlock} to ${latestBlockNumber}`);

        do {
          const eventsResponse: {
            events: Array<{ from_address: string; data: string[] }>;
            continuation_token?: string;
          } = await provider.getEvents({
            from_block: { block_number: fromBlock },
            to_block: { block_number: latestBlockNumber },
            keys: [[TRANSFER_EVENT_SELECTOR], [], [num.toHex(currentAddress)]],
            chunk_size: 50,
            continuation_token: continuationToken,
          });

          allEvents.push(...eventsResponse.events);
          continuationToken = eventsResponse.continuation_token;
        } while (continuationToken);

        if (allEvents.length === 0) {
          if (autoSweepIdleBalances) {
            await sweepIdleBalances('scheduled');
          }
          lastProcessedBlockRef.current = latestBlockNumber;
          return;
        }

        for (const event of allEvents) {
          // Find if this event belongs to a supported token
          const token = supportedTokens.find(t => 
            num.toBigInt(t.address) === num.toBigInt(event.from_address)
          );
          
          if (!token) continue;

          // event.data matches [from, to, value_low, value_high] in ERC20 Transfer event
          const amountRaw = uint256ToBigInt(event.data[2], event.data[3]);
          const incomingAmount = Amount.fromRaw(amountRaw, token);

          if (incomingAmount.isZero()) continue;

          console.log(`[AutoYield] Detected incoming ${incomingAmount.toFormatted()} (${token.symbol})`);
          detectedIncomingTransfer = true;
        }

        if (detectedIncomingTransfer && autoSweepIdleBalances) {
          await sweepIdleBalances('incoming_transfer');
        }

        // Update last processed block
        lastProcessedBlockRef.current = latestBlockNumber;
      } catch (err) {
        console.error('[AutoYield] Polling error:', err);
      } finally {
        isPollingRef.current = false;
      }
    };

    // Start Polling
    pollingRef.current = setInterval(pollIncomingTransfers, pollIntervalMs);
    pollIncomingTransfers(); // Initial check

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [wallet, supportedTokens, autoSweepIdleBalances, pollIntervalMs, onDepositSuccess, onDepositError]);

  return {
    isDepositing,
    lastSubmittedDeposit,
    lastConfirmedDeposit,
    lastDepositError,
  };
};

/**
 * Utility to convert Starknet Uint256 (low, high) to BigInt
 */
function uint256ToBigInt(low: string, high: string): bigint {
  return (BigInt(high) << BigInt(128)) + BigInt(low);
}

function getMinimumDeposit(token: Token): Amount {
  switch (token.symbol) {
    case 'USDC':
      return Amount.parse('0.10', token);
    case 'STRK':
      return Amount.parse('0.05', token);
    case 'ETH':
      return Amount.parse('0.0001', token);
    default:
      return Amount.fromRaw(1n, token);
  }
}

function getGasReserve(token: Token): Amount {
  switch (token.symbol) {
    case 'STRK':
      return Amount.parse('0.75', token);
    case 'ETH':
      return Amount.parse('0.0005', token);
    default:
      return Amount.fromRaw(0n, token);
  }
}
