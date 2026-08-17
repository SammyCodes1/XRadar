"use client";

import { ArrowSquareOut, CaretRight, WarningCircle } from "@phosphor-icons/react";
import { useQueryClient } from "@tanstack/react-query";
import { motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { riskLevel, timeSince, type RiskLevel } from "../lib/format";
import { iosSpring } from "../lib/motion";
import { decodeReportUri, explorerTokenUrl } from "../lib/registry";
import { isLegacyReportUri } from "../lib/report";
import { useRegistryRows } from "../lib/use-registry-rows";
import { CopyAddress } from "./copy-address";
import { useDashboard } from "./dashboard-provider";
import { ScanScore } from "./scan-score";

type FeedFilter = "all" | RiskLevel;

export function LiveFeed() {
  const { lastScanned } = useDashboard();
  const {
    rows,
    tokensQuery,
    scoresQuery,
    feedLoading,
    registry,
    chainId,
    network,
  } = useRegistryRows();
  const queryClient = useQueryClient();
  const reduce = useReducedMotion();
  const [now, setNow] = useState(() => Date.now());
  const [filter, setFilter] = useState<FeedFilter>("all");

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 15_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!registry) return;
    void fetch(`/api/discover?chain=${network}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chain: network }),
      keepalive: true,
    })
      .then((response) => {
        if (response.ok) void queryClient.invalidateQueries();
      })
      .catch(() => undefined);
  }, [network, registry, queryClient]);

  const counts = useMemo(() => {
    const next = { all: rows.length, low: 0, medium: 0, high: 0 };
    for (const row of rows) {
      next[riskLevel(row.score)] += 1;
    }
    return next;
  }, [rows]);

  const visible = useMemo(
    () => (filter === "all" ? rows : rows.filter((row) => riskLevel(row.score) === filter)),
    [rows, filter],
  );

  const updatedAt = Math.max(
    tokensQuery.dataUpdatedAt,
    scoresQuery.dataUpdatedAt ?? 0,
  );

  if (!registry) {
    return (
      <section className="page-col pb-20 pt-12">
        <div className="scan-bezel">
          <div className="scan-well px-5 py-12 text-center">
            <p className="text-sm text-ink-muted">
              RiskRegistry is not deployed on this network yet. Switch to
              testnet to read live scores.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="page-col pb-20 pt-12">
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={iosSpring}
      >
        <h2 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
          On-chain registry
        </h2>
        <p className="mt-2 max-w-[52ch] text-sm leading-6 text-ink-muted">
          Live from RiskRegistry. New DEX listings are picked up automatically.
        </p>

        <dl className="mt-6 flex flex-wrap items-end gap-x-8 gap-y-3">
          <Stat label="Tokens" value={String(counts.all)} />
          <Stat label="High risk" value={String(counts.high)} />
          <Stat label="Medium" value={String(counts.medium)} />
          <Stat
            label="Synced"
            value={updatedAt ? timeSince(Math.floor(updatedAt / 1000), now) : "waiting"}
          />
        </dl>
      </motion.div>

      {rows.length > 0 ? (
        <div
          className="mt-6 flex flex-wrap gap-1.5"
          role="group"
          aria-label="Filter by risk"
        >
          {(
            [
              ["all", "All"],
              ["high", "High"],
              ["medium", "Medium"],
              ["low", "Low"],
            ] as const
          ).map(([key, label]) => {
            const active = filter === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                className={`rounded-md px-2.5 py-1 text-[11px] transition-colors ${
                  active
                    ? "bg-raised text-ink ring-1 ring-line"
                    : "text-ink-muted hover:text-ink"
                }`}
              >
                {label}
                <span className="ml-1.5 font-mono tabular-nums text-ink-faint">
                  {counts[key]}
                </span>
              </button>
            );
          })}
        </div>
      ) : null}

      {tokensQuery.isError ? (
        <div className="mt-6 flex items-start gap-2 rounded-lg bg-panel p-4 text-sm text-risk-high ring-1 ring-risk-high/30">
          <WarningCircle className="mt-0.5 size-4 shrink-0" weight="bold" />
          <p>
            Could not read the registry.
            {tokensQuery.error?.message
              ? ` ${tokensQuery.error.message}`
              : " Check the RPC and contract address."}
          </p>
        </div>
      ) : null}

      {feedLoading ? (
        <div className="scan-bezel mt-6">
          <div className="scan-well divide-y divide-line">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-4 sm:px-5">
                <div className="h-10 w-12 animate-pulse rounded bg-raised" />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="h-3 w-40 animate-pulse rounded bg-raised" />
                  <div className="h-3 w-24 animate-pulse rounded bg-raised" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {!feedLoading && !tokensQuery.isError && rows.length === 0 ? (
        <div className="scan-bezel mt-6">
          <div className="scan-well px-5 py-14 text-center">
            <p className="text-sm text-ink">No scores on this registry yet.</p>
            <p className="mt-1 text-sm text-ink-muted">
              Scan an address above to publish the first one.
            </p>
          </div>
        </div>
      ) : null}

      {!feedLoading && rows.length > 0 && visible.length === 0 ? (
        <div className="scan-bezel mt-6">
          <div className="scan-well px-5 py-10 text-center">
            <p className="text-sm text-ink-muted">
              No {filter} risk tokens on this registry.
            </p>
          </div>
        </div>
      ) : null}

      {visible.length > 0 ? (
        <div className="scan-bezel mt-6">
          <ul className="scan-well divide-y divide-line">
            {visible.map((row) => {
              const decoded = decodeReportUri(row.reportURI);
              const highlighted =
                lastScanned &&
                lastScanned.toLowerCase() === row.token.toLowerCase();
              const name = [decoded.token?.symbol, decoded.token?.name]
                .filter(Boolean)
                .join(" ");
              return (
                <li
                  key={row.token}
                  className={`relative px-4 py-4 sm:px-5 ${
                    highlighted ? "bg-accent/[0.06]" : ""
                  }`}
                >
                  {highlighted ? (
                    <span className="absolute inset-y-3 left-0 w-0.5 bg-accent" />
                  ) : null}
                  <div className="grid grid-cols-1 items-center gap-4 md:grid-cols-[5.5rem_minmax(0,1fr)_auto]">
                    <ScanScore score={row.score} />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <CopyAddress address={row.token} />
                        <a
                          href={explorerTokenUrl(chainId, row.token)}
                          target="_blank"
                          rel="noreferrer"
                          className="relative z-10 rounded p-1 text-ink-muted hover:text-accent"
                          aria-label="Open in explorer"
                        >
                          <ArrowSquareOut className="size-3.5" weight="regular" />
                        </a>
                      </div>
                      {name ? (
                        <p className="mt-1 truncate text-xs text-ink-muted">
                          {name}
                          {decoded.token?.poolOkb
                            ? ` · ${decoded.token.poolOkb} OKB`
                            : ""}
                        </p>
                      ) : (
                        <p className="mt-1 text-xs text-ink-faint">
                          {decoded.token?.poolOkb
                            ? `Pool ${decoded.token.poolOkb} OKB`
                            : "Unnamed contract"}
                        </p>
                      )}
                    </div>
                    <div className="flex w-full flex-col items-start gap-2 md:w-auto md:flex-row md:items-center md:justify-end md:gap-4">
                      <div className="flex flex-col items-start gap-1 md:items-end">
                        <p className="font-mono text-xs tabular-nums text-ink-muted">
                          {timeSince(row.timestamp, now)}
                        </p>
                        {isLegacyReportUri(row.reportURI) ? (
                          <p className="text-[11px] text-accent">Old report</p>
                        ) : null}
                      </div>
                      <Link
                        href={`/token/${row.token}?chain=${network}`}
                        className="inline-flex shrink-0 items-center gap-0.5 text-sm text-accent hover:text-accent-hot"
                      >
                        Report
                        <CaretRight className="size-3.5" weight="bold" />
                      </Link>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] text-ink-muted">{label}</dt>
      <dd className="mt-0.5 font-mono text-[12px] tabular-nums tracking-tight text-ink">
        {value}
      </dd>
    </div>
  );
}
