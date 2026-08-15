"use client";

import { Check, Copy } from "@phosphor-icons/react";
import { useState } from "react";
import { shortenAddress } from "../lib/format";

export function CopyAddress({
  address,
  className = "",
}: {
  address: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <span className="font-mono text-sm tracking-tight text-ink">
        {shortenAddress(address)}
      </span>
      <button
        type="button"
        onClick={onCopy}
        className="rounded p-1 text-ink-muted transition-colors hover:bg-raised hover:text-ink"
        aria-label={copied ? "Address copied" : "Copy address"}
      >
        {copied ? (
          <Check weight="bold" className="size-3.5 text-risk-low" />
        ) : (
          <Copy weight="regular" className="size-3.5" />
        )}
      </button>
    </span>
  );
}
