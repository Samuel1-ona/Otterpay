import { useEffect, useRef, useState } from 'react';
import { WalletInterface, Amount, Token } from 'starkzap';
import { num, hash } from 'starknet';

// The Transfer event name as defined in ERC20
const TRANSFER_EVENT_SELECTOR = hash.getSelectorFromName('Transfer');

export interface AutoYieldOptions {
  wallet: WalletInterface | null;
  supportedTokens: Token[];
  pollIntervalMs?: number;
  onDepositSuccess?: (token: Token, amount: Amount, txHash: string) => void;
  onDepositError?: (error: Error) => void;
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
  pollIntervalMs = 60000,
  onDepositSuccess,
  onDepositError,
}: AutoYieldOptions) => {
  const [isDepositing, setIsDepositing] = useState(false);
  const lastProcessedBlockRef = useRef<number | 'latest'>('latest');
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!wallet || supportedTokens.length === 0) return;

    const pollIncomingTransfers = async () => {
      try {
        const provider = wallet.getProvider();
        
        // 1. Resolve current block if we just started
        if (lastProcessedBlockRef.current === 'latest') {
          const block = await provider.getBlock('latest');
          // In web, we might want to start from the current block to avoid accidental historic deposits
          lastProcessedBlockRef.current = block.block_number; 
          return;
        }

        const currentAddress = wallet.address;

        // 2. Fetch all transfer events to this wallet in one go
        let continuationToken: string | undefined;
        const allEvents: any[] = [];
        
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
          const eventsResponse: any = await provider.getEvents({
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

          // 3. Trigger Auto-Deposit to Vesu
          setIsDepositing(true);
          try {
            const tx = await wallet.lending().deposit({ token, amount: incomingAmount });
            console.log(`[AutoYield] Auto-deposit triggered for ${token.symbol}: ${tx.hash}`);
            
            if (onDepositSuccess) {
              onDepositSuccess(token, incomingAmount, tx.hash);
            }
          } catch (depositErr: any) {
            console.error(`[AutoYield] Failed to auto-deposit ${token.symbol}:`, depositErr);
            if (onDepositError) onDepositError(depositErr);
          } finally {
            setIsDepositing(false);
          }
        }

        // Update last processed block
        lastProcessedBlockRef.current = latestBlockNumber;
      } catch (err) {
        console.error('[AutoYield] Polling error:', err);
      }
    };

    // Start Polling
    pollingRef.current = setInterval(pollIncomingTransfers, pollIntervalMs);
    pollIncomingTransfers(); // Initial check

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [wallet, supportedTokens, pollIntervalMs, onDepositSuccess, onDepositError]);

  return { isDepositing };
};

/**
 * Utility to convert Starknet Uint256 (low, high) to BigInt
 */
function uint256ToBigInt(low: string, high: string): bigint {
  return (BigInt(high) << BigInt(128)) + BigInt(low);
}
