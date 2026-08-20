"use client";

import { Check, Copy, Star, WarningCircle } from "@phosphor-icons/react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { Address } from "viem";
import { isAddress } from "viem";
import { useReadContracts } from "wagmi";
import type { XLayerNetwork } from "@xradar/shared";
import { timeSince, tokenDisplayName } from "../lib/format";
import {
  RISK_REGISTRY_ABI,
  explorerTokenUrl,
  parseScoreResult,
} from "../lib/registry";
import { decodeReportUri } from "../lib/report";
import {
  parseWatchParam,
  useWatchlist,
  watchlistSharePath,
} from "../lib/watchlist";
import { useDashboard } from "./dashboard-provider";
import { CopyAddress } from "./copy-address";
import { ScanScore } from "./scan-score";
import { SiteHeader } from "./site-header";

export function WatchlistView({
  watchParam,
  chainHint,
}: {
  watchParam?: string;
  chainHint?: string;
}) {
  const { network, setNetwork, chainId, registry } = useDashboard();
  const { items, ready, remove, importAddresses } = useWatchlist();
  const [now, setNow] = useState(() => Date.now());
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (chainHint === "mainnet" || chainHint === "testnet") {
      setNetwork(chainHint);
    }
  }, [chainHint, setNetwork]);

  useEffect(() => {
    if (!ready) return;
    const imported = parseWatchParam(watchParam);
    if (imported.length === 0) return;
    const chain: XLayerNetwork =
      chainHint === "mainnet" || chainHint === "testnet" ? chainHint : network;
    importAddresses(imported, chain);
  }, [ready, watchParam, chainHint, network, importAddresses]);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 15_000);
    return () => window.clearInterval(id);
  }, []);

  const mine = useMemo(
    () => items.filter((item) => item.chain === network && isAddress(item.address)),
    [items, network],
  );

  const scoreContracts = useMemo(
    () =>
      registry
        ? mine.map((item) => ({
            address: registry,
            abi: RISK_REGISTRY_ABI,
            functionName: "getLatestScore" as const,
            args: [item.address as Address] as const,
            chainId,
          }))
        : [],
    [mine, registry, chainId],
  );

  const scoresQuery = useReadContracts({
    contracts: scoreContracts,
    query: {
      enabled: scoreContracts.length > 0,
      refetchInterval: 30_000,
    },
  });

  return (
    <div className="flex min-h-[100dvh] flex-col">
      <SiteHeader />
      <main className="page-col flex-1 py-8 sm:py-10">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
              Watchlist
            </h1>
            <p className="mt-2 max-w-[52ch] text-sm leading-6 text-ink-muted">
              Scores still come from RiskRegistry on {network}. Copy the list
              link to open the same tokens on another phone or laptop.
            </p>
          </div>
          {mine.length > 0 ? (
            <button
              type="button"
              onClick={async () => {
                const path = watchlistSharePath(items, network);
                const url = `${window.location.origin}${path}`;
                try {
                  await navigator.clipboard.writeText(url);
                  setCopied(true);
                  window.setTimeout(() => setCopied(false), 1600);
                } catch {
                  setCopied(false);
                }
              }}
              className="inline-flex min-h-11 items-center gap-2 rounded-md px-3 text-sm text-ink-muted ring-1 ring-line hover:bg-raised hover:text-ink"
            >
              {copied ? (
                <Check className="size-4 text-risk-low" weight="bold" />
              ) : (
                <Copy className="size-4" weight="regular" />
              )}
              {copied ? "Copied list link" : "Copy list link"}
            </button>
          ) : null}
        </div>

        {!ready ? (
          <div className="scan-bezel mt-8">
            <div className="scan-well h-24 animate-pulse" />
          </div>
        ) : null}

        {ready && mine.length === 0 ? (
          <div className="scan-bezel mt-8">
            <div className="scan-well px-5 py-14 text-center">
              <Star className="mx-auto size-6 text-ink-faint" weight="regular" />
              <p className="mt-3 text-sm text-ink">No watched tokens on {network}.</p>
              <p className="mt-1 text-sm text-ink-muted">
                Open a report and tap Watch to keep it here.
              </p>
              <Link
                href="/scan"
                className="mt-5 inline-flex min-h-11 items-center rounded-md bg-accent px-4 text-sm font-medium text-on-accent hover:bg-accent-hot"
              >
                Open scanner
              </Link>
            </div>
          </div>
        ) : null}

        {scoresQuery.isError ? (
          <div className="mt-6 flex items-start gap-2 rounded-lg bg-panel p-4 text-sm text-risk-high ring-1 ring-risk-high/30">
            <WarningCircle className="mt-0.5 size-4 shrink-0" weight="bold" />
            <p>Could not read watchlist scores from the registry.</p>
          </div>
        ) : null}

        {mine.length > 0 ? (
          <div className="scan-bezel mt-8">
            <ul className="scan-well divide-y divide-line">
              {mine.map((item, index) => {
                const parsed = parseScoreResult(scoresQuery.data?.[index]?.result);
                const report = decodeReportUri(parsed?.reportURI ?? "");
                const symbol = item.symbol ?? report.token?.symbol;
                const name = item.name ?? report.token?.name;
                const scanned = Boolean(parsed && parsed.timestamp > 0n);
                return (
                  <li key={`${item.chain}:${item.address}`} className="px-4 py-4 sm:px-5">
                    <div className="grid grid-cols-1 items-center gap-4 md:grid-cols-[5.5rem_minmax(0,1fr)_auto]">
                      {scanned ? (
                        <ScanScore score={parsed!.score} />
                      ) : (
                        <p className="text-sm text-ink-muted">No score</p>
                      )}
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <CopyAddress address={item.address} />
                          <a
                            href={explorerTokenUrl(chainId, item.address as Address)}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-ink-muted hover:text-accent"
                          >
                            Explorer
                          </a>
                        </div>
                        <p className="mt-1 truncate text-xs text-ink-muted">
                          {tokenDisplayName(symbol, name, "Unnamed contract")}
                          {report.token?.poolOkb ? ` · ${report.token.poolOkb} OKB` : ""}
                        </p>
                        {scanned ? (
                          <p className="mt-1 font-mono text-[11px] text-ink-faint">
                            Scanned {timeSince(Number(parsed!.timestamp), now)}
                          </p>
                        ) : null}
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/token/${item.address}?chain=${network}`}
                          className="inline-flex min-h-11 items-center rounded-md bg-accent px-3 text-sm font-medium text-on-accent hover:bg-accent-hot sm:min-h-0 sm:py-2"
                        >
                          Report
                        </Link>
                        <button
                          type="button"
                          onClick={() => remove(item.address, item.chain)}
                          className="inline-flex min-h-11 items-center rounded-md px-3 text-sm text-ink-muted ring-1 ring-line hover:bg-raised hover:text-ink sm:min-h-0 sm:py-2"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}
      </main>
    </div>
  );
}
