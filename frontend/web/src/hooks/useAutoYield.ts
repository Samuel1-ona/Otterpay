import { useEffect, useRef, useState } from 'react';
import { WalletInterface, Amount, Token } from 'starkzap';
import { num, hash, TransactionExecutionStatus } from 'starknet';

// The Transfer event name as defined in ERC20
const TRANSFER_EVENT_SELECTOR = hash.getSelectorFromName('Transfer');
const FAILED_SWEEP_RETRY_COOLDOWN_MS = 10 * 60 * 1000;

type AutoYieldReceipt = {
  execution_status?: string;
  finality_status?: string;
  revert_reason?: string;
  isSuccess?: () => boolean;
  isReverted?: () => boolean;
  value?: unknown;
};

type AutoYieldTx = {
  hash: string;
  wait: () => Promise<void>;
  receipt: () => Promise<AutoYieldReceipt>;
};

export interface AutoYieldOptions {
  wallet: WalletInterface | null;
  supportedTokens: Token[];
  enabled?: boolean;
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
  enabled = true,
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
  const supportedLendingTokensRef = useRef<Set<string>>(new Set());
  const lastFailedSweepRef = useRef<
    Map<string, { amountRaw: string; failedAt: number; message: string }>
  >(new Map());

  useEffect(() => {
    if (!enabled || !wallet || supportedTokens.length === 0) {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
      isPollingRef.current = false;
      setIsDepositing(false);
      return;
    }

    const resolveSupportedLendingTokens = async () => {
      try {
        const markets = await wallet.lending().getMarkets();
        supportedLendingTokensRef.current = new Set(
          markets.map((market) => market.asset.address.toLowerCase())
        );
      } catch (err) {
        console.warn('[AutoYield] Failed to resolve lending markets. Falling back to the configured token list.', err);
        supportedLendingTokensRef.current = new Set(
          supportedTokens.map((token) => token.address.toLowerCase())
        );
      }
    };

    const sweepIdleBalances = async (reason: 'startup' | 'incoming_transfer' | 'scheduled') => {
      let depositedAny = false;

      if (supportedLendingTokensRef.current.size === 0) {
        await resolveSupportedLendingTokens();
      }

      for (const token of supportedTokens) {
        if (!supportedLendingTokensRef.current.has(token.address.toLowerCase())) {
          continue;
        }

        let walletBalance: Amount;
        try {
          walletBalance = await wallet.balanceOf(token);
        } catch (err) {
          // Contract not deployed on current network — skip silently
          console.warn(`[AutoYield] Skipping ${token.symbol}: contract unreachable on current network.`);
          continue;
        }
        const reserve = getGasReserve(token);
        const minDeposit = getMinimumDeposit(token);

        const depositAmount = walletBalance.gt(reserve)
          ? walletBalance.subtract(reserve)
          : Amount.fromRaw(0n, token);

        if (depositAmount.isZero() || depositAmount.lt(minDeposit)) {
          continue;
        }

        const failedSweep = lastFailedSweepRef.current.get(token.address.toLowerCase());
        const depositAmountRaw = depositAmount.toBase().toString();
        if (
          failedSweep &&
          BigInt(depositAmountRaw) <= BigInt(failedSweep.amountRaw) &&
          Date.now() - failedSweep.failedAt < FAILED_SWEEP_RETRY_COOLDOWN_MS
        ) {
          console.log(
            `[AutoYield] Skipping ${token.symbol} retry for ${
              Math.ceil((FAILED_SWEEP_RETRY_COOLDOWN_MS - (Date.now() - failedSweep.failedAt)) / 60000)
            } more minute(s): ${failedSweep.message}`
          );
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
          const receipt = await waitForAutoYieldReceipt(tx);
          setLastConfirmedDeposit(update);
          lastFailedSweepRef.current.delete(token.address.toLowerCase());
          depositedAny = true;

          if (receipt?.finality_status) {
            console.log(
              `[AutoYield] Confirmed ${token.symbol} auto-deposit at ${receipt.finality_status}: ${tx.hash}`
            );
          }

          if (onDepositSuccess) {
            onDepositSuccess(token, depositAmount, tx.hash);
          }
        } catch (depositErr: unknown) {
          const error = depositErr instanceof Error ? depositErr : new Error('Auto-deposit failed');
          lastFailedSweepRef.current.set(token.address.toLowerCase(), {
            amountRaw: depositAmountRaw,
            failedAt: Date.now(),
            message: error.message,
          });
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
          keys?: string[];
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
            events: Array<{ from_address: string; keys?: string[]; data: string[] }>;
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
          
          // Starknet Transfer events keep indexed addresses in `keys`; `data` is the uint256 amount.
          const amountRaw = getTransferAmount(event.data);
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
  }, [enabled, wallet, supportedTokens, autoSweepIdleBalances, pollIntervalMs, onDepositSuccess, onDepositError]);

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

function getTransferAmount(data: string[]): bigint {
  if (data.length < 2) return 0n;

  if (data.length >= 4) {
    return uint256ToBigInt(data[data.length - 2], data[data.length - 1]);
  }

  return uint256ToBigInt(data[0], data[1]);
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

async function waitForAutoYieldReceipt(tx: AutoYieldTx): Promise<AutoYieldReceipt | null> {
  try {
    await tx.wait();
  } catch (error) {
    const receipt = await readAutoYieldReceipt(tx);
    if (isSuccessfulReceipt(receipt)) {
      return receipt;
    }

    throw buildAutoYieldReceiptError(error, receipt);
  }

  return await readAutoYieldReceipt(tx);
}

async function readAutoYieldReceipt(tx: AutoYieldTx): Promise<AutoYieldReceipt | null> {
  try {
    return await tx.receipt();
  } catch {
    return null;
  }
}

function isSuccessfulReceipt(receipt: AutoYieldReceipt | null): boolean {
  if (!receipt) return false;
  if (typeof receipt.isSuccess === 'function') {
    return receipt.isSuccess();
  }

  return receipt.execution_status === TransactionExecutionStatus.SUCCEEDED;
}

function isRevertedReceipt(receipt: AutoYieldReceipt | null): boolean {
  if (!receipt) return false;
  if (typeof receipt.isReverted === 'function') {
    return receipt.isReverted();
  }

  return receipt.execution_status === TransactionExecutionStatus.REVERTED;
}

function buildAutoYieldReceiptError(
  error: unknown,
  receipt: AutoYieldReceipt | null
): Error {
  if (isRevertedReceipt(receipt)) {
    const finality = receipt?.finality_status ?? 'UNKNOWN_FINALITY';
    const reason = extractAutoYieldRevertReason(receipt);
    const message = reason
      ? `Auto-deposit reverted on-chain (${finality}): ${reason}`
      : `Auto-deposit reverted on-chain (${finality}).`;

    return new Error(message);
  }

  if (error instanceof Error) {
    return error;
  }

  return new Error('Auto-deposit failed');
}

function extractAutoYieldRevertReason(receipt: AutoYieldReceipt | null): string | null {
  if (!receipt) return null;

  const directReason = getStringField(receipt, 'revert_reason') ?? getStringField(receipt, 'reason');
  if (directReason) {
    return directReason;
  }

  const nestedValue = receipt.value;
  return (
    getStringField(nestedValue, 'revert_reason') ??
    getStringField(nestedValue, 'reason')
  );
}

function getStringField(value: unknown, field: string): string | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const fieldValue = (value as Record<string, unknown>)[field];
  if (typeof fieldValue !== 'string') {
    return null;
  }

  const trimmedValue = fieldValue.trim();
  return trimmedValue.length > 0 ? trimmedValue : null;
}
