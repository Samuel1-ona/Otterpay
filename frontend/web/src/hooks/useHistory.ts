import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useStarkZap } from '../providers/StarkZapProvider';
import { Amount, Token, Address, fromAddress } from 'starkzap';
import { hash, num } from 'starknet';

// ERC20 Transfer event selector
const TRANSFER_EVENT_SELECTOR = hash.getSelectorFromName('Transfer');
const HISTORY_BLOCK_WINDOW = 20_000;
const MAX_WINDOWS_PER_FETCH = 8;
const EVENTS_CHUNK_SIZE = 100;

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
  const { wallet } = useStarkZap();
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const tokenCount = tokens.length;
  const tokenAddressesKey = useMemo(
    () => tokens.map((token) => token.address.toLowerCase()).sort().join(','),
    [tokens]
  );
  const tokenMap = useMemo(() => {
    const map = new Map<string, Token>();
    tokens.forEach((token) => {
      map.set(num.toBigInt(token.address).toString(), token);
    });
    return map;
  }, [tokens]);
  
  // Pagination and State Tracking
  const oldestFetchedBlockRef = useRef<number | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const vTokenMapRef = useRef<Record<string, Address>>({});

  /**
   * Resolve Lending Pool addresses for categorization
   */
  const resolveLendingMarkets = useCallback(async () => {
    if (!wallet || tokenCount === 0) {
      vTokenMapRef.current = {};
      return;
    }
    try {
      const markets = await wallet.lending().getMarkets();
      const map: Record<string, Address> = {};
      markets.forEach(m => {
        map[m.vTokenAddress.toLowerCase()] = m.asset.address.toLowerCase() as Address;
        map[m.poolAddress.toLowerCase()] = m.asset.address.toLowerCase() as Address;
      });
      vTokenMapRef.current = map;
    } catch (err) {
      console.warn('[useHistory] Failed to resolve lending markets for categorization:', err);
    }
  }, [wallet, tokenCount]);

  /**
   * Fetch a chunk of events
   */
  const fetchChunk = useCallback(async (isNextPage: boolean = false) => {
    if (!wallet || tokenCount === 0) return;

    if (isNextPage) setLoading(true);
    else setRefreshing(true);
    
    setError(null);

    try {
      const provider = wallet.getProvider();
      const currentAddress = normalizeAddress(wallet.address);
      const currentAddressKey = num.toHex(wallet.address);
      const latestBlock = await provider.getBlock('latest');
      let scanToBlock = isNextPage && oldestFetchedBlockRef.current != null
        ? oldestFetchedBlockRef.current
        : latestBlock.block_number;
      const newItems: HistoryItem[] = [];
      const seenEvents = new Set<string>();
      const queryPlans: Array<{ keys: string[][] }> = [
        {
          keys: [[TRANSFER_EVENT_SELECTOR], [], [currentAddressKey]],
        },
        {
          keys: [[TRANSFER_EVENT_SELECTOR], [currentAddressKey]],
        },
      ];
      let windowsScanned = 0;

      while (scanToBlock >= 0 && windowsScanned < MAX_WINDOWS_PER_FETCH) {
        const scanFromBlock = Math.max(0, scanToBlock - HISTORY_BLOCK_WINDOW + 1);

        for (const plan of queryPlans) {
          let continuationToken: string | undefined;

          do {
            const eventsResponse = await provider.getEvents({
              keys: plan.keys,
              from_block: { block_number: scanFromBlock },
              to_block: { block_number: scanToBlock },
              chunk_size: EVENTS_CHUNK_SIZE,
              continuation_token: continuationToken,
            });

            eventsResponse.events.forEach((event, eventIndex) => {
              const token = tokenMap.get(num.toBigInt(event.from_address).toString());
              if (!token) return;

              const dedupeKey = `${event.transaction_hash}:${event.block_number}:${event.from_address}:${event.keys?.join(',')}:${event.data?.join(',')}`;
              if (seenEvents.has(dedupeKey)) return;
              seenEvents.add(dedupeKey);

              const from = getTransferParticipant(event, 'from');
              const to = getTransferParticipant(event, 'to');
              if (!from || !to) return;

              const amountRaw = getTransferAmount(event);
              if (amountRaw === 0n) return;

              if (from !== currentAddress && to !== currentAddress) return;

              let type: HistoryItem['type'] = from === currentAddress ? 'sent' : 'received';
              const counterparty = from === currentAddress ? to : from;

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

            continuationToken = eventsResponse.continuation_token;
          } while (continuationToken);
        }

        if (newItems.length >= pageSize) {
          oldestFetchedBlockRef.current = scanFromBlock > 0 ? scanFromBlock - 1 : -1;
          break;
        }

        if (scanFromBlock === 0) {
          oldestFetchedBlockRef.current = -1;
          break;
        }

        scanToBlock = scanFromBlock - 1;
        oldestFetchedBlockRef.current = scanToBlock;
        windowsScanned += 1;
      }

      setHistory(prev => {
        const combined = isNextPage ? [...prev, ...newItems] : newItems;
        // Deduplicate and sort
        const unique = Array.from(new Map(combined.map(item => [item.id, item])).values());
        return unique.sort((a, b) => b.blockNumber - a.blockNumber);
      });
      
      setHasMore((oldestFetchedBlockRef.current ?? -1) >= 0);
    } catch (err) {
      console.error('[useHistory] Fetch error:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch history'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [wallet, tokenCount, tokenMap, pageSize]);

  const refresh = useCallback(async () => {
    oldestFetchedBlockRef.current = null;
    await resolveLendingMarkets();
    await fetchChunk(false);
  }, [fetchChunk, resolveLendingMarkets]);

  const loadMore = useCallback(async () => {
    if (!hasMore || loading) return;
    await fetchChunk(true);
  }, [hasMore, loading, fetchChunk]);

  useEffect(() => {
    if (!wallet || tokenCount === 0) {
      setHistory([]);
      setHasMore(false);
      oldestFetchedBlockRef.current = null;
      return;
    }

    refresh();
  }, [wallet, tokenAddressesKey, refresh, tokenCount]);

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
function uint256ToBigInt(
  low: string | bigint | number | null | undefined,
  high: string | bigint | number | null | undefined
): bigint {
  if (low == null || high == null) return 0n;
  return (BigInt(high) << BigInt(128)) + BigInt(low);
}

function normalizeAddress(value: string | bigint | number): string {
  return fromAddress(num.toHex(value)).toLowerCase();
}

function getTransferParticipant(
  event: { keys?: Array<string | bigint | number>; data?: Array<string | bigint | number> },
  kind: 'from' | 'to'
): string | null {
  const keyIndex = kind === 'from' ? 1 : 2;
  const dataIndex = kind === 'from' ? 0 : 1;
  const value = event.keys?.[keyIndex] ?? (event.data && event.data.length >= 4 ? event.data[dataIndex] : undefined);

  if (value == null) return null;

  try {
    return normalizeAddress(value);
  } catch {
    return null;
  }
}

function getTransferAmount(event: { data?: Array<string | bigint | number> }): bigint {
  if (!event.data || event.data.length < 2) return 0n;

  if (event.data.length >= 4) {
    return uint256ToBigInt(event.data[event.data.length - 2], event.data[event.data.length - 1]);
  }

  return uint256ToBigInt(event.data[0], event.data[1]);
}
