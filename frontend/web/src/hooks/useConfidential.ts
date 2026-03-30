import { useState, useCallback, useMemo } from 'react';
import { useStarkZap } from '../providers/StarkZapProvider';
import {
  TongoConfidential,
  Amount,
  Token,
  Address,
  ConfidentialRecipient,
  ConfidentialState,
  fromAddress,
} from 'starkzap';
import { AccountEvents, pubKeyBase58ToAffine } from '@fatsolutions/tongo-sdk';
import { ec, num } from 'starknet';

const STRK_SEPOLIA_ADDRESS = '0x4718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d';
const TONGO_STRK_CONTRACT_ADDRESS =
  '0x408163bfcfc2d76f34b444cb55e09dace5905cf84c0884e4637c2c0f06ab6ed';
const CONFIDENTIAL_HISTORY_LOOKBACK_BLOCKS = 150_000;

export interface ConfidentialNetworkTokenConfig {
  tokenAddress: Address;
  contractAddress: Address;
  symbol: string;
  label: string;
}

export interface ConfidentialActivityItem {
  id: string;
  type: AccountEvents['type'];
  txHash: string;
  blockNumber: number;
  amountRaw: bigint;
  amount: Amount;
  counterparty?: string;
}

export const CONFIDENTIAL_TOKEN_CONFIG: Record<
  'SN_SEPOLIA',
  ConfidentialNetworkTokenConfig[]
> = {
  SN_SEPOLIA: [
    {
      tokenAddress: fromAddress(STRK_SEPOLIA_ADDRESS),
      contractAddress: fromAddress(TONGO_STRK_CONTRACT_ADDRESS),
      symbol: 'STRK',
      label: 'Sepolia Private STRK',
    },
  ],
};

export function getConfidentialTokenConfig(
  chainLiteral: 'SN_MAIN' | 'SN_SEPOLIA' | string,
  token: Token | null | undefined
): ConfidentialNetworkTokenConfig | null {
  if (!token || chainLiteral !== 'SN_SEPOLIA') return null;

  const config = CONFIDENTIAL_TOKEN_CONFIG.SN_SEPOLIA.find(
    (entry) => normalizeHex(entry.tokenAddress) === normalizeHex(token.address)
  );

  return config ?? null;
}

export function generateConfidentialPrivateKey(): string {
  const key = ec.starkCurve.utils.randomPrivateKey();
  return `0x${Array.from(key, (byte) => byte.toString(16).padStart(2, '0')).join('')}`;
}

export function isValidConfidentialPrivateKey(value: string): boolean {
  try {
    const privateKey = num.toBigInt(value.trim());
    return ec.starkCurve.utils.isValidPrivateKey(privateKey);
  } catch {
    return false;
  }
}

export function parseConfidentialRecipientInput(input: string): ConfidentialRecipient {
  const trimmed = input.trim();
  if (!trimmed) {
    throw new Error('Recipient is required');
  }

  try {
    const parsed = JSON.parse(trimmed) as { x?: string; y?: string };
    if (parsed.x != null && parsed.y != null) {
      return {
        x: num.toHex(parsed.x),
        y: num.toHex(parsed.y),
      };
    }
  } catch {
    // Fall through to other recipient formats.
  }

  if (trimmed.includes(',')) {
    const [x, y] = trimmed.split(',').map((part) => part.trim());
    if (x && y) {
      return {
        x: num.toHex(x),
        y: num.toHex(y),
      };
    }
  }

  try {
    const point = pubKeyBase58ToAffine(trimmed);
    return {
      x: num.toHex(point.x),
      y: num.toHex(point.y),
    };
  } catch {
    throw new Error(
      'Recipient must be a Tongo address or a JSON/comma-separated { x, y } public key.'
    );
  }
}

/**
 * Hook for Tongo Confidential Payments (Web).
 * Provides vault state, history, and helpers for a Sepolia Tongo integration.
 */
