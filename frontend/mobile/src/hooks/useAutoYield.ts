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
  pollIntervalMs = 15000, // Poll every 15 seconds by default
  onDepositSuccess,
  onDepositError,
}) => {
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
          const block = await provider.getBlock('pending');
          lastProcessedBlockRef.current = block.block_number - 1;
          return;
        }

        const currentAddress = wallet.address;

        for (const token of supportedTokens) {
          // 2. Fetch events for this token
          const eventsResponse = await provider.getEvents({
            address: token.address,
            from_block: { block_number: lastProcessedBlockRef.current + 1 },
            to_block: 'pending',
            keys: [[TRANSFER_EVENT_SELECTOR], [], [num.toHex(currentAddress)]], // [Transfer, any_from, our_address]
            chunk_size: 10,
          });

          for (const event of eventsResponse.events) {
            // event.data matches [from, to, value_low, value_high] in ERC20 Transfer event
            const amountRaw = uint256ToBigInt(event.data[2], event.data[3]);
            const incomingAmount = Amount.fromRaw(amountRaw, token);

            if (incomingAmount.isZero()) continue;

            console.log(`[AutoYield] Detected incoming ${incomingAmount.toFormatted()}`);

            // 3. Trigger Auto-Deposit to Vesu
            setIsDepositing(true);
            try {
              const tx = await wallet.lending().supply(token, incomingAmount);
              
              console.log(`[AutoYield] Auto-deposit triggered: ${tx.hash}`);
              
              if (onDepositSuccess) {
                onDepositSuccess(token, incomingAmount, tx.hash);
              }
            } catch (depositErr: any) {
              console.error(`[AutoYield] Failed to auto-deposit:`, depositErr);
              if (onDepositError) onDepositError(depositErr);
            } finally {
              setIsDepositing(false);
            }
          }

          // Update last processed block based on the latest event block number
          if (eventsResponse.events.length > 0) {
            const maxBlock = Math.max(...eventsResponse.events.map(e => e.block_number));
            lastProcessedBlockRef.current = maxBlock;
          }
        }
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
  }, [wallet, supportedTokens, pollIntervalMs]);

  return { isDepositing };
};

/**
 * Utility to convert Starknet Uint256 (low, high) to BigInt
 */
function uint256ToBigInt(low: string, high: string): bigint {
  return (BigInt(high) << BigInt(128)) + BigInt(low);
}
