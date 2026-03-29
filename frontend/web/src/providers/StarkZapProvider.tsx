'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { StarkZap, WalletInterface, PrivySigner, SignerAdapter, ArgentXV050Preset } from 'starkzap';
import { hash, CallData } from 'starknet';

/**
 * Universal Provider Patch (UPP)
 * Ensures any object has standard event listener methods expected by legacy dependencies (Ethers v5/Hyperlane).
 */
function patchProvider(provider: any) {
  if (!provider) return provider;
  const dummy = () => provider;
  if (!provider.on) provider.on = dummy;
  if (!provider.once) provider.once = dummy;
  if (!provider.off) provider.off = dummy;
  if (!provider.removeListener) provider.removeListener = dummy;
  if (!provider.removeAllListeners) provider.removeAllListeners = dummy;
  return provider;
}

// Monkey-patch PrivySigner prototype
if (PrivySigner && PrivySigner.prototype) {
  patchProvider(PrivySigner.prototype);
}

// Monkey-patch SignerAdapter to support V1 DEPLOY_ACCOUNT (required for sponsored deployments in current SDK)
if (SignerAdapter && SignerAdapter.prototype) {
  const originalSignDeploy = SignerAdapter.prototype.signDeployAccountTransaction;
  SignerAdapter.prototype.signDeployAccountTransaction = async function (details: any) {
    if (BigInt(details.version) === 1n) {
      const compiledConstructorCalldata = CallData.compile(details.constructorCalldata);
      // @ts-ignore
      const msgHash = hash.calculateDeployAccountTransactionHash({
        contractAddress: details.contractAddress,
        classHash: details.classHash,
        constructorCalldata: compiledConstructorCalldata,
        salt: details.addressSalt,
        version: details.version,
        chainId: details.chainId,
        nonce: details.nonce,
        maxFee: details.maxFee || 0
      });
      const txSig = await (this as any).signer.signRaw(msgHash);
      return Array.isArray(txSig) ? txSig.map(String) : [String(txSig.r), String(txSig.s)];
    }
    return originalSignDeploy.call(this, details);
  };
}

interface StarkZapContextType {
  sdk: StarkZap | null;
  wallet: WalletInterface | null;
  isLoading: boolean;
  error: Error | null;
  connect: (accessToken: string, userId: string) => Promise<void>;
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
      mainnet: 'https://starknet.paymaster.avnu.fi',
      sepolia: 'https://sepolia.paymaster.avnu.fi',
    };

    const initSdk = async () => {
      try {
        const instance = new StarkZap({
          network,
          rpcUrl: process.env.NEXT_PUBLIC_RPC_URL || process.env.NEXT_RPC,
          paymaster: avnuApiKey ? {
            nodeUrl: AVNU_PAYMASTER_URLS[network],
            headers: { 
              'x-api-key': avnuApiKey,
              'x-paymaster-api-key': avnuApiKey 
            }
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

  const connect = async (accessToken: string, userId: string, accountAddress?: string) => {
    if (!sdk) return;
    setIsLoading(true);
    setError(null);
    try {
      const privy = await fetch('/api/privy/wallet', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ userId })
      }).then(r => r.json());

      if (!privy.wallet) throw new Error(privy.error || 'Failed to get Privy wallet');
      
      console.log('[StarkZapProvider] Privy Wallet Resolved:', {
        walletId: privy.wallet.id,
        publicKey: privy.wallet.publicKey,
      });

      const signer = new PrivySigner({
          walletId: privy.wallet.id,
          publicKey: privy.wallet.publicKey,
          serverUrl: `${window.location.origin}/api/privy/sign`,
      });

      const walletInstance = await sdk.connectWallet({
          account: {
              signer,
              accountClass: ArgentXV050Preset,
          },
          ...(accountAddress && { accountAddress }),
          feeMode: 'sponsored',
      });
      
      const patchedWallet = patchProvider(walletInstance);
      
      // Auto-deploy if needed (starkzap standard)
      await patchedWallet.ensureReady({ deploy: 'if_needed' });

      console.log('[StarkZapProvider] Connected Address:', patchedWallet.address);
      setWallet(patchedWallet);
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
