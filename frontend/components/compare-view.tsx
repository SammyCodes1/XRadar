"use client";

import { MagnifyingGlass } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { getAddress, isAddress, type Address } from "viem";
import { useReadContract } from "wagmi";
import type { XLayerNetwork } from "@xradar/shared";
import { isScoreStale, timeSince } from "../lib/format";
import { RISK_REGISTRY_ABI, parseScoreResult } from "../lib/registry";
import { checksForReport, decodeReportUri } from "../lib/report";
import { useDashboard } from "./dashboard-provider";
import { FindingList } from "./finding-list";
import { ScoreGauge } from "./score-gauge";
import { SiteHeader } from "./site-header";
import { TokenIdentity } from "./token-identity";

function CompareColumn({
  address,
  chain,
  chainId,
  registry,
  now,
}: {
  address: string;
  chain: XLayerNetwork;
  chainId: number;
  registry?: Address;
  now: number;
}) {
  const valid = isAddress(address);
  const token = valid ? (getAddress(address) as Address) : undefined;
  const scoreQuery = useReadContract({
    address: registry,
    abi: RISK_REGISTRY_ABI,
    functionName: "getLatestScore",
    args: token ? [token] : undefined,
    chainId,
    query: {
      enabled: Boolean(registry && token),
      refetchInterval: 30_000,
    },
  });
  const onChain = parseScoreResult(scoreQuery.data);
  const scanned = Boolean(onChain && onChain.timestamp > 0n);
  const report = useMemo(
    () => decodeReportUri(onChain?.reportURI ?? ""),
    [onChain?.reportURI],
  );
  const checks = useMemo(() => checksForReport(report), [report]);
  const score = onChain?.score ?? report.score?.overall ?? 0;
  const stale = scanned && isScoreStale(Number(onChain!.timestamp), now);

  return (
    <section className="rounded-lg bg-panel p-5 ring-1 ring-line sm:p-6">
      {!valid ? (
        <p className="text-sm text-ink-muted">Paste a token address to compare.</p>
      ) : null}
      {valid && scoreQuery.isLoading ? (
        <div className="h-40 animate-pulse rounded bg-raised" />
      ) : null}
      {valid && !scoreQuery.isLoading && !scanned ? (
        <div>
          <p className="font-mono text-sm text-ink">{address}</p>
          <p className="mt-2 text-sm text-ink-muted">
            Not on this registry yet. Scan it first.
          </p>
        </div>
      ) : null}
      {valid && scanned ? (
        <>
          <TokenIdentity
            symbol={report.token?.symbol}
            name={report.token?.name}
            decimals={report.token?.decimals}
            poolOkb={report.token?.poolOkb}
          />
          <p className="mt-2 font-mono text-xs text-ink-muted">{address}</p>
          <div className="mt-5">
            <ScoreGauge score={score} />
            <p className="mt-3 text-center font-mono text-xs text-ink-muted">
              {stale ? "Stale · " : ""}
              Scanned {timeSince(Number(onChain!.timestamp), now)}
            </p>
          </div>
          <div className="mt-6">
            <FindingList checks={checks} />
          </div>
        </>
      ) : null}
    </section>
  );
}

export function CompareView({
  initialA,
  initialB,
  chainHint,
}: {
  initialA?: string;
  initialB?: string;
  chainHint?: string;
}) {
  const { network, setNetwork, chainId, registry } = useDashboard();
  const router = useRouter();
  const [left, setLeft] = useState(initialA ?? "");
  const [right, setRight] = useState(initialB ?? "");
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (chainHint === "mainnet" || chainHint === "testnet") {
      setNetwork(chainHint);
    }
  }, [chainHint, setNetwork]);

  useEffect(() => {
    if (initialA) setLeft(initialA);
    if (initialB) setRight(initialB);
  }, [initialA, initialB]);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 15_000);
    return () => window.clearInterval(id);
  }, []);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const a = left.trim();
    const b = right.trim();
    const params = new URLSearchParams({ chain: network });
    if (isAddress(a)) params.set("a", getAddress(a));
    if (isAddress(b)) params.set("b", getAddress(b));
    router.replace(`/compare?${params.toString()}`);
  }

  return (
    <div className="flex min-h-[100dvh] flex-col">
      <SiteHeader />
      <main className="page-col flex-1 py-8 sm:py-10">
        <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
          Compare tokens
        </h1>
        <p className="mt-2 max-w-[52ch] text-sm leading-6 text-ink-muted">
          Side by side reads from RiskRegistry. This is a screener, not an audit.
        </p>

        <form onSubmit={onSubmit} className="scan-bezel mt-6">
          <div className="scan-well grid gap-2 p-1.5 sm:grid-cols-[1fr_1fr_auto]">
            <input
              value={left}
              onChange={(event) => setLeft(event.target.value)}
              spellCheck={false}
              autoComplete="off"
              placeholder="Token A 0x..."
              className="min-h-12 rounded-md bg-transparent px-4 font-mono text-sm text-ink outline-none placeholder:text-ink-faint"
            />
            <input
              value={right}
              onChange={(event) => setRight(event.target.value)}
              spellCheck={false}
              autoComplete="off"
              placeholder="Token B 0x..."
              className="min-h-12 rounded-md bg-transparent px-4 font-mono text-sm text-ink outline-none placeholder:text-ink-faint"
            />
            <button
              type="submit"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-accent px-5 text-sm font-medium text-on-accent hover:bg-accent-hot"
            >
              <MagnifyingGlass className="size-4" weight="bold" />
              Compare
            </button>
          </div>
        </form>

        <div className="mt-8 grid items-start gap-6 lg:grid-cols-2">
          <CompareColumn
            address={initialA ?? ""}
            chain={network}
            chainId={chainId}
            registry={registry}
            now={now}
          />
          <CompareColumn
            address={initialB ?? ""}
            chain={network}
            chainId={chainId}
            registry={registry}
            now={now}
          />
        </div>
      </main>
    </div>
  );
}
