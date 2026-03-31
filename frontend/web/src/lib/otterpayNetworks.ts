'use client';

import { constants } from 'starknet';
import { Address, Token, fromAddress } from 'starkzap';

export type OtterpayNetwork = 'mainnet' | 'sepolia';
export type OtterpayChainLiteral = 'SN_MAIN' | 'SN_SEPOLIA';
export type OtterpayTokenKey =
  | 'STRK'
  | 'ETH'
  | 'WBTC'
  | 'USDC_E'
  | 'USDC'
  | 'USDT'
  | 'DAI';

export interface OtterpayTokenDefinition {
  key: OtterpayTokenKey;
  token: Token;
  label: string;
  tongoContractAddress?: Address;
}

export interface OtterpayNetworkConfig {
  label: string;
  shortLabel: string;
  chainId: OtterpayChainLiteral;
  defaultChainId: string;
  rpcUrl: string;
  tagline: string;
  warning?: string;
  deprecated: boolean;
  tokens: OtterpayTokenDefinition[];
  vesuDefaultPool: Address;
  vesuPoolFactory: Address;
}

function makeToken(
  name: string,
  symbol: string,
  address: string,
  decimals: number,
): Token {
  return {
    name,
    symbol,
    address: fromAddress(address),
    decimals,
  } as Token;
}

const DEFAULT_SEPOLIA_RPC_URL =
  process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL ||
  process.env.NEXT_PUBLIC_RPC_URL ||
  'https://starknet-sepolia.public.blastapi.io/rpc/v0_7';

const DEFAULT_MAINNET_RPC_URL =
  process.env.NEXT_PUBLIC_MAINNET_RPC_UR ||
  process.env.NEXT_PUBLIC_MAINNET_RPC_URL ||
  process.env.NEXT_PUBLIC_RPC_URL ||
  'https://starknet-mainnet.public.blastapi.io/rpc/v0_7';

