'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { StarkZap, WalletInterface } from 'starkzap';

interface StarkZapContextType {
  sdk: StarkZap | null;
  wallet: WalletInterface | null;
  isLoading: boolean;
  error: Error | null;
  connect: (accessToken: string) => Promise<void>;
}

const StarkZapContext = createContext<StarkZapContextType | undefined>(undefined);

export const useStarkZap = () => {
  const context = useContext(StarkZapContext);
  if (!context) {
    throw new Error('useStarkZap must be used within a StarkZapProvider');
  }
  return context;
};

interface StarkZapProviderProps {
  children: ReactNode;
  network?: 'mainnet' | 'sepolia';
  avnuApiKey?: string;
}

export const StarkZapProvider: React.FC<StarkZapProviderProps> = ({
  children,
  network = 'sepolia',
  avnuApiKey,
}) => {
  const [sdk, setSdk] = useState<StarkZap | null>(null);
  const [wallet, setWallet] = useState<WalletInterface | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const AVNU_PAYMASTER_URLS = {
      mainnet: 'https://starknet.api.avnu.fi/paymaster/v1',
      sepolia: 'https://sepolia.api.avnu.fi/paymaster/v1',
    };

    const initSdk = async () => {
      try {
        const instance = new StarkZap({
          network,
          paymaster: avnuApiKey ? {
            nodeUrl: AVNU_PAYMASTER_URLS[network],
            headers: { 'x-api-key': avnuApiKey }
          } : undefined,
        });
        setSdk(instance);
      } catch (err) {
        console.error('Failed to initialize StarkZap SDK:', err);
        setError(err instanceof Error ? err : new Error('SDK Init Failed'));
      }
    };

    initSdk();
  }, [network, avnuApiKey]);

  const connect = async (accessToken: string) => {
    if (!sdk) return;
    setIsLoading(true);
    setError(null);
    try {
      const onboard = await sdk.onboard({
        strategy: 'privy',
        privy: {
          resolve: async () => {
            const response = await fetch('/api/privy/wallet', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${accessToken}`,
              },
              body: JSON.stringify({ userId: 'social-user' }) // we'll use a fixed ID or get from privy token later
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to get Privy wallet');
            const { wallet: privyWallet } = data;
            return {
              walletId: privyWallet.id,
              publicKey: privyWallet.publicKey,
              serverUrl: '/api/privy/sign',
            };
          },
        },
        accountPreset: 'argentXV050',
        deploy: 'if_needed',
      });
      setWallet(onboard.wallet);
    } catch (err) {
      console.error('Failed to connect wallet:', err);
      setError(err instanceof Error ? err : new Error('Wallet Connection Failed'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <StarkZapContext.Provider value={{ sdk, wallet, isLoading, error, connect }}>
      {children}
    </StarkZapContext.Provider>
  );
};
