"use client";

import { MagnifyingGlass } from "@phosphor-icons/react";
import { useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { getAddress, isAddress } from "viem";
import { iosSpring } from "../lib/motion";
import { explorerTxUrl } from "../lib/registry";
import { useScanJob } from "../lib/use-scan-job";
import { useDashboard } from "./dashboard-provider";
import { ScanDialog } from "./scan-dialog";
import { ScanScore } from "./scan-score";
import { ScanSummary } from "./scan-summary";

export function TokenSearch() {
  const { network, chainId, setLastScanned } = useDashboard();
  const queryClient = useQueryClient();
  const reduce = useReducedMotion();
  const job = useScanJob();
  const [value, setValue] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [activeAddress, setActiveAddress] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    if (job.phase !== "success" || !job.result) return;
    if (job.result.stage === "published") {
      setLastScanned(getAddress(job.result.token));
      void queryClient.invalidateQueries();
    }
  }, [job.phase, job.result, queryClient, setLastScanned]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const raw = value.trim();
    if (!isAddress(raw)) {
      setFieldError("Paste a 0x-prefixed 40-character contract address.");
      return;
    }

    const address = getAddress(raw);
    setFieldError(null);
    setActiveAddress(address);
    setDialogOpen(true);
    await job.run(address, network);
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
          <h1 className="max-w-[14ch] text-balance text-4xl font-semibold tracking-tight text-ink sm:text-5xl lg:text-[3.35rem] lg:leading-[0.95]">
            Screen a token
          </h1>
          <p className="mt-3 max-w-[42ch] text-sm leading-6 text-ink-muted sm:text-[15px] sm:leading-7">
            Paste an X Layer contract. The scan writes to RiskRegistry, then
            this page reads the same number back.
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
                Token contract address
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
                placeholder="0x..."
                disabled={job.phase === "running"}
                className="min-h-14 w-full flex-1 rounded-md bg-transparent px-4 font-mono text-sm text-ink outline-none placeholder:text-ink-faint focus:ring-0 disabled:opacity-60"
              />
              <motion.button
                type="submit"
                disabled={job.phase === "running"}
                whileHover={reduce || job.phase === "running" ? undefined : { scale: 1.02 }}
                whileTap={job.phase === "running" ? undefined : { scale: 0.97 }}
                className="inline-flex min-h-14 items-center justify-center gap-2 rounded-md bg-accent px-6 text-sm font-medium text-on-accent hover:bg-accent-hot disabled:opacity-60"
              >
                <MagnifyingGlass className="size-4" weight="bold" />
                {job.phase === "running" ? "Scanning" : "Scan"}
              </motion.button>
            </div>
          </form>
          <p id="token-address-hint" className="mt-3 max-w-[62ch] text-xs leading-5 text-ink-muted">
            Oracle pipeline, then publishScore on {network}.
          </p>
          {fieldError ? (
            <p className="mt-2 text-sm text-risk-high" role="alert">
              {fieldError}
            </p>
          ) : null}
        </motion.div>

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
                <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                  {typeof score === "number" ? (
                    <ScanScore score={score} size="lg" />
                  ) : (
                    <p className="text-sm text-ink-muted">No score returned</p>
                  )}
                  <div className="min-w-0 flex-1 sm:text-right">
                    <p className="text-[11px] text-ink-muted">
                      {job.result?.stage === "published" ? "Published on-chain" : job.result?.stage}
                    </p>
                    <p className="mt-1 truncate font-mono text-sm text-ink">
                      {job.result?.token}
                    </p>
                  </div>
                </div>
                <div className="mt-5">
                  <ScanSummary
                    summary={job.result?.report?.summary}
                    flags={job.result?.report?.flags}
                  />
                </div>
                <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
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
