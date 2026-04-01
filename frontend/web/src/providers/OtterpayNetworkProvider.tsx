'use client';

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  getOtterpayNetworkConfig,
  OtterpayNetwork,
} from '@/lib/otterpayNetworks';

const NETWORK_STORAGE_KEY = 'otterpay:selected-network';

interface OtterpayNetworkContextValue {
  network: OtterpayNetwork;
  setNetwork: (network: OtterpayNetwork) => void;
  networkConfig: ReturnType<typeof getOtterpayNetworkConfig>;
}

const OtterpayNetworkContext =
  createContext<OtterpayNetworkContextValue | undefined>(undefined);

function readStoredNetwork(): OtterpayNetwork {
  if (typeof window === 'undefined') return 'mainnet';

  const stored = window.localStorage.getItem(NETWORK_STORAGE_KEY);
  return stored === 'sepolia' ? 'sepolia' : 'mainnet';
}

export function OtterpayNetworkProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [network, setNetwork] = useState<OtterpayNetwork>('mainnet');
  const [hasLoadedStoredNetwork, setHasLoadedStoredNetwork] = useState(false);

  useEffect(() => {
    setNetwork(readStoredNetwork());
    setHasLoadedStoredNetwork(true);
  }, []);

  useEffect(() => {
    if (!hasLoadedStoredNetwork) return;
    window.localStorage.setItem(NETWORK_STORAGE_KEY, network);
  }, [hasLoadedStoredNetwork, network]);

  const value = useMemo(
    () => ({
      network,
      setNetwork,
      networkConfig: getOtterpayNetworkConfig(network),
    }),
    [network],
  );

  return (
    <OtterpayNetworkContext.Provider value={value}>
      {children}
    </OtterpayNetworkContext.Provider>
  );
}

export function useOtterpayNetwork() {
  const context = useContext(OtterpayNetworkContext);

  if (!context) {
    throw new Error(
      'useOtterpayNetwork must be used within an OtterpayNetworkProvider',
    );
  }

  return context;
}
