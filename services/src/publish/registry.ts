import type { Address } from "viem";
import { getRegistryAddress } from "@xradar/shared";
import { env } from "../lib/env";

export const RISK_REGISTRY_ABI = [
  {
    type: "function",
    name: "publishScore",
    stateMutability: "nonpayable",
    inputs: [
      { name: "token", type: "address" },
      { name: "score", type: "uint8" },
      { name: "reportURI", type: "string" },
    ],
    outputs: [],
  },
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

export function registryAddress(chain: "mainnet" | "testnet"): Address {
  const fromEnv = env.oracleContractFor(chain);
  if (fromEnv && /^0x[0-9a-fA-F]{40}$/.test(fromEnv)) {
    return fromEnv as Address;
  }
  return getRegistryAddress(chain);
}