export const useConfidential = () => {
  const { wallet } = useStarkZap();
  const [instance, setInstance] = useState<TongoConfidential | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [state, setState] = useState<ConfidentialState | null>(null);
  const [activity, setActivity] = useState<ConfidentialActivityItem[]>([]);
  const [activeBalance, setActiveBalance] = useState<Amount | null>(null);
  const [pendingBalance, setPendingBalance] = useState<Amount | null>(null);

  const resetVaultState = useCallback(() => {
    setState(null);
    setActivity([]);
    setActiveBalance(null);
    setPendingBalance(null);
  }, []);

  /**
   * Initialize the confidential account with a private key and contract address.
   */
  const init = useCallback(
    (privateKey: string | Uint8Array, contractAddress: Address) => {
      if (!wallet) throw new Error('Wallet not connected');
      try {
        const confidential = new TongoConfidential({
          privateKey,
          contractAddress,
          provider: wallet.getProvider(),
        });
        setInstance(confidential);
        setError(null);
        return confidential;
      } catch (err) {
        console.error('Failed to init Tongo:', err);
        throw err;
      }
    },
    [wallet]
  );

  /**
   * Reset the confidential session in memory.
   */
  const clear = useCallback(() => {
    setInstance(null);
    setError(null);
    resetVaultState();
  }, [resetVaultState]);

  /**
   * Fetch decrypted state (balance, pending, nonce).
   */
  const getState = useCallback(async (): Promise<ConfidentialState | null> => {
    if (!instance) return null;
    setLoading(true);
    try {
      const nextState = await instance.getState();
      setState(nextState);
      return nextState;
    } catch (err) {
      const nextError =
        err instanceof Error ? err : new Error('Failed to get confidential state');
      console.error('Failed to get confidential state:', nextError);
      setError(nextError);
      return null;
    } finally {
      setLoading(false);
    }
  }, [instance]);

  /**
   * Refresh decrypted state and recent history for a token.
   */
  const refresh = useCallback(
    async (token: Token) => {
      if (!wallet || !instance) throw new Error('Not initialized');

      setLoading(true);
      setError(null);
      try {
        const nextState = await instance.getState();
        const activePublicRaw = await instance.toPublicUnits(nextState.balance);
        const pendingPublicRaw = await instance.toPublicUnits(nextState.pending);

        setState(nextState);
        setActiveBalance(Amount.fromRaw(activePublicRaw, token));
        setPendingBalance(Amount.fromRaw(pendingPublicRaw, token));

        const latestBlock = await wallet.getProvider().getBlock('latest');
        const initialBlock = Math.max(
          0,
          latestBlock.block_number - CONFIDENTIAL_HISTORY_LOOKBACK_BLOCKS
        );

        const history = await instance.getTongoAccount().getTxHistory(initialBlock);
        const normalized = await Promise.all(
          history.map(async (event) => {
            const publicAmountRaw = await instance.toPublicUnits(event.amount);
            return mapConfidentialEventToActivity(event, token, publicAmountRaw);
          })
        );

        setActivity(normalized);
        return {
          state: nextState,
          activeBalance: Amount.fromRaw(activePublicRaw, token),
          pendingBalance: Amount.fromRaw(pendingPublicRaw, token),
          activity: normalized,
        };
      } catch (err) {
        const nextError =
          err instanceof Error ? err : new Error('Failed to refresh confidential vault');
        console.error('Failed to refresh confidential vault:', nextError);
        setError(nextError);
        throw nextError;
      } finally {
        setLoading(false);
      }
    },
    [wallet, instance]
  );

  /**
   * Public -> Confidential
   * Move funds from Starknet wallet to Tongo shielded account.
   */
  const fund = useCallback(
    async (token: Token, amount: string) => {
      if (!wallet || !instance) throw new Error('Not initialized');
      setLoading(true);
      setError(null);
      try {
        const targetAmount = Amount.parse(amount, token);
        const confidentialUnits = await toValidatedConfidentialUnits(instance, targetAmount, token);
        const operation = await instance.getTongoAccount().fund({
          amount: confidentialUnits,
          sender: wallet.address,
        });

        await operation.populateApprove();
        const calls = operation.approve
          ? [operation.approve, operation.toCalldata()]
          : [operation.toCalldata()];

        return await wallet.tx().add(...calls).send();
      } catch (err) {
        const nextError =
          err instanceof Error ? err : new Error('Confidential fund failed');
        setError(nextError);
        throw nextError;
      } finally {
        setLoading(false);
      }
    },
    [wallet, instance]
  );

  /**
   * Confidential -> Confidential
   * Private transfer using recipient public key ({ x, y }).
   */
  const transfer = useCallback(
    async (token: Token, amount: string, to: ConfidentialRecipient) => {
      if (!wallet || !instance) throw new Error('Not initialized');
      setLoading(true);
      setError(null);
      try {
        const targetAmount = Amount.parse(amount, token);

        const nextState = await instance.getState();
        const confidentialUnits = await toValidatedConfidentialUnits(instance, targetAmount, token);

        if (nextState.balance < confidentialUnits) {
          throw new Error(
            `Insufficient active confidential balance. Have: ${nextState.balance}, Need: ${confidentialUnits}`
          );
        }

        const operation = await instance.getTongoAccount().transfer({
          amount: confidentialUnits,
          to,
          sender: wallet.address,
        });

        return await wallet.tx().add(operation.toCalldata()).send();
      } catch (err) {
        const nextError =
          err instanceof Error ? err : new Error('Confidential transfer failed');
        setError(nextError);
        throw nextError;
      } finally {
        setLoading(false);
      }
    },
    [wallet, instance]
  );

  /**
   * Confidential -> Public
   * Withdraw funds back to a Starknet public address.
   */
  const withdraw = useCallback(
    async (token: Token, amount: string, to?: Address) => {
      if (!wallet || !instance) throw new Error('Not initialized');
      setLoading(true);
      setError(null);
      try {
        const targetAmount = Amount.parse(amount, token);
        const nextState = await instance.getState();
        const confidentialUnits = await toValidatedConfidentialUnits(instance, targetAmount, token);

        if (nextState.balance < confidentialUnits) {
          throw new Error(
            `Insufficient active confidential balance for withdrawal. Have: ${nextState.balance}, Need: ${confidentialUnits}`
          );
        }

        const operation = await instance.getTongoAccount().withdraw({
          amount: confidentialUnits,
          to: to || wallet.address,
          sender: wallet.address,
        });

        return await wallet.tx().add(operation.toCalldata()).send();
      } catch (err) {
        const nextError =
          err instanceof Error ? err : new Error('Confidential withdraw failed');
        setError(nextError);
        throw nextError;
      } finally {
        setLoading(false);
      }
    },
    [wallet, instance]
  );

  /**
   * Activate pending balance (from received transfers).
   */
  const rollover = useCallback(async () => {
    if (!wallet || !instance) throw new Error('Not initialized');
    setLoading(true);
    setError(null);
    try {
      const calls = await instance.rollover({ sender: wallet.address });
      return await wallet.tx().add(...calls).send();
    } catch (err) {
      const nextError =
        err instanceof Error ? err : new Error('Confidential rollover failed');
      setError(nextError);
      throw nextError;
    } finally {
      setLoading(false);
    }
  }, [wallet, instance]);

  /**
   * Full exit: withdraw all active balance and clear pending state.
   */
  const exit = useCallback(
    async (to?: Address) => {
      if (!wallet || !instance) throw new Error('Not initialized');
      setLoading(true);
      setError(null);
      try {
        const calls = await instance.ragequit({
          to: to || wallet.address,
          sender: wallet.address,
        });
        return await wallet.tx().add(...calls).send();
      } catch (err) {
        const nextError =
          err instanceof Error ? err : new Error('Confidential exit failed');
        setError(nextError);
        throw nextError;
      } finally {
        setLoading(false);
      }
    },
    [wallet, instance]
  );

  const recipientJson = useMemo(() => {
    if (!instance) return null;

    return JSON.stringify(
      {
        x: num.toHex(instance.recipientId.x),
        y: num.toHex(instance.recipientId.y),
      },
      null,
      2
    );
  }, [instance]);

  return {
    instance,
    init,
    clear,
    getState,
    refresh,
    fund,
    transfer,
    withdraw,
    rollover,
    exit,
    address: instance?.address,
    recipientId: instance?.recipientId,
    recipientJson,
    activity,
    state,
    activeBalance,
    pendingBalance,
    isInitialized: !!instance,
    loading,
    error,
  };
};

