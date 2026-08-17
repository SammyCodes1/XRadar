"use client";

import { MagnifyingGlass, X } from "@phosphor-icons/react";
import { useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { getAddress, isAddress } from "viem";
import { iosSpring } from "../lib/motion";
import { explorerTxUrl } from "../lib/registry";
import { decodeReportUri } from "../lib/report";
import { useRegistryRows } from "../lib/use-registry-rows";
import { useScanJob } from "../lib/use-scan-job";
import { useDashboard } from "./dashboard-provider";
import { ScanDialog } from "./scan-dialog";
import { ScanScore } from "./scan-score";
import { ScanSummary } from "./scan-summary";
import { ShareActions } from "./share-actions";
import { TokenIdentity } from "./token-identity";
import { WatchButton } from "./watch-button";

export function TokenSearch() {
  const { network, chainId, setNetwork, setLastScanned } = useDashboard();
  const router = useRouter();
  const { rows } = useRegistryRows();
  const queryClient = useQueryClient();
  const reduce = useReducedMotion();
  const job = useScanJob();
  const [value, setValue] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [activeAddress, setActiveAddress] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [okxHits, setOkxHits] = useState<
    { address: string; symbol?: string; name?: string }[]
  >([]);
  const [searching, setSearching] = useState(false);

  const query = value.trim();
  const registryHits = useMemo(() => {
    if (query.length < 2 || isAddress(query)) return [];
    const needle = query.toLowerCase();
    return rows
      .flatMap((row) => {
        const report = decodeReportUri(row.reportURI);
        const symbol = report.token?.symbol ?? "";
        const name = report.token?.name ?? "";
        const hay = `${symbol} ${name} ${row.token}`.toLowerCase();
        if (!hay.includes(needle)) return [];
        return [
          {
            address: row.token,
            symbol: symbol || undefined,
            name: name || undefined,
            score: row.score,
            onRegistry: true,
          },
        ];
      })
      .slice(0, 6);
  }, [query, rows]);

  useEffect(() => {
    if (query.length < 2 || isAddress(query)) {
      setOkxHits([]);
      setSearching(false);
      return;
    }
    const handle = window.setTimeout(() => {
      setSearching(true);
      void fetch(
        `/api/search?q=${encodeURIComponent(query)}&chain=${network}`,
      )
        .then((response) => response.json())
        .then((body: { hits?: { address: string; symbol?: string; name?: string }[] }) => {
          const known = new Set(registryHits.map((hit) => hit.address.toLowerCase()));
          setOkxHits(
            (body.hits ?? []).filter(
              (hit) => !known.has(hit.address.toLowerCase()),
            ),
          );
        })
        .catch(() => setOkxHits([]))
        .finally(() => setSearching(false));
    }, 280);
    return () => window.clearTimeout(handle);
  }, [query, registryHits, network]);

  useEffect(() => {
    if (job.phase !== "success" || !job.result) return;
    if (job.result.stage === "published") {
      setLastScanned(getAddress(job.result.token));
      void queryClient.invalidateQueries();
    }
  }, [job.phase, job.result, queryClient, setLastScanned]);

  async function startScan(raw: string, chain = network) {
    if (!isAddress(raw)) return;
    const address = getAddress(raw);
    if (chain !== network) setNetwork(chain);
    setFieldError(null);
    setActiveAddress(address);
    setDialogOpen(true);
    await job.run(address, chain);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const raw = value.trim();
    if (isAddress(raw)) {
      await startScan(raw);
      return;
    }
    setSearching(true);
    let listed: { address: string; symbol?: string; name?: string }[] = [];
    try {
      const response = await fetch(
        `/api/search?q=${encodeURIComponent(raw)}&chain=${network}`,
      );
      const body = (await response.json()) as {
        hits?: { address: string; symbol?: string; name?: string }[];
      };
      listed = body.hits ?? [];
    } catch {
      listed = [];
    } finally {
      setSearching(false);
    }
    const known = new Set(registryHits.map((hit) => hit.address.toLowerCase()));
    const extra = listed.filter((hit) => !known.has(hit.address.toLowerCase()));
    setOkxHits(extra);

    if (registryHits.length === 1 && extra.length === 0) {
      router.push(`/token/${registryHits[0].address}?chain=${network}`);
      return;
    }
    if (registryHits.length === 0 && extra.length === 1) {
      await startScan(extra[0].address, "mainnet");
      return;
    }
    if (registryHits.length > 0 || extra.length > 0) {
      setFieldError("Pick a token from the list.");
      return;
    }
    setFieldError(
      "No token with that name on X Layer yet. Try another spelling or paste the 0x address.",
    );
  }

  async function onRetry() {
    if (!activeAddress) return;
    await job.run(activeAddress, network);
  }

  function onClose() {
    if (job.phase === "running") return;
    setDialogOpen(false);
  }

  const score = job.result?.score ?? job.result?.report?.score?.overall;
  const showResult = job.phase === "success" && job.result && !dialogOpen;

  return (
    <section className="relative">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[22rem] overflow-hidden bg-[radial-gradient(720px_280px_at_12%_-10%,rgba(196,92,38,0.14),transparent_58%)]" />

      <div className="page-col relative grid items-start gap-6 pb-4 pt-8 sm:pt-10 lg:grid-cols-[minmax(0,1fr)_minmax(220px,280px)] lg:gap-10">
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 18, filter: "blur(10px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={iosSpring}
        >
          <h1 className="max-w-[14ch] text-balance text-[2.15rem] font-semibold tracking-tight text-ink sm:text-5xl lg:text-[3.35rem] lg:leading-[0.95]">
            Screen a token
          </h1>
          <p className="mt-3 max-w-[42ch] text-sm leading-6 text-ink-muted sm:text-[15px] sm:leading-7">
            Search by name, symbol, or 0x address. Auto-discovery also picks
            up new DEX listings. Scores write to RiskRegistry.
          </p>
        </motion.div>

        <motion.figure
          className="scan-bezel relative hidden aspect-[16/10] overflow-hidden lg:block"
          initial={reduce ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...iosSpring, delay: 0.08 }}
        >
          <div className="relative h-full overflow-hidden rounded-[10px]">
            <Image
              src="/landing/console.jpg"
              alt="Worn steel console with four orange pixel squares"
              fill
              sizes="420px"
              className="object-cover object-center"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-void/55 via-transparent to-void/20" />
          </div>
        </motion.figure>
      </div>

      <div className="page-col relative">
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...iosSpring, delay: 0.12 }}
        >
          <form
            onSubmit={onSubmit}
            className="scan-bezel"
            aria-busy={job.phase === "running"}
            aria-describedby="token-address-hint"
          >
            <div className="scan-well flex flex-col gap-2 p-1.5 sm:flex-row sm:items-stretch">
              <label htmlFor="token-address" className="sr-only">
                Token name, symbol, or address
              </label>
              <input
                id="token-address"
                name="token"
                value={value}
                onChange={(event) => {
                  setValue(event.target.value);
                  if (fieldError) setFieldError(null);
                }}
                spellCheck={false}
                autoComplete="off"
                autoCapitalize="off"
                placeholder="Name, symbol, or 0x..."
                disabled={job.phase === "running"}
                className="min-h-12 w-full flex-1 rounded-md bg-transparent px-4 text-base text-ink outline-none placeholder:text-ink-faint focus:ring-0 disabled:opacity-60 sm:min-h-14 sm:text-sm"
              />
              <motion.button
                type="submit"
                disabled={job.phase === "running" || searching}
                whileHover={
                  reduce || job.phase === "running" || searching
                    ? undefined
                    : { scale: 1.02 }
                }
                whileTap={
                  job.phase === "running" || searching ? undefined : { scale: 0.97 }
                }
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-accent px-6 text-sm font-medium text-on-accent hover:bg-accent-hot disabled:opacity-60 sm:min-h-14"
              >
                <MagnifyingGlass className="size-4" weight="bold" />
                {job.phase === "running"
                  ? "Scanning"
                  : searching
                    ? "Searching"
                    : isAddress(query)
                      ? "Scan"
                      : "Search"}
              </motion.button>
            </div>
          </form>
          <p id="token-address-hint" className="mt-3 max-w-[62ch] text-xs leading-5 text-ink-muted">
            Type a meme name or symbol even if it has not been scanned here yet.
          </p>
          {fieldError ? (
            <p className="mt-2 text-sm text-risk-high" role="alert">
              {fieldError}
            </p>
          ) : null}
        </motion.div>

        {registryHits.length > 0 || okxHits.length > 0 ? (
          <ul className="scan-bezel mt-3">
            <div className="scan-well divide-y divide-line">
              {registryHits.map((hit) => (
                <li key={hit.address}>
                  <button
                    type="button"
                    onClick={() =>
                      router.push(`/token/${hit.address}?chain=${network}`)
                    }
                    className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-raised"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm text-ink">
                        {[hit.symbol, hit.name].filter(Boolean).join(" ") || "Unnamed"}
                      </span>
                      <span className="mt-0.5 block truncate font-mono text-[11px] text-ink-muted">
                        {hit.address}
                      </span>
                    </span>
                    <span className="font-mono text-sm tabular-nums text-ink-muted">
                      {hit.score}
                    </span>
                  </button>
                </li>
              ))}
              {okxHits.map((hit) => (
                <li key={hit.address}>
                  <button
                    type="button"
                    onClick={() => void startScan(hit.address, "mainnet")}
                    className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-raised"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm text-ink">
                        {[hit.symbol, hit.name].filter(Boolean).join(" ") || "Unnamed"}
                      </span>
                      <span className="mt-0.5 block truncate font-mono text-[11px] text-ink-muted">
                        {hit.address}
                      </span>
                    </span>
                    <span className="text-[11px] text-ink-faint">Mainnet</span>
                  </button>
                </li>
              ))}
            </div>
          </ul>
        ) : null}

        <AnimatePresence>
          {showResult ? (
            <motion.div
              key="result"
              initial={reduce ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? undefined : { opacity: 0 }}
              transition={iosSpring}
              className="scan-bezel mt-6"
            >
              <div className="scan-well p-5 sm:p-6">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 flex-1 flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                    {typeof score === "number" ? (
                      <ScanScore score={score} size="lg" />
                    ) : (
                      <p className="text-sm text-ink-muted">No score returned</p>
                    )}
                    <div className="min-w-0 flex-1 sm:text-right">
                      <p className="text-[11px] text-ink-muted">
                        {job.result?.stage === "published" ? "Published on-chain · just now" : job.result?.stage}
                      </p>
                      <div className="mt-2">
                        <TokenIdentity
                          symbol={job.result?.report?.token?.symbol}
                          name={job.result?.report?.token?.name}
                          decimals={job.result?.report?.token?.decimals}
                          poolOkb={job.result?.report?.token?.poolOkb}
                          align="right"
                        />
                      </div>
                      <p className="mt-1 truncate font-mono text-sm text-ink">
                        {job.result?.token}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => job.reset()}
                    className="rounded-md p-1.5 text-ink-muted transition-colors hover:bg-raised hover:text-ink"
                    aria-label="Dismiss scan result"
                  >
                    <X className="size-4" weight="bold" />
                  </button>
                </div>
                <div className="mt-5">
                  <ScanSummary
                    summary={job.result?.report?.summary}
                    flags={job.result?.report?.flags}
                  />
                </div>
                <div className="mt-5 flex flex-wrap items-center gap-2">
                  {job.result?.token ? (
                    <WatchButton
                      address={job.result.token}
                      chain={network}
                      symbol={job.result.report?.token?.symbol}
                      name={job.result.report?.token?.name}
                    />
                  ) : null}
                  {job.result?.token ? (
                    <ShareActions
                      address={job.result.token}
                      chain={network}
                      symbol={job.result.report?.token?.symbol}
                      score={typeof score === "number" ? score : undefined}
                    />
                  ) : null}
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
                  {job.result?.txHash ? (
                    <a
                      href={explorerTxUrl(chainId, job.result.txHash)}
                      target="_blank"
                      rel="noreferrer"
                      className="text-accent hover:text-accent-hot"
                    >
                      View publish tx
                    </a>
                  ) : null}
                  {job.result?.token ? (
                    <Link
                      href={`/token/${job.result.token}?chain=${network}`}
                      className="text-accent hover:text-accent-hot"
                    >
                      Open full report
                    </Link>
                  ) : null}
                </div>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      {activeAddress ? (
        <ScanDialog
          open={dialogOpen}
          mode="scan"
          address={activeAddress}
          network={network}
          chainId={chainId}
          phase={job.phase === "idle" ? "running" : job.phase}
          step={job.step}
          result={job.result}
          error={job.error}
          onClose={onClose}
          onRetry={onRetry}
        />
      ) : null}
    </section>
  );
}