export const OTTERPAY_NETWORKS: Record<OtterpayNetwork, OtterpayNetworkConfig> = {
  mainnet: {
    label: 'Starknet Mainnet',
    shortLabel: 'Mainnet',
    chainId: 'SN_MAIN',
    defaultChainId: constants.StarknetChainId.SN_MAIN,
    rpcUrl: DEFAULT_MAINNET_RPC_URL,
    tagline: 'Live network for real balances and real payments.',
    deprecated: false,
    vesuDefaultPool: fromAddress(
      '0x0451fe483d5921a2919ddd81d0de6696669bccdacd859f72a4fba7656b97c3b5',
    ),
    vesuPoolFactory: fromAddress(
      '0x3760f903a37948f97302736f89ce30290e45f441559325026842b7a6fb388c0',
    ),
    tokens: [
      {
        key: 'STRK',
        label: 'Starknet Token',
        token: makeToken(
          'Starknet Token',
          'STRK',
          '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d',
          18,
        ),
        tongoContractAddress: fromAddress(
          '0x3a542d7eb73b3e33a2c54e9827ec17a6365e289ec35ccc94dde97950d9db498',
        ),
      },
      {
        key: 'ETH',
        label: 'Ether',
        token: makeToken(
          'Ether',
          'ETH',
          '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7',
          18,
        ),
        tongoContractAddress: fromAddress(
          '0x276e11a5428f6de18a38b7abc1d60abc75ce20aa3a925e20a393fcec9104f89',
        ),
      },
      {
        key: 'WBTC',
        label: 'Wrapped Bitcoin',
        token: makeToken(
          'Wrapped Bitcoin',
          'WBTC',
          '0x03fe2b97c1fd336e750087d68b9b867997fd64a2661ff3ca5a7c771641e8e7ac',
          8,
        ),
        tongoContractAddress: fromAddress(
          '0x6d82c8c467eac77f880a1d5a090e0e0094a557bf67d74b98ba1881200750e27',
        ),
      },
      {
        key: 'USDC_E',
        label: 'USDC.e',
        token: makeToken(
          'USDC.e',
          'USDC.e',
          '0x053c91253bc9682c04929ca02ed00b3e423f6710d2ee7e0d5ebb06f3ecf368a8',
          6,
        ),
        tongoContractAddress: fromAddress(
          '0x72098b84989a45cc00697431dfba300f1f5d144ae916e98287418af4e548d96',
        ),
      },
      {
        key: 'USDC',
        label: 'USDC',
        token: makeToken(
          'USDC',
          'USDC',
          '0x033068F6539f8e6e6b131e6B2B814e6c34A5224bC66947c47DaB9dFeE93b35fb',
          6,
        ),
        tongoContractAddress: fromAddress(
          '0x026f79017c3c382148832c6ae50c22502e66f7a2f81ccbdb9e1377af31859d3a',
        ),
      },
      {
        key: 'USDT',
        label: 'Tether USD',
        token: makeToken(
          'Tether USD',
          'USDT',
          '0x068f5c6a61780768455de69077e07e89787839bf8166decfbf92b645209c0fb8',
          6,
        ),
        tongoContractAddress: fromAddress(
          '0x659c62ba8bc3ac92ace36ba190b350451d0c767aa973dd63b042b59cc065da0',
        ),
      },
      {
        key: 'DAI',
        label: 'Dai Stablecoin',
        token: makeToken(
          'Dai Stablecoin',
          'DAI',
          '0x00da114221cb83fa859dbdb4c44beeaa0bb37c7537ad5ae66fe5e0efd20e6eb3',
          18,
        ),
        tongoContractAddress: fromAddress(
          '0x511741b1ad1777b4ad59fbff49d64b8eb188e2aeb4fc72438278a589d8a10d8',
        ),
      },
    ],
  },
  sepolia: {
    label: 'Starknet Sepolia',
    shortLabel: 'Sepolia',
    chainId: 'SN_SEPOLIA',
    defaultChainId: constants.StarknetChainId.SN_SEPOLIA,
    rpcUrl: DEFAULT_SEPOLIA_RPC_URL,
    tagline: 'Test network for demos, QA, and wallet testing.',
    warning: 'Sepolia is deprecated for production use and should be treated as testing-only.',
    deprecated: true,
    vesuDefaultPool: fromAddress(
      '0x06227c13372b8c7b7f38ad1cfe05b5cf515b4e5c596dd05fe8437ab9747b2093',
    ),
    vesuPoolFactory: fromAddress(
      '0x03ac869e64b1164aaee7f3fd251f86581eab8bfbbd2abdf1e49c773282d4a092',
    ),
    tokens: [
      {
        key: 'STRK',
        label: 'Sepolia STRK',
        token: makeToken(
          'Sepolia Starknet Token',
          'STRK',
          '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d',
          18,
        ),
        tongoContractAddress: fromAddress(
          '0x408163bfcfc2d76f34b444cb55e09dace5905cf84c0884e4637c2c0f06ab6ed',
        ),
      },
      {
        key: 'ETH',
        label: 'Sepolia Ether',
        token: makeToken(
          'Sepolia Ether',
          'ETH',
          '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7',
          18,
        ),
        tongoContractAddress: fromAddress(
          '0x2cf0dc1d9e8c7731353dd15e6f2f22140120ef2d27116b982fa4fed87f6fef5',
        ),
      },
      {
        key: 'USDC',
        label: 'Sepolia USDC',
        token: makeToken(
          'Sepolia USDC',
          'USDC',
          '0x053b40a647cedfca6ca84f542a0fe36736031905a9639a7f19a3c1e66bfd5080',
          6,
        ),
        tongoContractAddress: fromAddress(
          '0x2caae365e67921979a4e5c16dd70eaa5776cfc6a9592bcb903d91933aaf2552',
        ),
      },
      {
        key: 'WBTC',
        label: 'Sepolia Wrapped Bitcoin',
        token: makeToken(
          'Sepolia Wrapped Bitcoin',
          'WBTC',
          '0x00452bd5c0512a61df7c7be8cfea5e4f893cb40e126bdc40aee6054db955129e',
          8,
        ),
        tongoContractAddress: fromAddress(
          '0x02b9f62f9be99590ad2505e9e89ca746c8fb67bdb6a4be2a1b9a1d867af7339e',
        ),
      },
    ],
  },
};

export const OTTERPAY_NETWORK_ORDER: OtterpayNetwork[] = ['mainnet', 'sepolia'];

