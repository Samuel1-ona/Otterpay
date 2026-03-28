import { useState, useCallback, useMemo } from 'react';
import { useStarkZap } from '../providers/StarkZapProvider';
import { TongoConfidential, Amount, Token, Address, ConfidentialRecipient, ConfidentialState } from 'starkzap';

/**
 * Hook for Tongo Confidential Payments (Web).
 * 🔐 Enables hidden amounts and privacy-preserving transfers.
 */
export const useConfidential = () => {
  const { wallet } = useStarkZap();
  const [instance, setInstance] = useState<TongoConfidential | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  /**
   * Initialize the confidential account with a private key and contract address.
   * @param privateKey - BigNumberish or Uint8Array sensitive key.
   * @param contractAddress - The Tongo contract on the current network.
   */
  const init = useCallback((privateKey: string | Uint8Array, contractAddress: Address) => {
    if (!wallet) throw new Error('Wallet not connected');
    try {
      const confidential = new TongoConfidential({
        privateKey,
        contractAddress,
        provider: wallet.getProvider(),
      });
      setInstance(confidential);
      return confidential;
    } catch (err) {
      console.error('Failed to init Tongo:', err);
      throw err;
    }
  }, [wallet]);

  /**
   * Fetch decrypted state (balance, pending, nonce).
   */
  const getState = useCallback(async (): Promise<ConfidentialState | null> => {
    if (!instance) return null;
    setLoading(true);
    try {
      return await instance.getState();
    } catch (err) {
      console.error('Failed to get confidential state:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [instance]);

  /**
   * Public -> Confidential
   * Move funds from Starknet wallet to Tongo shielded account.
   */
  const fund = useCallback(async (token: Token, amount: string) => {
    if (!wallet || !instance) throw new Error('Not initialized');
    setLoading(true);
    try {
      const targetAmount = Amount.parse(amount, token);
      const tx = await wallet.tx()
        .confidentialFund(instance, {
          amount: targetAmount,
          sender: wallet.address,
        })
        .send();
      return tx;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Confidential fund failed');
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [wallet, instance]);

  /**
   * Confidential -> Confidential
   * Private transfer using recipient public key ({ x, y }).
   */
  const transfer = useCallback(async (token: Token, amount: string, to: ConfidentialRecipient) => {
    if (!wallet || !instance) throw new Error('Not initialized');
    setLoading(true);
    setError(null);
    try {
      const targetAmount = Amount.parse(amount, token);
      
      // Production Ready: Pre-check balance to avoid ZK-proof generation failures on-chain
      const state = await instance.getState();
      const confidentialUnits = await instance.toConfidentialUnits(targetAmount);
      
      if (state.balance < confidentialUnits) {
        throw new Error(`Insufficient active confidential balance. Have: ${state.balance}, Need: ${confidentialUnits}`);
      }

      const tx = await wallet.tx()
        .confidentialTransfer(instance, {
          amount: targetAmount,
          to,
          sender: wallet.address,
        })
        .send();
      return tx;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Confidential transfer failed');
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [wallet, instance]);

  /**
   * Confidential -> Public
   * Withdraw funds back to a Starknet public address.
   */
  const withdraw = useCallback(async (token: Token, amount: string, to?: Address) => {
    if (!wallet || !instance) throw new Error('Not initialized');
    setLoading(true);
    setError(null);
    try {
      const targetAmount = Amount.parse(amount, token);
      
      // Production Ready: Pre-check balance
      const state = await instance.getState();
      const confidentialUnits = await instance.toConfidentialUnits(targetAmount);

      if (state.balance < confidentialUnits) {
        throw new Error(`Insufficient active confidential balance for withdrawal. Have: ${state.balance}, Need: ${confidentialUnits}`);
      }

      const tx = await wallet.tx()
        .confidentialWithdraw(instance, {
          amount: targetAmount,
          to: to || wallet.address,
          sender: wallet.address,
        })
        .send();
      return tx;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Confidential withdraw failed');
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [wallet, instance]);

  /**
   * Activate pending balance (from received transfers).
   */
  const rollover = useCallback(async () => {
    if (!wallet || !instance) throw new Error('Not initialized');
    setLoading(true);
    try {
      const calls = await instance.rollover({ sender: wallet.address });
      const tx = await wallet.tx().add(...calls).send();
      return tx;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Confidential rollover failed');
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [wallet, instance]);

  /**
   * Full exit: withdraw all active and rollover pending.
   */
  const exit = useCallback(async (to?: Address) => {
    if (!wallet || !instance) throw new Error('Not initialized');
    setLoading(true);
    try {
      const calls = await instance.ragequit({ 
        to: to || wallet.address, 
        sender: wallet.address 
      });
      const tx = await wallet.tx().add(...calls).send();
      return tx;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Confidential exit failed');
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [wallet, instance]);

  return {
    instance,
    init,
    getState,
    fund,
    transfer,
    withdraw,
    rollover,
    exit,
    address: instance?.address,
    recipientId: instance?.recipientId,
    isInitialized: !!instance,
    loading,
    error,
  };
};