function normalizeHex(value: string): string {
  return fromAddress(value).toLowerCase();
}

function mapConfidentialEventToActivity(
  event: AccountEvents,
  token: Token,
  publicAmountRaw: bigint
): ConfidentialActivityItem {
  const counterparty =
    event.type === 'transferIn'
      ? event.from
      : event.type === 'transferOut'
        ? event.to
        : event.type === 'withdraw' || event.type === 'ragequit'
          ? event.to
          : undefined;

  return {
    id: `${event.tx_hash}_${event.block_number}_${event.type}`,
    type: event.type,
    txHash: event.tx_hash,
    blockNumber: event.block_number,
    amountRaw: event.amount,
    amount: Amount.fromRaw(publicAmountRaw, token),
    counterparty,
  };
}

async function toValidatedConfidentialUnits(
  instance: TongoConfidential,
  amount: Amount,
  token: Token
): Promise<bigint> {
  const confidentialUnits = await instance.toConfidentialUnits(amount);
  const bitSize = await instance.getTongoAccount().bit_size().catch(() => 32);
  const maxUnits = (1n << BigInt(bitSize)) - 1n;

  if (confidentialUnits > maxUnits) {
    const maxPublicRaw = await instance.toPublicUnits(maxUnits).catch(() => 0n);
    if (maxPublicRaw > 0n) {
      const maxAmount = Amount.fromRaw(maxPublicRaw, token).toFormatted(true);
      throw new Error(
        `This Tongo vault supports up to ${maxAmount} ${token.symbol} per account on this contract.`
      );
    }

    throw new Error(
      `This Tongo vault only supports ${bitSize}-bit confidential balances on this contract.`
    );
  }

  return confidentialUnits;
}
