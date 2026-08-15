"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Address } from "viem";
import type { XLayerNetwork } from "@xradar/shared";
import { parseNetwork } from "@xradar/shared";
import {
  chainIdFromNetwork,
  registryAddressFor,
  type XLayerChainId,
} from "../lib/registry";

const STORAGE_KEY = "xradar.network";

type DashboardContextValue = {
  network: XLayerNetwork;
  setNetwork: (network: XLayerNetwork) => void;
  chainId: XLayerChainId;
  registry?: Address;
  lastScanned?: Address;
  setLastScanned: (token?: Address) => void;
};

const DashboardContext = createContext<DashboardContextValue | null>(null);

function defaultNetwork(): XLayerNetwork {
  const raw = process.env.NEXT_PUBLIC_DEFAULT_CHAIN_ID;
  return raw === "196" ? "mainnet" : "testnet";
}

function readPersistedNetwork(): XLayerNetwork | undefined {
  if (typeof window === "undefined") return undefined;
  const fromUrl = parseNetwork(
    new URLSearchParams(window.location.search).get("chain"),
  );
  if (fromUrl) return fromUrl;
  return parseNetwork(window.localStorage.getItem(STORAGE_KEY));
}

function persistNetwork(network: XLayerNetwork) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, network);
  const url = new URL(window.location.href);
  url.searchParams.set("chain", network);
  window.history.replaceState(window.history.state, "", url);
}

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [network, setNetworkState] = useState<XLayerNetwork>(defaultNetwork);
  const [lastByNetwork, setLastByNetwork] = useState<
    Partial<Record<XLayerNetwork, Address>>
  >({});

  useEffect(() => {
    const stored = readPersistedNetwork();
    if (stored) setNetworkState(stored);
  }, []);

  const setNetwork = useCallback((next: XLayerNetwork) => {
    setNetworkState(next);
    persistNetwork(next);
  }, []);

  const setLastScanned = useCallback(
    (token?: Address) => {
      setLastByNetwork((current) => {
        const copy = { ...current };
        if (token) copy[network] = token;
        else delete copy[network];
        return copy;
      });
    },
    [network],
  );

  const value = useMemo<DashboardContextValue>(() => {
    const chainId = chainIdFromNetwork(network) as XLayerChainId;
    return {
      network,
      setNetwork,
      chainId,
      registry: registryAddressFor(chainId),
      lastScanned: lastByNetwork[network],
      setLastScanned,
    };
  }, [network, setNetwork, lastByNetwork, setLastScanned]);

  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  const ctx = useContext(DashboardContext);
  if (!ctx) {
    throw new Error("useDashboard must be used inside DashboardProvider");
  }
  return ctx;
}
