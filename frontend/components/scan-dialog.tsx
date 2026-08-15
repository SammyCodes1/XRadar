"use client";

import {
  ArrowRight,
  Check,
  Circle,
  CircleNotch,
  Scan,
  WarningCircle,
  X,
} from "@phosphor-icons/react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import type { XLayerNetwork } from "@xradar/shared";
import { shortenAddress } from "../lib/format";
import { iosSpring } from "../lib/motion";
import { explorerTxUrl } from "../lib/registry";
import { SCAN_STEPS, type ScanMode, type ScanPhase } from "../lib/use-scan-job";
import type { ScanItem } from "../lib/scan-client";
import { ScanScore } from "./scan-score";
import { ScanSummary } from "./scan-summary";

type ScanDialogProps = {
  open: boolean;
  mode: ScanMode;
  address: string;
  network: XLayerNetwork;
  chainId: number;
  phase: ScanPhase;
  step: number;
  result: ScanItem | null;
  error: string | null;
  onClose: () => void;
  onRetry: () => void;
};

export function ScanDialog({
  open,
  mode,
  address,
  network,
  chainId,
  phase,
  step,
  result,
  error,
  onClose,
  onRetry,
}: ScanDialogProps) {
  const reduce = useReducedMotion();
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const closeable = phase !== "running";
  const score = result?.score ?? result?.report?.score?.overall;
  const title =
    phase === "success"
      ? mode === "rescan"
        ? "Rescan published"
        : "Scan published"
      : phase === "error"
        ? mode === "rescan"
          ? "Rescan failed"
          : "Scan failed"
        : mode === "rescan"
          ? "Rescanning token"
          : "Scanning token";

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape" && closeable) {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !panelRef.current) return;
      const nodes = panelRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (nodes.length === 0) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", onKey);
      previous?.focus();
    };
  }, [open, closeable, onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
          <motion.button
            type="button"
            aria-label={closeable ? "Close scan dialog" : "Scan still running"}
            className="absolute inset-0 bg-void/72 backdrop-blur-sm"
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduce ? undefined : { opacity: 0 }}
            onClick={closeable ? onClose : undefined}
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-busy={phase === "running"}
            tabIndex={-1}
            className="scan-bezel relative w-full max-w-[28rem] outline-none"
            initial={reduce ? false : { opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? undefined : { opacity: 0, y: 10, scale: 0.98 }}
            transition={iosSpring}
          >
            <div className="scan-well p-5 sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 id={titleId} className="text-lg font-semibold tracking-tight text-ink">
                    {title}
                  </h2>
                  <p className="mt-1 font-mono text-xs text-ink-muted">
                    {shortenAddress(address)}
                    <span className="text-ink-faint"> on {network}</span>
                  </p>
                </div>
                {closeable ? (
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-md p-1.5 text-ink-muted transition-colors hover:bg-raised hover:text-ink"
                    aria-label="Close"
                  >
                    <X className="size-4" weight="bold" />
                  </button>
                ) : null}
              </div>

              {phase === "running" ? (
                <RunningBody step={step} reduce={Boolean(reduce)} />
              ) : null}

              {phase === "success" ? (
                <SuccessBody
                  mode={mode}
                  network={network}
                  chainId={chainId}
                  result={result}
                  score={score}
                  onClose={onClose}
                />
              ) : null}

              {phase === "error" ? (
                <ErrorBody error={error} onRetry={onRetry} onClose={onClose} />
              ) : null}
            </div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}

function RunningBody({ step, reduce }: { step: number; reduce: boolean }) {
  return (
    <div className="mt-6">
      <div className="flex items-center gap-4">
        <div className="relative size-14 shrink-0">
          <span className="absolute inset-0 rounded-full border border-line" />
          <span
            className={`absolute inset-0 rounded-full border-2 border-transparent border-t-accent ${
              reduce ? "" : "animate-spin"
            }`}
          />
          <Scan className="absolute inset-0 m-auto size-5 text-accent" weight="bold" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-ink">{SCAN_STEPS[step]}</p>
          <p className="mt-1 text-xs text-ink-muted">This usually takes under a minute.</p>
        </div>
      </div>
      <div className="mt-5 h-px overflow-hidden bg-line">
        <div className="h-full w-1/3 animate-scan bg-accent motion-reduce:animate-none" />
      </div>
      <ol className="mt-5 space-y-2.5">
        {SCAN_STEPS.map((label, index) => {
          const done = index < step;
          const active = index === step;
          return (
            <li key={label} className="flex items-center gap-2.5 text-sm">
              {done ? (
                <Check className="size-4 shrink-0 text-risk-low" weight="bold" />
              ) : active ? (
                <CircleNotch
                  className={`size-4 shrink-0 text-accent ${reduce ? "" : "animate-spin"}`}
                  weight="bold"
                />
              ) : (
                <Circle className="size-4 shrink-0 text-ink-faint" weight="regular" />
              )}
              <span className={done || active ? "text-ink" : "text-ink-faint"}>{label}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function SuccessBody({
  mode,
  network,
  chainId,
  result,
  score,
  onClose,
}: {
  mode: ScanMode;
  network: XLayerNetwork;
  chainId: number;
  result: ScanItem | null;
  score?: number;
  onClose: () => void;
}) {
  return (
    <div className="mt-6">
      <div className="flex items-start justify-between gap-4">
        {typeof score === "number" ? (
          <ScanScore score={score} />
        ) : (
          <p className="text-sm text-ink-muted">Published with no numeric score.</p>
        )}
        <p className="pt-1 text-right text-[11px] text-ink-muted">
          {result?.stage === "published" ? "On-chain" : result?.stage}
        </p>
      </div>
      <div className="mt-5">
        <ScanSummary
          summary={result?.report?.summary}
          flags={result?.report?.flags}
        />
      </div>
      <div className="mt-6 flex flex-wrap items-center gap-2">
        {mode === "scan" && result?.token ? (
          <Link
            href={`/token/${result.token}?chain=${network}`}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-md bg-accent px-4 text-sm font-medium text-on-accent hover:bg-accent-hot"
          >
            Open report
            <ArrowRight className="size-4" weight="bold" />
          </Link>
        ) : null}
        {result?.txHash ? (
          <a
            href={explorerTxUrl(chainId, result.txHash)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-10 items-center rounded-md px-3 text-sm text-accent ring-1 ring-line hover:bg-raised hover:text-accent-hot"
          >
            View publish tx
          </a>
        ) : null}
        <button
          type="button"
          onClick={onClose}
          className="inline-flex min-h-10 items-center rounded-md px-3 text-sm text-ink-muted ring-1 ring-line hover:bg-raised hover:text-ink"
        >
          Done
        </button>
      </div>
    </div>
  );
}

function ErrorBody({
  error,
  onRetry,
  onClose,
}: {
  error: string | null;
  onRetry: () => void;
  onClose: () => void;
}) {
  return (
    <div className="mt-6">
      <div className="flex items-start gap-2 text-sm text-risk-high">
        <WarningCircle className="mt-0.5 size-4 shrink-0" weight="bold" />
        <p>{error ?? "Scan failed. Try again."}</p>
      </div>
      <div className="mt-6 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex min-h-10 items-center rounded-md bg-accent px-4 text-sm font-medium text-on-accent hover:bg-accent-hot"
        >
          Retry
        </button>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex min-h-10 items-center rounded-md px-3 text-sm text-ink-muted ring-1 ring-line hover:bg-raised hover:text-ink"
        >
          Close
        </button>
      </div>
    </div>
  );
}
