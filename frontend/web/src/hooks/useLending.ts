import { useState, useCallback } from 'react';
import { useStarkZap } from '../providers/StarkZapProvider';
import { Amount, Token } from 'starkzap';

/**
 * Hook for core Lending (Vesu) module operations (Web).
 */
export const useLending = () => {
  const { wallet } = useStarkZap();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  /**
   * Supply (deposit) tokens into the lending pool.
   */
  const supply = useCallback(async (token: Token, amount: string) => {
    if (!wallet) throw new Error('Wallet not connected');
    setLoading(true);
    setError(null);
    try {
      const parsedAmount = Amount.parse(amount, token);
      const tx = await wallet.lending().deposit({ token, amount: parsedAmount });
      return tx;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Supply failed');
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [wallet]);

  /**
   * Withdraw specific amount of tokens from the lending pool.
   */
  const withdraw = useCallback(async (token: Token, amount: string) => {
    if (!wallet) throw new Error('Wallet not connected');
    setLoading(true);
    setError(null);
    try {
      const parsedAmount = Amount.parse(amount, token);
      const tx = await wallet.lending().withdraw({ token, amount: parsedAmount });
      return tx;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Withdraw failed');
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [wallet]);

  /**
   * Withdraw everything from the lending position.
   */
  const withdrawMax = useCallback(async (token: Token) => {
    if (!wallet) throw new Error('Wallet not connected');
    setLoading(true);
    setError(null);
    try {
      const tx = await wallet.lending().withdrawMax({ token });
      return tx;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('WithdrawMax failed');
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [wallet]);

  /**
   * Get current lending position and accrued yield.
   */
  const getPosition = useCallback(async (token: Token) => {
    if (!wallet) throw new Error('Wallet not connected');
    setLoading(true);
    setError(null);
    try {
      // For Vesu earn positions, we query collateral and debt on the same token asset
      // However, the contract reverts with "identical-assets" if addresses match.
      // We fallback to a different token for the debt query to satisfy the check.
      const ethAddress = '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7';
      const usdcAddress = '0x053c9125369e0151fbc37828196ed33c094b9d05b7f0300d3914966e53401777';
      
      const debtToken = token.address === ethAddress
        ? { address: usdcAddress, symbol: 'USDC', decimals: 6 } as Token
        : { address: ethAddress, symbol: 'ETH', decimals: 18 } as Token;

      const position = await wallet.lending().getPosition({ 
        collateralToken: token, 
        debtToken 
      });
      return position;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch position');
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [wallet]);

  /**
   * Quote projected health after an action.
   * Useful for showing liquidation risk before confirmation.
   */
  const quoteHealth = useCallback(async (token: Token, action: 'deposit' | 'withdraw', amount: string) => {
    if (!wallet) throw new Error('Wallet not connected');
    try {
      const parsedAmount = Amount.parse(amount, token);
      return await wallet.lending().quoteHealth({
        action: {
          action,
          request: { token, amount: parsedAmount }
        },
        health: { collateralToken: token, debtToken: token }
      });
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to quote health');
      setError(error);
      throw error;
    }
  }, [wallet]);

  /**
   * Get all user lending positions across all markets.
   */
  const getPositions = useCallback(async () => {
    if (!wallet) throw new Error('Wallet not connected');
    setLoading(true);
    setError(null);
    try {
      return await wallet.lending().getPositions();
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch positions');
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [wallet]);

  return {
    supply,
    withdraw,
    withdrawMax,
    getPosition,
    getPositions,
    quoteHealth,
    loading,
    error,
  };
};
