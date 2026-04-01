'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { StarkZap, WalletInterface, PrivySigner, SignerAdapter, ArgentXV050Preset, ChainId, Tx, fromAddress } from 'starkzap';
import { CartridgeWallet } from 'starkzap/cartridge';
import { hash, CallData, type Call } from 'starknet';
import { getRpcUrlForNetwork, OtterpayNetwork } from '@/lib/otterpayNetworks';

/**
 * Universal Provider Patch (UPP)
 * Ensures any object has standard event listener methods expected by legacy dependencies (Ethers v5/Hyperlane).
 */
type EventPatchable = {
  on?: () => unknown;
  once?: () => unknown;
  off?: () => unknown;
  removeListener?: () => unknown;
  removeAllListeners?: () => unknown;
};

type DeployAccountDetails = {
  version: bigint | number | string;
  constructorCalldata: unknown;
  contractAddress: string;
  classHash: string;
  addressSalt: string;
  chainId: string;
  nonce: string;
  maxFee?: string | number | bigint;
};

type RawSignature = string[] | { r: string | bigint; s: string | bigint };

type SignerAdapterWithRawSigner = {
  signer: {
    signRaw: (messageHash: string) => Promise<RawSignature>;
  };
};

type StarkZapInternals = {
  config: {
    staking?: unknown;
    bridging?: unknown;
  };
};

type CartridgeWalletPatch = WalletInterface & {
  explorerConfig?: unknown;
  execute: (calls: Call[]) => Promise<Tx>;
};

function patchProvider<T extends object | null | undefined>(provider: T): T {
  if (!provider) return provider;
  const patchable = provider as T & EventPatchable;
  const dummy = () => provider;
  if (!patchable.on) patchable.on = dummy;
  if (!patchable.once) patchable.once = dummy;
  if (!patchable.off) patchable.off = dummy;
  if (!patchable.removeListener) patchable.removeListener = dummy;
  if (!patchable.removeAllListeners) patchable.removeAllListeners = dummy;
  return provider;
}

// Monkey-patch PrivySigner prototype
if (PrivySigner && PrivySigner.prototype) {
  patchProvider(PrivySigner.prototype);
}

// Monkey-patch SignerAdapter to support V1 DEPLOY_ACCOUNT (required for sponsored deployments in current SDK)
if (SignerAdapter && SignerAdapter.prototype) {
  const signerAdapterPrototype = SignerAdapter.prototype as unknown as {
    signDeployAccountTransaction: (details: DeployAccountDetails) => Promise<string[]>;
  };
  const originalSignDeploy = signerAdapterPrototype.signDeployAccountTransaction;
  signerAdapterPrototype.signDeployAccountTransaction = async function (
    this: SignerAdapterWithRawSigner,
    details: DeployAccountDetails
  ) {
    if (BigInt(details.version) === 1n) {
      const compiledConstructorCalldata = CallData.compile(details.constructorCalldata as never);
      const msgHash = (hash as unknown as {
        calculateDeployAccountTransactionHash: (payload: Record<string, unknown>) => string;
      }).calculateDeployAccountTransactionHash({
        contractAddress: details.contractAddress,
        classHash: details.classHash,
        constructorCalldata: compiledConstructorCalldata,
        salt: details.addressSalt,
        version: details.version,
        chainId: details.chainId,
        nonce: details.nonce,
        maxFee: details.maxFee || 0
      });
      const txSig = await this.signer.signRaw(msgHash);
      return Array.isArray(txSig) ? txSig.map(String) : [String(txSig.r), String(txSig.s)];
    }
    return originalSignDeploy.call(this as never, details);
  };
}

import { useAccount, useConnect } from "@starknet-react/core";
import { ControllerConnector } from "@cartridge/connector";

interface StarkZapContextType {
  sdk: StarkZap | null;
  wallet: WalletInterface | null;
  isLoading: boolean;
  error: Error | null;
  network: OtterpayNetwork;
  connect: (accessToken: string, userId: string) => Promise<void>;
  connectWithCartridge: () => Promise<void>;
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
  network?: OtterpayNetwork;
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

  const { isConnected } = useAccount();
  const { connect: starknetConnect, connectors } = useConnect();

