import type { TokenMetaFinding } from "@xradar/shared";
import type { Address, Hex, PublicClient } from "viem";
import { hexToString } from "viem";
import { erc20Abi } from "./constants";

const bytes32MetaAbi = [
  {
    type: "function",
    name: "name",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "bytes32" }],
  },
  {
    type: "function",
    name: "symbol",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "bytes32" }],
  },
] as const;

function decodeBytes32(value: Hex): string | null {
  try {
    const text = hexToString(value, { size: 32 }).replace(/\0+$/g, "").trim();
    return text || null;
  } catch {
    return null;
  }
}

async function readMetaString(
  client: PublicClient,
  token: Address,
  fn: "name" | "symbol",
): Promise<string | null> {
  try {
    const value = await client.readContract({
      address: token,
      abi: erc20Abi,
      functionName: fn,
    });
    const trimmed = value.trim();
    return trimmed || null;
  } catch {
    try {
      const raw = await client.readContract({
        address: token,
        abi: bytes32MetaAbi,
        functionName: fn,
      });
      return decodeBytes32(raw);
    } catch {
      return null;
    }
  }
}

export async function checkTokenMeta(
  client: PublicClient,
  token: Address,
): Promise<TokenMetaFinding> {
  try {
    const [name, symbol, decimals] = await Promise.all([
      readMetaString(client, token, "name"),
      readMetaString(client, token, "symbol"),
      client
        .readContract({
          address: token,
          abi: erc20Abi,
          functionName: "decimals",
        })
        .catch(() => null),
    ]);

    if (name == null && symbol == null && decimals == null) {
      return {
        status: "unknown",
        name: null,
        symbol: null,
        decimals: null,
        error: "name, symbol, and decimals were unreadable",
      };
    }

    return {
      status: "ok",
      name,
      symbol,
      decimals: decimals == null ? null : Number(decimals),
    };
  } catch (error) {
    return {
      status: "unknown",
      name: null,
      symbol: null,
      decimals: null,
      error: error instanceof Error ? error.message : "token meta failed",
    };
  }
}
