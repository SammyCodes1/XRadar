"use client";

import { ArrowLeft } from "@phosphor-icons/react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getAddress, isAddress, type Address } from "viem";
import { useReadContract } from "wagmi";
import { isScoreStale, timeSince, tokenHref } from "../lib/format";
import { RISK_REGISTRY_ABI, parseScoreResult } from "../lib/registry";
import { checksForReport, decodeReportUri } from "../lib/report";
import { useDashboard } from "./dashboard-provider";
import { ReportCard } from "./report-card";
import { ShareActions } from "./share-actions";
import { ThemeToggle } from "./theme-toggle";

export function ShareCardView({
  address: rawAddress,
  chainHint,
}: {
  address: string;
  chainHint?: string;
}) {
  const valid = isAddress(rawAddress);
  const token = valid ? (getAddress(rawAddress) as Address) : undefined;
  const { network, setNetwork, chainId, registry } = useDashboard();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (chainHint === "mainnet" || chainHint === "testnet") {
      setNetwork(chainHint);
    }
  }, [chainHint, setNetwork]);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 15_000);
    return () => window.clearInterval(id);
  }, []);

  const scoreQuery = useReadContract({
    address: registry,
    abi: RISK_REGISTRY_ABI,
    functionName: "getLatestScore",
    args: token ? [token] : undefined,
    chainId,
    query: {
      enabled: Boolean(registry && token),
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
    <div className="flex min-h-[100dvh] flex-col">
      <header className="page-col flex h-14 items-center justify-between">
        <Link
          href={token ? tokenHref(token, network) : "/scan"}
          className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink"
        >
          <ArrowLeft className="size-4" weight="bold" />
          Back to report
        </Link>
        <ThemeToggle />
      </header>
      <main className="page-col flex-1 pb-16">
        {!valid ? (
          <p className="mt-10 text-sm text-risk-high">That address is not valid.</p>
        ) : null}
        {valid && scoreQuery.isLoading ? (
          <div className="mt-8 h-72 animate-pulse rounded-lg bg-panel ring-1 ring-line" />
        ) : null}
        {valid && !scoreQuery.isLoading && !scanned ? (
          <p className="mt-10 text-sm text-ink-muted">
            This token is not on the registry yet.
          </p>
        ) : null}
        {valid && scanned ? (
          <>
            <ReportCard
              address={token!}
              network={network}
              score={score}
              symbol={report.token?.symbol}
              name={report.token?.name}
              decimals={report.token?.decimals}
              poolOkb={report.token?.poolOkb}
              scannedLabel={`${stale ? "Stale · " : ""}${timeSince(Number(onChain!.timestamp), now)}`}
              checks={checks}
            />
            <div className="mt-6">
              <ShareActions
                address={token!}
                chain={network}
                symbol={report.token?.symbol}
                score={score}
              />
            </div>
          </>
        ) : null}
      </main>
    </div>
  );
}
