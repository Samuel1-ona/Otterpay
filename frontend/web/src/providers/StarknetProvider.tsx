'use client';

import React from 'react';
import { sepolia, mainnet } from "@starknet-react/chains";
import { StarknetConfig, jsonRpcProvider, cartridge } from "@starknet-react/core";
import { ControllerConnector } from "@cartridge/connector";
import { constants } from "starknet";

const ethAddress = '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7';
const usdcAddress = '0x053c9125369e0151fbc37828196ed33c094b9d05b7f0300d3914966e53401777';
const strkAddress = '0x4718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d';
const vesuPool = '0x06227c13372b8c7b7f38ad1cfe05b5cf515b4e5c596dd05fe8437ab9747b2093';
const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || 'https://starknet-sepolia.public.blastapi.io/rpc/v0_7';

export const cartridgeConnector = new ControllerConnector({
  defaultChainId: constants.StarknetChainId.SN_SEPOLIA,
  lazyload: true,
  policies: {
    contracts: {
      [ethAddress]: {
        name: 'ETH',
        methods: [
          { name: 'approve', entrypoint: 'approve' },
          { name: 'transfer', entrypoint: 'transfer' }
        ]
      },
      [usdcAddress]: {
        name: 'USDC',
        methods: [
          { name: 'approve', entrypoint: 'approve' },
          { name: 'transfer', entrypoint: 'transfer' }
        ]
      },
      [strkAddress]: {
        name: 'STRK',
        methods: [
          { name: 'approve', entrypoint: 'approve' },
          { name: 'transfer', entrypoint: 'transfer' }
        ]
      },
      [vesuPool]: {
        name: 'Vesu',
        methods: [
          { name: 'deposit', entrypoint: 'deposit' },
          { name: 'withdraw', entrypoint: 'withdraw' },
          { name: 'withdraw_max', entrypoint: 'withdraw_max' }
        ]
      },
    }
  },
  chains: [{ rpcUrl }]
});

export function StarknetProvider({ children }: { children: React.ReactNode }) {
  const provider = jsonRpcProvider({
    rpc: () => ({ nodeUrl: rpcUrl }),
  });

  return (
    <StarknetConfig
      defaultChainId={sepolia.id}
      chains={[sepolia, mainnet]}
      provider={provider}
      connectors={[cartridgeConnector]}
      explorer={cartridge}
    >
      {children}
    </StarknetConfig>
  );
}
