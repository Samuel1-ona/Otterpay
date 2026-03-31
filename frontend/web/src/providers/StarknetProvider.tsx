'use client';

import React, { useMemo } from 'react';
import { sepolia, mainnet } from "@starknet-react/chains";
import { StarknetConfig, jsonRpcProvider, cartridge } from "@starknet-react/core";
import { ControllerConnector } from "@cartridge/connector";
import {
  buildCartridgePolicies,
  getOtterpayNetworkConfig,
  OtterpayNetwork,
} from "@/lib/otterpayNetworks";

export function StarknetProvider({
  children,
  network,
}: {
  children: React.ReactNode;
  network: OtterpayNetwork;
}) {
  const networkConfig = getOtterpayNetworkConfig(network);
  const selectedChain = network === "mainnet" ? mainnet : sepolia;
  const chains = network === "mainnet" ? [mainnet, sepolia] : [sepolia, mainnet];

  const provider = useMemo(
    () =>
      jsonRpcProvider({
        rpc: () => ({ nodeUrl: networkConfig.rpcUrl }),
      }),
    [networkConfig.rpcUrl],
  );

  const cartridgeConnector = useMemo(
    () => {
      const isBrowser = typeof window !== "undefined";
      if (!isBrowser) return null;

      return new ControllerConnector({
        defaultChainId: networkConfig.defaultChainId,
        lazyload: true,
        policies: buildCartridgePolicies(network),
        chains: [{ rpcUrl: networkConfig.rpcUrl }],
      });
    },
    [network, networkConfig.defaultChainId, networkConfig.rpcUrl],
  );

  return (
    <StarknetConfig
      defaultChainId={selectedChain.id}
      chains={chains}
      provider={provider}
      connectors={cartridgeConnector ? [cartridgeConnector] : []}
      explorer={cartridge}
    >
      {children}
    </StarknetConfig>
  );
}