  // Sync Cartridge account with StarkZap SDK
  useEffect(() => {
    const syncCartridge = async () => {
      if (isConnected && !wallet && !isLoading && sdk) {
        console.log('[StarkZapProvider] Syncing Cartridge Account to StarkZap SDK...');
        try {
          const cartConnector =
            connectors.find(
              (connector) =>
                connector.id === 'controller' ||
                connector instanceof ControllerConnector,
            ) as ControllerConnector | undefined;

          if (!cartConnector) {
            console.error('[StarkZapProvider] Could not find Cartridge connector');
            return;
          }

          const controller = cartConnector.controller;
          
          if (!controller) {
            console.error('[StarkZapProvider] Could not find Cartridge Controller in connector');
            return;
          }

          const controllerAccount = controller.account;

          if (!controllerAccount) {
            console.warn('[StarkZapProvider] Controller is connected, but the account is not hydrated yet');
            return;
          }

          const provider = sdk.getProvider();
          const chainId = ChainId.fromFelt252(await controllerAccount.getChainId());
          const sdkInternals = sdk as unknown as StarkZapInternals;

          let classHash = '0x0';
          try {
            classHash = await provider.getClassHashAt(controllerAccount.address);
          } catch (classHashError) {
            console.warn('[StarkZapProvider] Unable to resolve Cartridge account class hash. Continuing with fallback.', classHashError);
          }

          const walletInstance = new (CartridgeWallet as unknown as {
            new (
              controller: unknown,
              controllerAccount: unknown,
              provider: unknown,
              chainId: ChainId,
              classHash: string,
              staking?: unknown,
              bridging?: unknown,
              options?: { feeMode: 'user_pays' | 'sponsored' }
            ): WalletInterface;
          })(
            controller,
            controllerAccount,
            provider,
            chainId,
            classHash,
            sdkInternals.config.staking,
            sdkInternals.config.bridging,
            { feeMode: 'user_pays' }
          );

          const controllerBackedWallet = walletInstance as unknown as CartridgeWalletPatch;

          controllerBackedWallet.execute = async (calls: Call[]) => {
            const txHash = (await controllerAccount.execute(calls)).transaction_hash;
            return new Tx(txHash, provider, chainId, controllerBackedWallet.explorerConfig as never);
          };

          console.log('[StarkZapProvider] Cartridge Synced:', walletInstance.address);
          const patchedWallet = patchProvider(walletInstance) as WalletInterface;
          setWallet(patchedWallet);
        } catch (err) {
          console.error('[StarkZapProvider] Failed to sync Cartridge account:', err);
        }
      }
    };

    syncCartridge();
  }, [isConnected, wallet, isLoading, sdk, connectors]);

  useEffect(() => {
    const AVNU_PAYMASTER_URLS = {
      mainnet: 'https://starknet.paymaster.avnu.fi',
      sepolia: 'https://sepolia.paymaster.avnu.fi',
    };

    const initSdk = async () => {
      try {
        setSdk(null);
        setWallet(null);
        setError(null);

        const instance = new StarkZap({
          network,
          rpcUrl: getRpcUrlForNetwork(network),
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
          ...(accountAddress && { accountAddress: fromAddress(accountAddress) }),
          feeMode: 'sponsored',
      });
      
      const patchedWallet = patchProvider(walletInstance) as WalletInterface;
      
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

  const connectWithCartridge = async () => {
    if (!sdk) return;
    setIsLoading(true);
    setError(null);
    try {
      // Use the starknet-react connect method with the Cartridge connector
      const connector = connectors.find(
        (candidate) =>
          candidate.id === 'controller' || candidate instanceof ControllerConnector,
      );

      if (!connector) throw new Error('Cartridge connector not found');
      
      await starknetConnect({ connector });
      // The useEffect will handle the SDK sync once isConnected becomes true
    } catch (err) {
      console.error('Failed to connect Cartridge wallet:', err);
      setError(err instanceof Error ? err : new Error('Cartridge Connection Failed'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <StarkZapContext.Provider
      value={{ sdk, wallet, isLoading, error, network, connect, connectWithCartridge }}
    >
      {children}
    </StarkZapContext.Provider>
  );
};
