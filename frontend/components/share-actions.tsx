"use client";

import { Check, Copy, ShareNetwork } from "@phosphor-icons/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { XLayerNetwork } from "@xradar/shared";
import { shareCardHref, tokenHref } from "../lib/format";

export function ShareActions({
  address,
  chain,
  symbol,
  score,
}: {
  address: string;
  chain: XLayerNetwork;
  symbol?: string;
  score?: number;
}) {
  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const path = tokenHref(address, chain);
  const absolute = origin ? `${origin}${path}` : path;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(absolute);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  const tweet = [
    symbol ? `${symbol} on XRadar` : "XRadar token report",
    typeof score === "number" ? `score ${score}` : null,
    absolute,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={copyLink}
        className="inline-flex min-h-11 items-center gap-1.5 rounded-md px-3 text-sm text-ink-muted ring-1 ring-line hover:bg-raised hover:text-ink sm:min-h-0 sm:py-2"
      >
        {copied ? (
          <Check className="size-4 text-risk-low" weight="bold" />
        ) : (
          <Copy className="size-4" weight="regular" />
        )}
        {copied ? "Copied" : "Copy link"}
      </button>
      <Link
        href={shareCardHref(address, chain)}
        className="inline-flex min-h-11 items-center gap-1.5 rounded-md px-3 text-sm text-ink-muted ring-1 ring-line hover:bg-raised hover:text-ink sm:min-h-0 sm:py-2"
      >
        <ShareNetwork className="size-4" weight="regular" />
        Report card
      </Link>
      <a
        href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(tweet)}`}
        target="_blank"
        rel="noreferrer"
        className="inline-flex min-h-11 items-center rounded-md px-3 text-sm text-ink-muted ring-1 ring-line hover:bg-raised hover:text-ink sm:min-h-0 sm:py-2"
      >
        Share on X
      </a>
    </div>
  );
}
