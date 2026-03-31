import { useState, useCallback } from 'react';
import { useStarkZap } from '../providers/StarkZapProvider';
import { Amount, Token } from 'starkzap';
import {
  getAlternateLendingToken,
  OtterpayChainLiteral,
} from '../lib/otterpayNetworks';

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
      const chainLiteral = wallet.getChainId().toLiteral() as OtterpayChainLiteral;
      const debtToken = getAlternateLendingToken(chainLiteral, token.address);

      if (!debtToken) {
        throw new Error(`No alternate lending token configured for ${token.symbol}`);
      }

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
      const chainLiteral = wallet.getChainId().toLiteral() as OtterpayChainLiteral;
      const debtToken = getAlternateLendingToken(chainLiteral, token.address);

      if (!debtToken) {
        throw new Error(`No alternate lending token configured for ${token.symbol}`);
      }

      return await wallet.lending().quoteHealth({
        action: {
          action,
          request: { token, amount: parsedAmount }
        },
        health: { collateralToken: token, debtToken }
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
