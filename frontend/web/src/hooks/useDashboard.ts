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
  const { wallet } = useStarkZap();
  const { presets, balanceOf } = useTokens();
  const { getPosition, getPositions } = useLending();
  
  const tokenList = useMemo(() => presets ? Object.values(presets) : [], [presets]);
  const { history, refresh: refreshHistory, loading: historyLoading } = useHistory(tokenList);

  const [assets, setAssets] = useState<DashboardAsset[]>([]);
  const [totalBalanceUsd, setTotalBalanceUsd] = useState(0);
  const [totalYieldUsd, setTotalYieldUsd] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    if (!wallet || !presets) return;

    setLoading(true);
    setError(null);

    try {
      const tokens = Object.values(presets);
      
      // Fetch ALL positions once instead of per-token to avoid identical-assets errors
      const allPositions = await getPositions();
      const positionMap = new Map<string, { amount: bigint, usdValue: number }>();
      
      (allPositions || []).forEach((p: LendingUserPosition) => {
        const addr = p.collateral.token.address.toLowerCase();
        const existing = positionMap.get(addr) || { amount: 0n, usdValue: 0 };
        positionMap.set(addr, {
          amount: existing.amount + p.collateral.amount,
          usdValue: existing.usdValue + (Number(p.collateral.usdValue || 0n) / 1e18)
        });
      });

      const results: DashboardAsset[] = [];
      let totalUsd = 0;
      let yieldUsd = 0;

      for (const token of tokens) {
        // Fetch wallet balance
        const wBalance = await balanceOf(token);
        
        // Find corresponding lending position from our map
        const pos = positionMap.get(token.address.toLowerCase());
        const lBalance = pos ? Amount.fromRaw(pos.amount, token) : Amount.fromRaw(0n, token);
        const collateralUsdValue = pos ? pos.usdValue : 0;
        
        let tokenUsd = collateralUsdValue;
        yieldUsd += collateralUsdValue; 
        
        // Use an estimated price from the collateral if available, or fallback to simple USD balance
        if (pos && pos.amount > 0n) {
           const price = pos.usdValue / Number(Amount.fromRaw(pos.amount, token).toBase());
           tokenUsd += Number(wBalance.toBase()) * price;
        } else {
           // Fallback or simple balance logic
        }

        results.push({
          token,
          walletBalance: wBalance,
          lendingBalance: lBalance,
          totalBalanceUsd: tokenUsd,
        });

        totalUsd += tokenUsd;
      }

      setAssets(results);
      setTotalBalanceUsd(totalUsd);
      setTotalYieldUsd(yieldUsd);
      await refreshHistory();
    } catch (err) {
      console.error('Dashboard fetch failed:', err);
      setError(err instanceof Error ? err : new Error('Failed to load dashboard data'));
    } finally {
      setLoading(false);
    }
  }, [wallet, presets, balanceOf, getPositions, refreshHistory]);

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
  };
};
