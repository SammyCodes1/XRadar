"use client";

import { useMemo } from "react";
import type { Address } from "viem";
import { useReadContract, useReadContracts } from "wagmi";
import { RISK_REGISTRY_ABI, parseScoreResult } from "./registry";
import { useDashboard } from "../components/dashboard-provider";

export type RegistryRow = {
  token: Address;
  score: number;
  timestamp: number;
  reportURI: string;
};

export function useRegistryRows() {
  const { chainId, network, registry } = useDashboard();

  const tokensQuery = useReadContract({
    address: registry,
    abi: RISK_REGISTRY_ABI,
    functionName: "getAllScannedTokens",
    chainId,
    query: {
      enabled: Boolean(registry),
      refetchInterval: 30_000,
    },
  });

  const tokens = (tokensQuery.data ?? []) as Address[];

  const scoreContracts = useMemo(
    () =>
      registry
        ? tokens.map((token) => ({
            address: registry,
            abi: RISK_REGISTRY_ABI,
            functionName: "getLatestScore" as const,
            args: [token] as const,
            chainId,
          }))
        : [],
    [tokens, registry, chainId],
  );

  const scoresQuery = useReadContracts({
    contracts: scoreContracts,
    query: {
      enabled: scoreContracts.length > 0,
      refetchInterval: 30_000,
    },
  });

  const rows = useMemo<RegistryRow[]>(() => {
    return tokens
      .map((token, index) => {
        const parsed = parseScoreResult(scoresQuery.data?.[index]?.result);
        if (!parsed || parsed.timestamp === 0n) return null;
        return {
          token,
          score: parsed.score,
          timestamp: Number(parsed.timestamp),
          reportURI: parsed.reportURI,
        };
      })
      .filter((row): row is RegistryRow => row !== null)
      .sort((a, b) => b.timestamp - a.timestamp);
  }, [tokens, scoresQuery.data]);

  const feedLoading =
    tokensQuery.isLoading ||
    (tokens.length > 0 && scoresQuery.isPending && rows.length === 0);

  return {
    rows,
    tokensQuery,
    scoresQuery,
    feedLoading,
    registry,
    chainId,
    network,
  };
}
