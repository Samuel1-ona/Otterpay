import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { StarkZap } from 'starkzap-native';
import { WalletInterface } from 'starkzap';

interface StarkZapContextType {
  sdk: StarkZap | null;
  wallet: WalletInterface | null;
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

  useEffect(() => {
    const AVNU_PAYMASTER_URLS = {
      mainnet: 'https://starknet.api.avnu.fi/paymaster/v1',
      sepolia: 'https://sepolia.api.avnu.fi/paymaster/v1',
    };

    const instance = new StarkZap({
      network,
      paymaster: avnuApiKey ? {
        nodeUrl: AVNU_PAYMASTER_URLS[network],
        headers: { 'x-api-key': avnuApiKey }
      } : undefined,
    });
    setSdk(instance);
  }, [network, avnuApiKey]);

  const connect = async (accessToken: string) => {
    if (!sdk) return;
    try {
      const onboard = await sdk.onboard({
        strategy: 'privy',
        privy: {
          resolve: async () => {
            // Placeholder for mobile-specific backend call
            const response = await fetch('YOUR_BACKEND_URL/api/wallet/starknet', {
              method: 'POST',
              headers: { Authorization: `Bearer ${accessToken}` },
            });
            const { wallet: privyWallet } = await response.json();
            return {
              walletId: privyWallet.id,
              publicKey: privyWallet.publicKey,
              serverUrl: 'YOUR_BACKEND_URL/api/wallet/sign',
            };
          },
        },
        accountPreset: 'argentXV050',
        deploy: 'if_needed',
      });
      setWallet(onboard.wallet);
    } catch (err) {
      console.error('Mobile connect error:', err);
    }
  };

  return (
    <StarkZapContext.Provider value={{ sdk, wallet, connect }}>
      {children}
    </StarkZapContext.Provider>
  );
};
