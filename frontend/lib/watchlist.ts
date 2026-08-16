"use client";

import { useCallback, useEffect, useState } from "react";
import type { XLayerNetwork } from "@xradar/shared";

const KEY = "xradar.watchlist.v1";

export type WatchItem = {
  address: string;
  chain: XLayerNetwork;
  addedAt: string;
  symbol?: string;
  name?: string;
};

function readItems(): WatchItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as WatchItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function sameItem(item: WatchItem, address: string, chain: XLayerNetwork): boolean {
  return item.address.toLowerCase() === address.toLowerCase() && item.chain === chain;
}

export function parseWatchParam(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((part) => part.trim())
    .filter((part) => /^0x[0-9a-fA-F]{40}$/.test(part));
}

export function watchlistSharePath(
  items: WatchItem[],
  chain: XLayerNetwork,
): string {
  const addresses = items
    .filter((item) => item.chain === chain)
    .map((item) => item.address.toLowerCase());
  const unique = [...new Set(addresses)];
  const params = new URLSearchParams({ chain });
  if (unique.length > 0) params.set("w", unique.join(","));
  return `/watchlist?${params.toString()}`;
}

export function useWatchlist() {
  const [items, setItems] = useState<WatchItem[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setItems(readItems());
    setReady(true);
  }, []);

  const persist = useCallback((next: WatchItem[]) => {
    setItems(next);
    window.localStorage.setItem(KEY, JSON.stringify(next));
  }, []);

  const has = useCallback(
    (address: string, chain: XLayerNetwork) =>
      items.some((item) => sameItem(item, address, chain)),
    [items],
  );

  const toggle = useCallback(
    (entry: Omit<WatchItem, "addedAt">) => {
      setItems((current) => {
        const exists = current.some((item) =>
          sameItem(item, entry.address, entry.chain),
        );
        const next = exists
          ? current.filter((item) => !sameItem(item, entry.address, entry.chain))
          : [
              {
                ...entry,
                addedAt: new Date().toISOString(),
              },
              ...current,
            ];
        window.localStorage.setItem(KEY, JSON.stringify(next));
        return next;
      });
    },
    [],
  );

  const remove = useCallback(
    (address: string, chain: XLayerNetwork) => {
      persist(items.filter((item) => !sameItem(item, address, chain)));
    },
    [items, persist],
  );

  const importAddresses = useCallback(
    (addresses: string[], chain: XLayerNetwork) => {
      if (addresses.length === 0) return;
      setItems((current) => {
        const next = [...current];
        for (const address of addresses) {
          if (next.some((item) => sameItem(item, address, chain))) continue;
          next.unshift({
            address,
            chain,
            addedAt: new Date().toISOString(),
          });
        }
        window.localStorage.setItem(KEY, JSON.stringify(next));
        return next;
      });
    },
    [],
  );

  return { items, ready, has, toggle, remove, importAddresses };
}
