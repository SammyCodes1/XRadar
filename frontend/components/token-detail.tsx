"use client";

import {
  ArrowLeft,
  ArrowSquareOut,
  ArrowsClockwise,
  ArrowsLeftRight,
  Clock,
  WarningCircle,
} from "@phosphor-icons/react";
import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { getAddress, isAddress } from "viem";
import type { Address } from "viem";
import { useReadContract } from "wagmi";
import type { XLayerNetwork } from "@xradar/shared";
import { compareHref, isScoreStale, timeSince } from "../lib/format";
import {
  RISK_REGISTRY_ABI,
  explorerTokenUrl,
  parseScoreResult,
} from "../lib/registry";
import { checksForReport, decodeReportUri } from "../lib/report";
import { useScanJob } from "../lib/use-scan-job";
import { CopyAddress } from "./copy-address";
import { useDashboard } from "./dashboard-provider";
import { FindingList } from "./finding-list";
import { ScanDialog } from "./scan-dialog";
import { ScanSummary } from "./scan-summary";
import { ScoreGauge } from "./score-gauge";
import { ShareActions } from "./share-actions";
import { TokenIdentity } from "./token-identity";
import { WatchButton } from "./watch-button";

export function TokenDetail({
  address: rawAddress,
  chainHint,
}: {
  address: string;
  chainHint?: string;
}) {
  const valid = isAddress(rawAddress);
  const token = valid ? (getAddress(rawAddress) as Address) : undefined;
  const { network, setNetwork, chainId, registry } = useDashboard();
  const router = useRouter();
  const queryClient = useQueryClient();
  const job = useScanJob();
  const [dialogOpen, setDialogOpen] = useState(false);
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
  const summary = report.summary;
  const stale = scanned && isScoreStale(Number(onChain!.timestamp), now);

  function setChain(next: XLayerNetwork) {
    setNetwork(next);
    if (token) {
      router.replace(`/token/${token}?chain=${next}`);
    }
  }

  useEffect(() => {
    if (job.phase !== "success") return;
    void queryClient.invalidateQueries();
  }, [job.phase, job.result?.txHash, queryClient]);

  async function onRescan() {
    if (!token || job.phase === "running") return;
    setDialogOpen(true);
    await job.run(token, network);
  }

  function onCloseDialog() {
    if (job.phase === "running") return;
    setDialogOpen(false);
  }

  return (
    <div className="page-col py-8 sm:py-10">
      <Link
        href="/scan"
        className="inline-flex items-center gap-1.5 text-sm text-ink-muted transition-colors hover:text-ink"
      >
        <ArrowLeft className="size-4" weight="bold" />
        Back to scanner
      </Link>

      {!valid ? (
        <div className="mt-8 rounded-lg bg-panel p-6 ring-1 ring-line">
          <p className="text-sm text-risk-high">
            That is not a valid token contract address.
          </p>
        </div>
      ) : null}

      {valid && !registry ? (
        <div className="mt-8 rounded-lg bg-panel p-6 text-sm text-ink-muted ring-1 ring-line">
          RiskRegistry is not deployed on this network. Switch to testnet.
        </div>
      ) : null}

      {valid && registry ? (
        <>
          <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs text-ink-muted">Token report</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <CopyAddress address={token!} />
                <a
                  href={explorerTokenUrl(chainId, token!)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-accent hover:text-accent-hot"
                >
                  View on X Layer explorer
                  <ArrowSquareOut className="size-3.5" weight="bold" />
                </a>
              </div>
              <div className="mt-2">
                <TokenIdentity
                  symbol={report.token?.symbol}
                  name={report.token?.name}
                  decimals={report.token?.decimals}
                  poolOkb={report.token?.poolOkb}
                />
              </div>
            </div>
            <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
              <div
                className="flex rounded-md bg-inset p-0.5 ring-1 ring-line"
                role="group"
                aria-label="Registry network"
              >
                <button
                  type="button"
                  onClick={() => setChain("testnet")}
                  className={`rounded px-2.5 py-1 text-[11px] ${
                    network === "testnet"
                      ? "bg-raised text-ink"
                      : "text-ink-muted hover:text-ink"
                  }`}
                >
                  Testnet
                </button>
                <button
                  type="button"
                  onClick={() => setChain("mainnet")}
                  className={`rounded px-2.5 py-1 text-[11px] ${
                    network === "mainnet"
                      ? "bg-raised text-ink"
                      : "text-ink-muted hover:text-ink"
                  }`}
                >
                  Mainnet
                </button>
              </div>
              {token ? (
                <WatchButton
                  address={token}
                  chain={network}
                  symbol={report.token?.symbol}
                  name={report.token?.name}
                />
              ) : null}
              {token ? (
                <Link
                  href={compareHref(token, network)}
                  className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm text-ink-muted ring-1 ring-line hover:bg-raised hover:text-ink sm:min-h-0 sm:flex-none"
                >
                  <ArrowsLeftRight className="size-4" weight="bold" />
                  Compare
                </Link>
              ) : null}
              <button
                type="button"
                disabled={job.phase === "running"}
                onClick={onRescan}
                className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-md bg-accent px-3 py-2 text-sm font-medium text-on-accent transition-transform hover:bg-accent-hot active:scale-[0.98] disabled:opacity-60 sm:min-h-0 sm:flex-none"
              >
                <ArrowsClockwise
                  className={`size-4 ${job.phase === "running" ? "animate-spin" : ""}`}
                  weight="bold"
                />
                {job.phase === "running" ? "Rescanning" : "Rescan"}
              </button>
            </div>
          </div>

          {scoreQuery.isError ? (
            <div className="mt-6 flex items-start gap-2 rounded-lg bg-panel p-4 text-sm text-risk-high ring-1 ring-risk-high/30">
              <WarningCircle className="mt-0.5 size-4 shrink-0" weight="bold" />
              <p>
                Could not read this token from RiskRegistry.
                {scoreQuery.error?.message
                  ? ` ${scoreQuery.error.message}`
                  : ""}
              </p>
            </div>
          ) : null}

          {scoreQuery.isLoading ? (
            <div className="mt-8 grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
              <div className="h-48 animate-pulse rounded-lg bg-panel ring-1 ring-line" />
              <div className="h-48 animate-pulse rounded-lg bg-panel ring-1 ring-line" />
            </div>
          ) : null}

          {!scoreQuery.isLoading && !scanned ? (
            <div className="mt-8 rounded-lg bg-panel px-5 py-10 text-center ring-1 ring-line">
              <p className="text-sm text-ink">This token is not on the registry yet.</p>
              <p className="mt-1 text-sm text-ink-muted">
                Rescan to run risk checks and publish the first score.
              </p>
            </div>
          ) : null}

          {stale ? (
            <div className="mt-6 flex items-start gap-2 rounded-lg bg-panel p-4 text-sm ring-1 ring-accent/35">
              <Clock className="mt-0.5 size-4 shrink-0 text-accent" weight="bold" />
              <p className="text-ink">
                This score is {timeSince(Number(onChain!.timestamp), now)} old.
                Rescan to refresh the checks.
              </p>
            </div>
          ) : null}

          {!scoreQuery.isLoading && scanned ? (
            <div className="mt-8 grid items-start gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
              <aside className="rounded-lg bg-panel px-5 py-6 ring-1 ring-line">
                <ScoreGauge score={score} />
                <p className="mt-4 text-center font-mono text-xs text-ink-muted">
                  {stale ? "Stale · " : ""}
                  Scanned {timeSince(Number(onChain!.timestamp), now)}
                </p>
                {report.model ? (
                  <p className="mt-1 text-center text-[11px] text-ink-faint">
                    {report.model}
                  </p>
                ) : null}
              </aside>

              <div className="space-y-6">
                <section className="rounded-lg bg-panel p-5 ring-1 ring-line sm:p-6">
                  <h1 className="text-lg font-semibold tracking-tight text-ink">
                    Summary
                  </h1>
                  <div className="mt-4">
                    <ScanSummary summary={summary} flags={report.flags} />
                  </div>
                </section>

                <section className="rounded-lg bg-panel p-5 ring-1 ring-line sm:p-6">
                  <h2 className="text-lg font-semibold tracking-tight text-ink">
                    Deterministic checks
                  </h2>
                  <p className="mt-1 text-sm text-ink-muted">
                    Decoded from the on-chain reportURI. Unknown means the
                    check could not finish. Fail means it ran and found a
                    problem.
                  </p>
                  <div className="mt-4">
                    <FindingList checks={checks} />
                  </div>
                </section>

                {token ? (
                  <section className="rounded-lg bg-panel p-5 ring-1 ring-line sm:p-6">
                    <h2 className="text-lg font-semibold tracking-tight text-ink">
                      Share
                    </h2>
                    <p className="mt-1 text-sm text-ink-muted">
                      Copy the report link or open a screenshot card.
                    </p>
                    <div className="mt-4">
                      <ShareActions
                        address={token}
                        chain={network}
                        symbol={report.token?.symbol}
                        score={score}
                      />
                    </div>
                  </section>
                ) : null}
              </div>
            </div>
          ) : null}

        </>
      ) : null}

      {token ? (
        <ScanDialog
          open={dialogOpen}
          mode="rescan"
          address={token}
          network={network}
          chainId={chainId}
          phase={job.phase === "idle" ? "running" : job.phase}
          step={job.step}
          result={job.result}
          error={job.error}
          onClose={onCloseDialog}
          onRetry={onRescan}
        />
      ) : null}
    </div>
  );
}
