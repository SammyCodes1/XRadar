"use client";

import {
  ArrowLeft,
  ArrowsClockwise,
  CircleNotch,
  MagnifyingGlass,
  WarningCircle,
} from "@phosphor-icons/react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { getAddress, isAddress, type Address } from "viem";
import { useReadContract } from "wagmi";
import type { XLayerNetwork } from "@xradar/shared";
import { isScoreStale, timeSince } from "../lib/format";
import { RISK_REGISTRY_ABI, parseScoreResult } from "../lib/registry";
import {
  checksForReport,
  decodeReportUri,
  type DecodedRiskReport,
} from "../lib/report";
import { requestScan, type ScanItem } from "../lib/scan-client";
import { SCAN_STEPS } from "../lib/use-scan-job";
import { useDashboard } from "./dashboard-provider";
import { FindingList } from "./finding-list";
import { ScoreGauge } from "./score-gauge";
import { SiteHeader } from "./site-header";
import { TokenIdentity } from "./token-identity";

function reportFromScan(item: ScanItem | null): DecodedRiskReport {
  if (!item?.report) return {};
  return {
    summary: item.report.summary,
    flags: item.report.flags,
    score: item.report.score as DecodedRiskReport["score"],
    checks: item.report.checks as DecodedRiskReport["checks"],
    token: item.report.token,
  };
}

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
  const queryClient = useQueryClient();
  const [phase, setPhase] = useState<"idle" | "running" | "success" | "error">(
    "idle",
  );
  const [step, setStep] = useState(0);
  const [scanItem, setScanItem] = useState<ScanItem | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const runId = useRef(0);
  const startedKey = useRef("");

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
  const onChainReport = useMemo(
    () => decodeReportUri(onChain?.reportURI ?? ""),
    [onChain?.reportURI],
  );
  const localReport = useMemo(() => reportFromScan(scanItem), [scanItem]);
  const report = scanned ? onChainReport : localReport;
  const checks = useMemo(() => checksForReport(report), [report]);
  const score =
    onChain?.score ??
    scanItem?.score ??
    report.score?.overall ??
    0;
  const stale = scanned && isScoreStale(Number(onChain!.timestamp), now);
  const ready = scanned || phase === "success";

  async function runScan(nextToken: Address, nextChain: XLayerNetwork) {
    const id = ++runId.current;
    setPhase("running");
    setStep(0);
    setScanItem(null);
    setScanError(null);
    const tick = window.setInterval(() => {
      setStep((current) => Math.min(current + 1, SCAN_STEPS.length - 1));
    }, 3200);
    try {
      const payload = await requestScan(nextToken, nextChain);
      if (id !== runId.current) return;
      if (!payload.ok || !payload.item || payload.item.stage === "failed") {
        setScanError(payload.error ?? payload.item?.error ?? "Scan failed.");
        setScanItem(payload.item ?? null);
        setPhase("error");
        return;
      }
      setScanItem(payload.item);
      setStep(SCAN_STEPS.length - 1);
      setPhase("success");
      void queryClient.invalidateQueries();
    } catch (cause) {
      if (id !== runId.current) return;
      setScanError(
        cause instanceof Error ? cause.message : "Network error during scan.",
      );
      setPhase("error");
    } finally {
      window.clearInterval(tick);
    }
  }

  useEffect(() => {
    runId.current += 1;
    startedKey.current = "";
    setPhase("idle");
    setStep(0);
    setScanItem(null);
    setScanError(null);
    return () => {
      runId.current += 1;
    };
  }, [token, chain]);

  useEffect(() => {
    if (!token || !registry) return;
    if (scoreQuery.isLoading || scoreQuery.isError || scanned) return;
    const key = `${chain}:${token.toLowerCase()}`;
    if (startedKey.current === key) return;
    startedKey.current = key;
    void runScan(token, chain);
    // runScan is recreated each render; start is gated by startedKey
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, chain, registry, scoreQuery.isLoading, scoreQuery.isError, scanned]);

  return (
    <section className="rounded-lg bg-panel p-5 ring-1 ring-line sm:p-6">
      {!valid ? (
        <p className="text-sm text-ink-muted">Paste a token address to compare.</p>
      ) : null}

      {valid && scoreQuery.isLoading ? (
        <div className="h-40 animate-pulse rounded bg-raised" />
      ) : null}

      {valid && !scoreQuery.isLoading && phase === "running" ? (
        <div className="flex items-start gap-3">
          <CircleNotch
            className="mt-0.5 size-5 shrink-0 animate-spin text-accent"
            weight="bold"
          />
          <div className="min-w-0">
            <p className="font-mono text-sm text-ink">{address}</p>
            <p className="mt-2 text-sm text-ink">Scanning to compare</p>
            <p className="mt-1 text-xs text-ink-muted">{SCAN_STEPS[step]}</p>
          </div>
        </div>
      ) : null}

      {valid && !scoreQuery.isLoading && phase === "error" ? (
        <div>
          <p className="font-mono text-sm text-ink">{address}</p>
          <div className="mt-3 flex items-start gap-2 text-sm text-risk-high">
            <WarningCircle className="mt-0.5 size-4 shrink-0" weight="bold" />
            <p>{scanError ?? "Scan failed. Try again."}</p>
          </div>
          <button
            type="button"
            onClick={() => token && void runScan(token, chain)}
            className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-md bg-accent px-3 text-sm font-medium text-on-accent hover:bg-accent-hot"
          >
            <ArrowsClockwise className="size-4" weight="bold" />
            Retry scan
          </button>
        </div>
      ) : null}

      {valid && !scoreQuery.isLoading && ready ? (
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
              {scanned
                ? `${stale ? "Stale · " : ""}Scanned ${timeSince(Number(onChain!.timestamp), now)}`
                : "Scanned just now"}
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

  function onBack() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    router.push("/scan");
  }

  return (
    <div className="flex min-h-[100dvh] flex-col">
      <SiteHeader />
      <main className="page-col flex-1 py-8 sm:py-10">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex min-h-11 items-center gap-2 rounded-md bg-black px-4 text-sm font-medium text-white ring-1 ring-white/20 hover:bg-[#111] active:scale-[0.98]"
        >
          <ArrowLeft className="size-4" weight="bold" />
          Back
        </button>
        <h1 className="mt-6 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
          Compare tokens
        </h1>
        <p className="mt-2 max-w-[52ch] text-sm leading-6 text-ink-muted">
          Paste two X Layer addresses. If a token is not on the registry yet,
          Compare scans it first.
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
