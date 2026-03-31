'use client';

import React from 'react';
import { StarknetProvider } from '@/providers/StarknetProvider';
import { StarkZapProvider } from '@/providers/StarkZapProvider';
import {
  OtterpayNetworkProvider,
  useOtterpayNetwork,
} from '@/providers/OtterpayNetworkProvider';

function NetworkBoundProviders({ children }: { children: React.ReactNode }) {
  const { network } = useOtterpayNetwork();

  return (
    <StarknetProvider key={network} network={network}>
      <StarkZapProvider
        network={network}
        avnuApiKey={process.env.NEXT_PUBLIC_AVNU_API_KEY}
      >
        {children}
      </StarkZapProvider>
    </StarknetProvider>
  );
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <OtterpayNetworkProvider>
      <NetworkBoundProviders>{children}</NetworkBoundProviders>
    </OtterpayNetworkProvider>
  );
}
