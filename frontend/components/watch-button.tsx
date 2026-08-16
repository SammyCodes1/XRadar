"use client";

import { Star } from "@phosphor-icons/react";
import type { XLayerNetwork } from "@xradar/shared";
import { useWatchlist } from "../lib/watchlist";

export function WatchButton({
  address,
  chain,
  symbol,
  name,
  compact = false,
}: {
  address: string;
  chain: XLayerNetwork;
  symbol?: string;
  name?: string;
  compact?: boolean;
}) {
  const { has, toggle, ready } = useWatchlist();
  const watched = ready && has(address, chain);

  return (
    <button
      type="button"
      onClick={() => toggle({ address, chain, symbol, name })}
      className={
        compact
          ? "inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-ink-muted ring-1 ring-line hover:bg-raised hover:text-ink"
          : "inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm text-ink-muted ring-1 ring-line hover:bg-raised hover:text-ink sm:min-h-0"
      }
      aria-pressed={watched}
      aria-label={watched ? "Remove from watchlist" : "Add to watchlist"}
    >
      <Star
        className={`size-4 ${watched ? "text-accent" : ""}`}
        weight={watched ? "fill" : "regular"}
      />
      {compact ? null : watched ? "Watching" : "Watch"}
    </button>
  );
}
