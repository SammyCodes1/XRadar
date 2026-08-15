import type { Address } from "viem";
import {
  chainIdFromNetwork,
  getNetwork,
  networkFromChainId,
  tryRegistryAddress,
} from "@xradar/shared";
import { xLayer, xLayerTestnet } from "./chains";

export const RISK_REGISTRY_ABI = [
  {
    type: "function",
    name: "getLatestScore",
    stateMutability: "view",
    inputs: [{ name: "token", type: "address" }],
    outputs: [
      { name: "score", type: "uint8" },
      { name: "reportURI", type: "string" },
      { name: "timestamp", type: "uint256" },
    ],
  },
  {
    type: "function",
    name: "getAllScannedTokens",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "tokens", type: "address[]" }],
  },
] as const;

export type XLayerChainId = typeof xLayer.id | typeof xLayerTestnet.id;

export { chainIdFromNetwork, networkFromChainId };

export function registryAddressFor(chainId: number): Address | undefined {
  const network = networkFromChainId(chainId);
  return network ? tryRegistryAddress(network) : undefined;
}

export function explorerTokenUrl(chainId: number, token: Address): string {
  const network = networkFromChainId(chainId) ?? "testnet";
  return `${getNetwork(network).explorerUrl}/address/${token}`;
}

export function explorerTxUrl(chainId: number, hash: string): string {
  const network = networkFromChainId(chainId) ?? "testnet";
  return `${getNetwork(network).explorerUrl}/tx/${hash}`;
}

export type OnChainScore = {
  score: number;
  reportURI: string;
  timestamp: bigint;
};

function asBigInt(value: unknown): bigint {
  if (typeof value === "bigint") return value;
  if (typeof value === "number" && Number.isFinite(value)) {
    return BigInt(Math.trunc(value));
  }
  if (typeof value === "string" && value.length > 0) return BigInt(value);
  return BigInt(0);
}

export function parseScoreResult(value: unknown): OnChainScore | null {
  if (!value) return null;
  if (Array.isArray(value) && value.length >= 3) {
    return {
      score: Number(value[0]),
      reportURI: String(value[1] ?? ""),
      timestamp: asBigInt(value[2]),
    };
  }
  if (typeof value === "object") {
    const record = value as {
      score?: unknown;
      reportURI?: unknown;
      timestamp?: unknown;
    };
    if (record.score === undefined || record.timestamp === undefined) {
      return null;
    }
    return {
      score: Number(record.score),
      reportURI: String(record.reportURI ?? ""),
      timestamp: asBigInt(record.timestamp),
    };
  }
  return null;
}

export { decodeReportUri } from "./report";
