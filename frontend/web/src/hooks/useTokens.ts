import { useState, useCallback, useMemo } from 'react';
import { useStarkZap } from '../providers/StarkZapProvider';
import { Amount, Token, Address, getPresets, getTokensFromAddresses, LendingPosition, fromAddress } from 'starkzap';
import { num } from 'starknet';

/**
 * Hook for core Token (ERC20) module operations (Web).
 * Optimized for StarkPay: Automates Vesu withdrawals during transfers.
 */
export const useTokens = () => {
  const { wallet } = useStarkZap();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  /**
   * Available tokens for the current network (e.g., STRK, USDC).
   * Automatically resolves based on the wallet's chainId.
   */
  const presets = useMemo(() => {
    if (!wallet) return null;
    try {
      const chainId = wallet.getChainId();
      const p = getPresets(chainId);
      console.log(`[useTokens] Presets loaded for chain ${chainId}:`, Object.keys(p || {}).length);
      return p;
    } catch (err) {
      console.error('Failed to load token presets:', err);
      return null;
    }
  }, [wallet]);

  /**
   * Resolve a token object from its contract address.
   * Useful for dynamic/custom tokens not in presets.
   */
  const resolveToken = useCallback(async (address: Address) => {
    if (!wallet) throw new Error('Wallet not connected');
    setLoading(true);
    try {
      const tokens = await getTokensFromAddresses([address], wallet.getProvider());
      return tokens[0];
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to resolve token');
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [wallet]);

  /**
   * Get the balance of a specific token.
   */
  const balanceOf = useCallback(async (token: Token) => {
    if (!wallet) throw new Error('Wallet not connected');
    setLoading(true);
    setError(null);
    try {
      return await wallet.balanceOf(token);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch balance');
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [wallet]);

  /**
   * Send tokens to a recipient address.
   * [Production Ready]: Explicit balance checks + Atomic batching with auto-withdrawal.
   */
  const send = useCallback(async (token: Token, to: Address, amount: string) => {
    if (!wallet) throw new Error('Wallet not connected');
    setLoading(true);
    setError(null);
    try {
      const targetAmount = Amount.parse(amount, token);
      
      // Get current wallet balance and lending position to check total liquidity
      const ethAddress = '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7';
      const usdcAddress = '0x053c9125369e0151fbc37828196ed33c094b9d05b7f0300d3914966e53401777';
      const debtToken = token.address === ethAddress
        ? { address: usdcAddress, symbol: 'USDC', decimals: 6 } as Token
        : { address: ethAddress, symbol: 'ETH', decimals: 18 } as Token;

      const walletBalance = await wallet.balanceOf(token);
      let position: Partial<LendingPosition> = { collateralAmount: 0n };
      
      try {
        position = await wallet.lending().getPosition({ 
          collateralToken: token, 
          debtToken: debtToken
        });
      } catch (e: unknown) {
        // Suppress expected "asset-config-nonexistent" errors for non-Vesu pairs
        if (!(e instanceof Error) || !e.message.includes('asset-config-nonexistent')) {
          console.warn(`[useTokens] Lending position query failed for ${token.symbol}. Proceeding with wallet balance only.`, e);
        }
      }
      
      const totalLiquidityRaw = walletBalance.toBase() + (position.collateralAmount ?? 0n);
      const totalLiquidity = Amount.fromRaw(totalLiquidityRaw, token);

      if (totalLiquidity.lt(targetAmount)) {
        throw new Error(`Insufficient total balance (Wallet + Vesu). Needed: ${targetAmount.toFormatted()}, Found: ${totalLiquidity.toFormatted()}`);
      }

      // Normalize recipient address to ensure correct padding (fixes potential WASM unreachable error)
      const normalizedTo = fromAddress(num.toHex(to));
      console.log(`[useTokens] Building transfer to ${normalizedTo} for ${amount} ${token.symbol}`);

      const builder = wallet.tx();

      // If wallet balance is insufficient, withdraw the difference from Vesu
      if (walletBalance.lt(targetAmount)) {
        const diff = targetAmount.subtract(walletBalance);
        console.log(`[useTokens] Insufficient wallet balance. Withdrawing ${diff.toFormatted()} from Vesu.`);
        
        builder.lendWithdraw({
          token,
          amount: diff,
        });
      }

      // Chain the transfer and send
      const tx = await builder
        .transfer(token, [{ to: normalizedTo, amount: targetAmount }])
        .send();

      return tx;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Transfer failed');
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [wallet]);

  /**
   * Returns the wallet address for receiving funds.
   */
  const receive = useCallback(() => {
    return wallet?.address;
  }, [wallet]);

  return {
    presets,
    resolveToken,
    balanceOf,
    send,
    receive,
    loading,
    error,
  };
};
