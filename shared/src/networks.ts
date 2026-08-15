import type { XLayerNetwork } from "./types";

export type NetworkId = XLayerNetwork;

export type NetworkConfig = {
  id: XLayerNetwork;
  name: string;
  chainId: number;
  rpcUrl: string;
  explorerUrl: string;
  nativeCurrency: { name: string; symbol: string; decimals: number };
  testnet: boolean;
};

const PUBLIC_RPC: Record<XLayerNetwork, string> = {
  testnet: "https://testrpc.xlayer.tech/terigon",
  mainnet: "https://rpc.xlayer.tech",
};

const PUBLIC_EXPLORER: Record<XLayerNetwork, string> = {
  testnet: "https://www.okx.com/web3/explorer/xlayer-test",
  mainnet: "https://www.okx.com/web3/explorer/xlayer",
};

/** Canonical X Layer networks. Chain IDs verified live via eth_chainId. */
export const XLAYER_NETWORKS: Record<XLayerNetwork, NetworkConfig> = {
  testnet: {
    id: "testnet",
    name: "X Layer Testnet",
    chainId: 1952,
    rpcUrl: PUBLIC_RPC.testnet,
    explorerUrl: PUBLIC_EXPLORER.testnet,
    nativeCurrency: { name: "OKB", symbol: "OKB", decimals: 18 },
    testnet: true,
  },
  mainnet: {
    id: "mainnet",
    name: "X Layer",
    chainId: 196,
    rpcUrl: PUBLIC_RPC.mainnet,
    explorerUrl: PUBLIC_EXPLORER.mainnet,
    nativeCurrency: { name: "OKB", symbol: "OKB", decimals: 18 },
    testnet: false,
  },
};

function envRpc(network: XLayerNetwork): string | undefined {
  if (typeof process === "undefined" || !process.env) return undefined;
  if (network === "mainnet") {
    return (
      process.env.XLAYER_MAINNET_RPC_URL ||
      process.env.NEXT_PUBLIC_XLAYER_MAINNET_RPC_URL
    );
  }
  return (
    process.env.XLAYER_TESTNET_RPC_URL ||
    process.env.NEXT_PUBLIC_XLAYER_TESTNET_RPC_URL
  );
}

export function getNetwork(network: XLayerNetwork): NetworkConfig {
  const base = XLAYER_NETWORKS[network];
  return {
    ...base,
    rpcUrl: envRpc(network) || base.rpcUrl,
  };
}

export function parseNetwork(value: unknown): XLayerNetwork | undefined {
  if (value === "mainnet" || value === "testnet") return value;
  return undefined;
}

export function requireNetwork(value: unknown): XLayerNetwork {
  const parsed = parseNetwork(value);
  if (!parsed) {
    throw new Error("network must be explicitly 'testnet' or 'mainnet'");
  }
  return parsed;
}

export function networkFromChainId(chainId: number): XLayerNetwork | undefined {
  if (chainId === XLAYER_NETWORKS.mainnet.chainId) return "mainnet";
  if (chainId === XLAYER_NETWORKS.testnet.chainId) return "testnet";
  return undefined;
}

export function chainIdFromNetwork(network: XLayerNetwork): number {
  return XLAYER_NETWORKS[network].chainId;
}
