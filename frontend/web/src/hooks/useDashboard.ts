import { useState, useCallback, useMemo, useEffect } from 'react';
import { useStarkZap } from '../providers/StarkZapProvider';
import { useTokens } from './useTokens';
import { useLending } from './useLending';
import { useHistory } from './useHistory';
import { Amount, Token, LendingUserPosition } from 'starkzap';

export interface DashboardAsset {
  token: Token;
  walletBalance: Amount;
  lendingBalance: Amount;
  totalBalanceUsd: number;
  yieldApy?: string;
}

export const useDashboard = () => {
  const { sdk, wallet } = useStarkZap();
  const { presets, balanceOf, resolveToken } = useTokens();
  const { getPosition, getPositions } = useLending();
  
  const tokenList = useMemo(() => presets ? Object.values(presets) : [], [presets]);
  const coreTokenList = useMemo(() => 
    tokenList.filter(t => ['ETH', 'USDC', 'STRK'].includes(t.symbol || '')),
    [tokenList]
  );
  const { history, refresh: refreshHistory, loading: historyLoading } = useHistory(coreTokenList);

  const [assets, setAssets] = useState<DashboardAsset[]>([]);
  const [totalBalanceUsd, setTotalBalanceUsd] = useState(0);
  const [totalYieldUsd, setTotalYieldUsd] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    if (!wallet || !presets) return;
    console.log('[Dashboard] Fetching for wallet:', wallet.address);

    setLoading(true);
    setError(null);

    try {
      const allPresets = Object.values(presets);
      
      // 1. Fetch ALL positions first to know which tokens the user is interacting with
      const allPositions = await getPositions();
      const positionMap = new Map<string, { amount: bigint, usdValue: number, token: Token }>();
      
      (allPositions || []).forEach((p: LendingUserPosition) => {
        const addr = p.collateral.token.address.toLowerCase();
        const existing = positionMap.get(addr) || { amount: 0n, usdValue: 0, token: p.collateral.token };
        positionMap.set(addr, {
          amount: existing.amount + p.collateral.amount,
          usdValue: existing.usdValue + (Number(p.collateral.usdValue || 0n) / 1e18),
          token: p.collateral.token
        });
      });

      // 2. Identify tokens to fetch (Primary Tokens + Active Positions)
      const coreSymbols = ['ETH', 'STRK', 'USDC'];
      
      const tokensToFetch = allPresets.filter(t => {
        const addr = t.address.toLowerCase();
        const isCore = coreSymbols.includes(t.symbol || '');
        const hasPosition = positionMap.has(addr);
        return isCore || hasPosition;
      });

      const results: DashboardAsset[] = [];
      let totalUsd = 0;
      let yieldUsd = 0;

      // 3. Fetch lending markets for price fallback
      const markets = await (wallet.lending() as any).getMarkets().catch(() => []); 
      const priceMap = new Map<string, number>();
      
      // Prices will be fetched dynamically via SDK or market data

      (markets || []).forEach((m: any) => {
        if (m.stats?.totalSupplied && (m.stats.totalSupplied as any).usdValue) {
           const units = Number(m.stats.totalSupplied.toBase()) / (10 ** (m.asset.decimals || 18));
           const usd = Number(m.stats.totalSupplied.usdValue) / 1e18;
           const price = units > 0 ? usd / units : 0;
           if (price > 0) priceMap.set(m.asset.address.toLowerCase(), price);
        }
      });

      for (const token of tokensToFetch) {
        // Fetch wallet balance
        const wBalance = await balanceOf(token).catch(() => Amount.fromRaw(0n, token));
        
        // Find corresponding lending position
        const pos = positionMap.get(token.address.toLowerCase());
        const lBalance = pos ? Amount.fromRaw(pos.amount, token) : Amount.fromRaw(0n, token);
        const collateralUsdValue = pos ? pos.usdValue : 0;
        
        yieldUsd += collateralUsdValue; 
        
        let price = priceMap.get(token.address.toLowerCase()) || 0;

        if (price === 0 && sdk && token.symbol !== 'USDC') {
          try {
            const quote = await wallet.getQuote({
              tokenIn: token,
              tokenOut: presets.USDC,
              amountIn: Amount.parse("1", token),
            });
            price = Number(quote.amountOutBase) / (10 ** (presets.USDC.decimals || 6));
          } catch {
            console.warn(`[Dashboard] No price for ${token.symbol}`);
          }
        }
        if (token.symbol === 'USDC') price = 1;

        const balanceNumeric = Number(wBalance.toBase()) / (10 ** (token.decimals || 18));
        const tokenUsd = collateralUsdValue + (balanceNumeric * price);

        // Only add to results if balance is non-zero OR it's a core token
        if (tokenUsd > 0 || Number(wBalance.toBase()) > 0 || coreSymbols.includes(token.symbol || '')) {
          results.push({
            token,
            walletBalance: wBalance,
            lendingBalance: lBalance,
            totalBalanceUsd: tokenUsd,
          });
          totalUsd += tokenUsd;
        }
      }

      console.log(`[Dashboard] Fetched ${tokensToFetch.length} tokens. Displaying ${results.length} relevant assets.`);
      setAssets(results.sort((a, b) => b.totalBalanceUsd - a.totalBalanceUsd));
      setTotalBalanceUsd(totalUsd);
      setTotalYieldUsd(yieldUsd);
      await refreshHistory().catch(() => {});
    } catch (err) {
      console.error('Dashboard fetch failed:', err);
      setError(err instanceof Error ? err : new Error('Failed to load dashboard data'));
    } finally {
      setLoading(false);
    }
  }, [wallet, presets, balanceOf, getPositions, refreshHistory, resolveToken, sdk]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    assets,
    totalBalanceUsd,
    totalYieldUsd,
    history,
    loading: loading || historyLoading,
    error,
    refresh: fetchData,
    supportedTokens: tokenList,
  };
};
