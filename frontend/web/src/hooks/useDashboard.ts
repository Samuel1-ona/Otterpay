import { useState, useCallback, useMemo, useEffect } from 'react';
import { useStarkZap } from '../providers/StarkZapProvider';
import { useTokens } from './useTokens';
import { useLending } from './useLending';
import { useHistory } from './useHistory';
import { Amount, Token, LendingUserPosition } from 'starkzap';
import { CallData, num } from 'starknet';

const VESU_POOL_FACTORY = {
  SN_MAIN: '0x3760f903a37948f97302736f89ce30290e45f441559325026842b7a6fb388c0',
  SN_SEPOLIA: '0x03ac869e64b1164aaee7f3fd251f86581eab8bfbbd2abdf1e49c773282d4a092',
} as const;

const VESU_DEFAULT_POOL = {
  SN_MAIN: '0x0451fe483d5921a2919ddd81d0de6696669bccdacd859f72a4fba7656b97c3b5',
  SN_SEPOLIA: '0x06227c13372b8c7b7f38ad1cfe05b5cf515b4e5c596dd05fe8437ab9747b2093',
} as const;

export interface DashboardAsset {
  token: Token;
  walletBalance: Amount;
  lendingBalance: Amount;
  totalBalanceUsd: number;
  yieldApy?: string;
}

export const useDashboard = () => {
  const { sdk, wallet } = useStarkZap();
  const { presets, balanceOf } = useTokens();
  const { getPositions } = useLending();
  
  const tokenList = useMemo(() => presets ? Object.values(presets) : [], [presets]);
  const coreTokenList = useMemo(() => 
    tokenList.filter(t => ['ETH', 'USDC', 'STRK'].includes(t.symbol || '')),
    [tokenList]
  );
  const {
    history,
    refresh: refreshHistory,
    loading: historyLoading,
    error: historyError,
  } = useHistory(coreTokenList);

  const [assets, setAssets] = useState<DashboardAsset[]>([]);
  const [totalBalanceUsd, setTotalBalanceUsd] = useState(0);
  const [totalSuppliedUsd, setTotalSuppliedUsd] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    if (!wallet || !presets) return;
    console.log('[Dashboard] Fetching for wallet:', wallet.address);

    setLoading(true);
    setError(null);

    try {
      const allPresets = Object.values(presets);
      const chainLiteral = wallet.getChainId().toLiteral();
      
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

      if (positionMap.size === 0) {
        for (const token of tokensToFetch) {
          const earnBalance = await readVesuEarnBalance(wallet, token, chainLiteral).catch(() => 0n);
          if (earnBalance > 0n) {
            positionMap.set(token.address.toLowerCase(), {
              amount: earnBalance,
              usdValue: 0,
              token,
            });
          }
        }
      }

      const results: DashboardAsset[] = [];
      let totalUsd = 0;
      let suppliedUsd = 0;

      // 3. Fetch lending markets for price fallback
      const markets = await (wallet.lending() as { getMarkets: () => Promise<unknown[]> }).getMarkets().catch(() => []); 
      const priceMap = new Map<string, number>();
      
      // Prices will be fetched dynamically via SDK or market data

      (markets || []).forEach((market: unknown) => {
        const m = market as {
          asset: { address: string; decimals?: number };
          stats?: { totalSupplied?: Amount & { usdValue?: bigint | number | string } };
        };
        if (m.stats?.totalSupplied && m.stats.totalSupplied.usdValue) {
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

        const collateralUsdValue = pos
          ? pos.usdValue || (Number(lBalance.toBase()) / (10 ** (token.decimals || 18))) * price
          : 0;
        
        suppliedUsd += collateralUsdValue; 

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
      setTotalSuppliedUsd(suppliedUsd);
      await refreshHistory();
    } catch (err) {
      console.error('Dashboard fetch failed:', err);
      setError(err instanceof Error ? err : new Error('Failed to load dashboard data'));
    } finally {
      setLoading(false);
    }
  }, [wallet, presets, balanceOf, getPositions, refreshHistory, sdk]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    assets,
    totalBalanceUsd,
    totalSuppliedUsd,
    history,
    loading: loading || historyLoading,
    error: error ?? historyError,
    refresh: fetchData,
    supportedTokens: tokenList,
  };
};

async function readVesuEarnBalance(
  wallet: NonNullable<ReturnType<typeof useStarkZap>['wallet']>,
  token: Token,
  chainLiteral: 'SN_MAIN' | 'SN_SEPOLIA'
): Promise<bigint> {
  const provider = wallet.getProvider();
  const poolFactory = VESU_POOL_FACTORY[chainLiteral];
  const defaultPool = VESU_DEFAULT_POOL[chainLiteral];

  const vTokenResult = await provider.callContract({
    contractAddress: poolFactory,
    entrypoint: 'v_token_for_asset',
    calldata: CallData.compile([defaultPool, token.address]),
  });

  const vTokenAddress = vTokenResult[0];
  if (vTokenAddress == null || BigInt(String(vTokenAddress)) === 0n) {
    return 0n;
  }

  const shareResult = await provider.callContract({
    contractAddress: num.toHex(vTokenAddress),
    entrypoint: 'balance_of',
    calldata: CallData.compile([wallet.address]),
  });

  const shares = parseUint256Result(shareResult);
  if (shares === 0n) {
    return 0n;
  }

  const assetResult = await provider.callContract({
    contractAddress: num.toHex(vTokenAddress),
    entrypoint: 'convert_to_assets',
    calldata: CallData.compile([{ low: num.toHex(shares & ((1n << 128n) - 1n)), high: num.toHex(shares >> 128n) }]),
  });

  return parseUint256Result(assetResult);
}

function parseUint256Result(result: Array<string | bigint | number>): bigint {
  const low = result[0];
  const high = result[1];
  if (low == null || high == null) return 0n;
  return BigInt(String(low)) + (BigInt(String(high)) << 128n);
}