export function getOtterpayNetworkConfig(
  networkOrChain: OtterpayNetwork | OtterpayChainLiteral,
): OtterpayNetworkConfig {
  if (networkOrChain === 'SN_MAIN') return OTTERPAY_NETWORKS.mainnet;
  if (networkOrChain === 'SN_SEPOLIA') return OTTERPAY_NETWORKS.sepolia;
  return OTTERPAY_NETWORKS[networkOrChain];
}

export function getOtterpayTokenDefinitions(
  networkOrChain: OtterpayNetwork | OtterpayChainLiteral,
): OtterpayTokenDefinition[] {
  return getOtterpayNetworkConfig(networkOrChain).tokens;
}

export function getOtterpayTokenPresets(
  networkOrChain: OtterpayNetwork | OtterpayChainLiteral,
): Record<string, Token> {
  return Object.fromEntries(
    getOtterpayTokenDefinitions(networkOrChain).map((definition) => [
      definition.key,
      definition.token,
    ]),
  );
}

export function getOtterpayConfidentialTokenDefinitions(
  networkOrChain: OtterpayNetwork | OtterpayChainLiteral,
): OtterpayTokenDefinition[] {
  return getOtterpayTokenDefinitions(networkOrChain).filter(
    (definition) => definition.tongoContractAddress != null,
  );
}

export function getRpcUrlForNetwork(network: OtterpayNetwork): string {
  return OTTERPAY_NETWORKS[network].rpcUrl;
}

export function getRpcUrlForChainLiteral(chainLiteral: OtterpayChainLiteral): string {
  return getOtterpayNetworkConfig(chainLiteral).rpcUrl;
}

export function getNetworkFromChainLiteral(
  chainLiteral: OtterpayChainLiteral,
): OtterpayNetwork {
  return chainLiteral === 'SN_MAIN' ? 'mainnet' : 'sepolia';
}

export function getAlternateLendingToken(
  networkOrChain: OtterpayNetwork | OtterpayChainLiteral,
  currentTokenAddress: string,
): Token | null {
  const current = fromAddress(currentTokenAddress).toLowerCase();
  const preferredOrder: OtterpayTokenKey[] = [
    'USDC',
    'USDC_E',
    'USDT',
    'DAI',
    'ETH',
    'STRK',
    'WBTC',
  ];
  const tokens = getOtterpayTokenDefinitions(networkOrChain);

  for (const key of preferredOrder) {
    const match = tokens.find(
      (tokenDefinition) =>
        tokenDefinition.key === key &&
        tokenDefinition.token.address.toLowerCase() !== current,
    );

    if (match) return match.token;
  }

  return (
    tokens.find(
      (tokenDefinition) => tokenDefinition.token.address.toLowerCase() !== current,
    )?.token ?? null
  );
}

export function buildCartridgePolicies(network: OtterpayNetwork) {
  const contracts: Record<
    string,
    {
      name: string;
      methods: Array<{ name: string; entrypoint: string }>;
    }
  > = {};
  const networkConfig = OTTERPAY_NETWORKS[network];

  networkConfig.tokens.forEach((definition) => {
    contracts[definition.token.address] = {
      name: definition.token.symbol,
      methods: [
        { name: 'approve', entrypoint: 'approve' },
        { name: 'transfer', entrypoint: 'transfer' },
      ],
    };

    if (definition.tongoContractAddress) {
      contracts[definition.tongoContractAddress] = {
        name: `${definition.token.symbol} Private Vault`,
        methods: [
          { name: 'fund', entrypoint: 'fund' },
          { name: 'transfer', entrypoint: 'transfer' },
          { name: 'withdraw', entrypoint: 'withdraw' },
          { name: 'rollover', entrypoint: 'rollover' },
          { name: 'ragequit', entrypoint: 'ragequit' },
        ],
      };
    }
  });

  contracts[networkConfig.vesuDefaultPool] = {
    name: 'Vesu',
    methods: [
      { name: 'deposit', entrypoint: 'deposit' },
      { name: 'withdraw', entrypoint: 'withdraw' },
      { name: 'withdraw_max', entrypoint: 'withdraw_max' },
    ],
  };

  return { contracts };
}
