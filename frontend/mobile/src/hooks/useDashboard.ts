import { useState, useCallback, useMemo, useEffect } from 'react';
import { useStarkZap } from '../providers/StarkZapProvider';
import { useTokens } from './useTokens';
import { useLending } from './useLending';
import { useHistory } from './useHistory';
import { Amount, Token, Address } from 'starkzap';

export interface DashboardAsset {
  token: Token;
  walletBalance: Amount;
  lendingBalance: Amount;
  totalBalanceUsd: number;
  yieldApy?: string;
}

export const useDashboard = () => {
  const { wallet, sdk } = useStarkZap();
  const { presets, balanceOf } = useTokens();
  const { getPosition } = useLending();
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
      const tokenList = Object.values(presets);
      const results: DashboardAsset[] = [];
      let totalUsd = 0;
      let yieldUsd = 0;

      for (const token of tokenList) {
        // Fetch wallet balance
        const wBalance = await balanceOf(token);
        
        // Fetch lending position
        // We catch errors for individual tokens to avoid breaking the whole dashboard
        let lBalance = Amount.fromRaw(0n, token);
        let tokenUsd = 0;
        
        try {
          const position = await getPosition(token);
          if (position.collateralAmount) {
            lBalance = Amount.fromRaw(position.collateralAmount, token);
          }
          
          // CollateralValue is on a 1e18 scale
          const collateralUsdValue = Number(position.collateralValue) / 1e18;
          tokenUsd += collateralUsdValue;
          
          // Estimate yield (this is a simplified version as Vesu yields accrue directly into collateralAmount)
          // For now, we count the total supplied as "yield-bearing"
          yieldUsd += collateralUsdValue; 
          
          // Calculate price if we have collateralAmount > 0
          if (position.collateralAmount && position.collateralAmount > 0n) {
             const price = Number(position.collateralValue) / Number(position.collateralAmount);
             // Use this price to estimate wallet balance USD value
             tokenUsd += (Number(wBalance.toBase()) * price) / 1e18;
          }
        } catch (e) {
          console.warn(`Failed to fetch position for ${token.symbol}`, e);
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
  }, [wallet, presets, balanceOf, getPosition, refreshHistory]);

  // Initial load
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
