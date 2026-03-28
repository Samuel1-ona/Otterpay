import { useState, useEffect, useCallback, useRef } from 'react';
import { useStarkZap } from '../providers/StarkZapProvider';
import { Amount, Token, Address } from 'starkzap';
import { hash, num } from 'starknet';

// ERC20 Transfer event selector
const TRANSFER_EVENT_SELECTOR = hash.getSelectorFromName('Transfer');

export interface HistoryItem {
  id: string;
  type: 'sent' | 'received' | 'yield' | 'withdrawal' | 'deposit';
  token: Token;
  amount: Amount;
  blockNumber: number;
  txHash: string;
  counterparty?: string;
  timestamp?: number;
}

export interface UseHistoryResult {
  history: HistoryItem[];
  loading: boolean;
  refreshing: boolean;
  error: Error | null;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
}

/**
 * useHistory Hook (Production Ready)
 * 
 * Fetches cross-token transaction history with pagination and Vesu categorization.
 */
export const useHistory = (tokens: Token[], pageSize: number = 20): UseHistoryResult => {
  const { wallet, sdk } = useStarkZap();
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  // Pagination and State Tracking
  const continuationTokensRef = useRef<Record<string, string | undefined>>({});
  const [hasMore, setHasMore] = useState(false);
  const vTokenMapRef = useRef<Record<string, Address>>({}); // Pool addresses for categorization

  /**
   * Resolve Lending Pool addresses for categorization
   */
  const resolveLendingMarkets = useCallback(async () => {
    if (!sdk || !wallet || tokens.length === 0) return;
    try {
      const markets = await wallet.lending().getMarkets();
      const map: Record<string, Address> = {};
      markets.forEach(m => {
        map[m.poolAddress.toLowerCase()] = m.asset.address.toLowerCase() as Address;
      });
      vTokenMapRef.current = map;
    } catch (err) {
      console.warn('[useHistory] Failed to resolve lending markets for categorization:', err);
    }
  }, [sdk, tokens]);

  /**
   * Fetch a chunk of events
   */
  const fetchChunk = useCallback(async (isNextPage: boolean = false) => {
    if (!wallet || tokens.length === 0) return;

    if (isNextPage) setLoading(true);
    else setRefreshing(true);
    
    setError(null);

    try {
      const provider = wallet.getProvider();
      const currentAddress = wallet.address.toLowerCase();
      const newItems: HistoryItem[] = [];
      let anyMore = false;

      // Note: In production, you might want to fetch multiple tokens in parallel
      // but Starknet RPCs can be sensitive to rate limits.
      for (const token of tokens) {
        const tokenAddr = token.address.toLowerCase();
        
        // 1. Fetch Incoming + Outgoing Transfers (filtered by token and keys)
        // keys[0]: Transfer selector
        // keys[1]: From address (optional)
        // keys[2]: To address (optional)
        
        const eventsResponse = await provider.getEvents({
          address: token.address,
          keys: [[TRANSFER_EVENT_SELECTOR]],
          from_block: { block_number: 0 },
          to_block: 'latest',
          chunk_size: pageSize,
          continuation_token: isNextPage ? continuationTokensRef.current[tokenAddr] : undefined,
        });

        if (eventsResponse.continuation_token) {
          continuationTokensRef.current[tokenAddr] = eventsResponse.continuation_token;
          anyMore = true;
        } else {
          continuationTokensRef.current[tokenAddr] = undefined;
        }

        eventsResponse.events.forEach((event, eventIndex) => {
          const from = num.toHex(event.data[0]).toLowerCase();
          const to = num.toHex(event.data[1]).toLowerCase();
          const amountRaw = uint256ToBigInt(event.data[2], event.data[3]);
          
          // Filter only relevant transfers for this user
          if (from !== currentAddress && to !== currentAddress) return;

          let type: HistoryItem['type'] = from === currentAddress ? 'sent' : 'received';
          let counterparty = from === currentAddress ? to : from;

          // Categorize Lending Actions (Vesu)
          if (vTokenMapRef.current[to]) {
            type = 'deposit';
          } else if (vTokenMapRef.current[from]) {
            type = 'withdrawal';
          }

          newItems.push({
            id: `${event.transaction_hash}_${event.block_number}_${eventIndex}_${type}`,
            type,
            token,
            amount: Amount.fromRaw(amountRaw, token),
            blockNumber: event.block_number || 0,
            txHash: event.transaction_hash,
            counterparty,
          });
        });
      }

      setHistory(prev => {
        const combined = isNextPage ? [...prev, ...newItems] : newItems;
        // Deduplicate and sort
        const unique = Array.from(new Map(combined.map(item => [item.id, item])).values());
        return unique.sort((a, b) => b.blockNumber - a.blockNumber);
      });
      
      setHasMore(anyMore);
    } catch (err) {
      console.error('[useHistory] Fetch error:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch history'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [wallet, tokens, pageSize]);

  const refresh = useCallback(async () => {
    continuationTokensRef.current = {};
    await resolveLendingMarkets();
    await fetchChunk(false);
  }, [fetchChunk, resolveLendingMarkets]);

  const loadMore = useCallback(async () => {
    if (!hasMore || loading) return;
    await fetchChunk(true);
  }, [hasMore, loading, fetchChunk]);

  useEffect(() => {
    refresh();
  }, [wallet]); // Re-fetch only when wallet changes, tokens are usually stable

  return {
    history,
    loading,
    refreshing,
    error,
    hasMore,
    loadMore,
    refresh,
  };
};

/**
 * Utility to convert Starknet Uint256 (low, high) to BigInt
 */
function uint256ToBigInt(low: string, high: string): bigint {
  return (BigInt(high) << BigInt(128)) + BigInt(low);
}
