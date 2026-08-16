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

  return { items, ready, has, toggle, remove };
}
