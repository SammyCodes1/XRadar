"use client";

import {
  ArrowRight,
  Broadcast,
  Check,
  Circle,
  NotePencil,
  Scan,
  WarningCircle,
  X,
} from "@phosphor-icons/react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { XLayerNetwork } from "@xradar/shared";
import { shortenAddress } from "../lib/format";
import { iosSpring } from "../lib/motion";
import { explorerTxUrl } from "../lib/registry";
import {
  SCAN_STEPS,
  SCAN_SUBSTEPS,
  type ScanMode,
  type ScanPhase,
} from "../lib/use-scan-job";
import type { ScanItem } from "../lib/scan-client";
import { ScanScore } from "./scan-score";
import { ScanSummary } from "./scan-summary";
import { TokenIdentity } from "./token-identity";

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

const BLIPS = [
  { x: 68, y: 28, delay: "0s" },
  { x: 30, y: 62, delay: "0.35s" },
  { x: 74, y: 70, delay: "0.7s" },
] as const;

const HEX_BITS = [
  { label: "0x60", x: 8, y: 18, delay: "0s" },
  { label: "LP", x: 78, y: 16, delay: "0.4s" },
  { label: "OKB", x: 6, y: 80, delay: "0.8s" },
  { label: "bal", x: 76, y: 78, delay: "1.1s" },
] as const;

const SYNTH_FLAGS = ["liq", "own", "tax"] as const;

const STEP_ICONS = [Scan, NotePencil, Broadcast] as const;

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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.button
            type="button"
            aria-label={closeable ? "Close scan dialog" : "Scan still running"}
            className="absolute inset-0 bg-void/78 backdrop-blur-md"
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
            className={`scan-bezel relative w-full max-w-[32rem] outline-none ${
              phase === "running" ? "shadow-[0_0_48px_rgba(196,92,38,0.18)]" : ""
            }`}
            initial={reduce ? false : { opacity: 0, y: 18, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? undefined : { opacity: 0, y: 10, scale: 0.98 }}
            transition={iosSpring}
          >
            <div className="scan-well overflow-hidden p-5 sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] tracking-[0.18em] text-accent">
                    XRADAR
                  </p>
                  <h2
                    id={titleId}
                    className="mt-1 text-lg font-semibold tracking-tight text-ink"
                  >
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

              <AnimatePresence mode="wait">
                {phase === "running" ? (
                  <motion.div
                    key="running"
                    initial={reduce ? false : { opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={reduce ? undefined : { opacity: 0, y: -8 }}
                    transition={{ duration: 0.22 }}
                  >
                    <RunningBody
                      step={step}
                      reduce={Boolean(reduce)}
                      address={address}
                    />
                  </motion.div>
                ) : null}

                {phase === "success" ? (
                  <motion.div
                    key="success"
                    initial={reduce ? false : { opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={reduce ? undefined : { opacity: 0 }}
                    transition={iosSpring}
                  >
                    <SuccessBody
                      mode={mode}
                      network={network}
                      chainId={chainId}
                      result={result}
                      score={score}
                      onClose={onClose}
                      reduce={Boolean(reduce)}
                    />
                  </motion.div>
                ) : null}

                {phase === "error" ? (
                  <motion.div
                    key="error"
                    initial={reduce ? false : { opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={reduce ? undefined : { opacity: 0 }}
                  >
                    <ErrorBody error={error} onRetry={onRetry} onClose={onClose} />
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}

function StageVisual({
  step,
  reduce,
}: {
  step: number;
  reduce: boolean;
}) {
  return (
    <div className="relative mx-auto aspect-square w-[11.5rem]" aria-hidden>
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          className="absolute inset-0"
          initial={reduce ? false : { opacity: 0, scale: 0.86, rotate: -6 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          exit={reduce ? undefined : { opacity: 0, scale: 1.08, rotate: 6 }}
          transition={{ duration: 0.3 }}
        >
          {step <= 0 ? <ReadVisual reduce={reduce} /> : null}
          {step === 1 ? <SynthesizeVisual reduce={reduce} /> : null}
          {step >= 2 ? <PublishVisual reduce={reduce} /> : null}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function ReadVisual({ reduce }: { reduce: boolean }) {
  return (
    <>
      <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_center,rgba(196,92,38,0.16),transparent_62%)]" />
      <div
        className={`absolute inset-3 rounded-full border border-accent/25 ${
          reduce ? "" : "radar-breathe"
        }`}
      />
      <div className="absolute inset-7 rounded-full border border-accent/20" />
      <div className="absolute inset-[4.25rem] rounded-full border border-line" />
      <span className="absolute inset-x-3 top-1/2 h-px bg-accent/15" />
      <span className="absolute inset-y-3 left-1/2 w-px bg-accent/15" />
      {!reduce ? (
        <div className="radar-sweep pointer-events-none absolute inset-3 rounded-full">
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background:
                "conic-gradient(from 0deg, transparent 0deg, rgba(196,92,38,0.0) 8deg, rgba(196,92,38,0.38) 42deg, transparent 86deg)",
            }}
          />
        </div>
      ) : null}
      {BLIPS.map((blip) => (
        <span
          key={`${blip.x}-${blip.y}`}
          className="absolute -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${blip.x}%`, top: `${blip.y}%` }}
        >
          <span
            className={`block size-1.5 rounded-full bg-accent ${
              reduce ? "" : "radar-blip"
            }`}
            style={{ animationDelay: reduce ? undefined : blip.delay }}
          />
        </span>
      ))}
      {HEX_BITS.map((bit) => (
        <span
          key={bit.label}
          className={`absolute -translate-x-1/2 -translate-y-1/2 font-mono text-[9px] tracking-wide text-accent/80 ${
            reduce ? "" : "hex-flicker"
          }`}
          style={{
            left: `${bit.x}%`,
            top: `${bit.y}%`,
            animationDelay: reduce ? undefined : bit.delay,
          }}
        >
          {bit.label}
        </span>
      ))}
      <Scan
        className={`absolute inset-0 m-auto size-7 text-accent ${
          reduce ? "" : "stage-icon"
        }`}
        weight="bold"
      />
    </>
  );
}

function SynthesizeVisual({ reduce }: { reduce: boolean }) {
  return (
    <>
      <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_center,rgba(196,92,38,0.1),transparent_66%)]" />
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <div
          className={`relative h-[7.6rem] w-[5.7rem] rounded-md bg-raised shadow-[0_12px_28px_rgba(26,16,11,0.28)] ring-1 ring-line ${
            reduce ? "" : "synth-sheet"
          }`}
        >
          <span className="absolute inset-x-2.5 top-2.5 h-1 rounded-full bg-accent/30" />
          <div className="absolute inset-x-2.5 top-6 space-y-2">
            {[0, 1, 2, 3].map((line) => (
              <span
                key={line}
                className={`block h-1 rounded-full bg-accent/80 ${
                  reduce ? "" : "synth-write"
                }`}
                style={{
                  width: line === 3 ? "58%" : "100%",
                  animationDelay: reduce ? undefined : `${line * 0.18}s`,
                }}
              />
            ))}
          </div>
          <div className="absolute inset-x-2 bottom-2.5 flex gap-1">
            {SYNTH_FLAGS.map((flag, index) => (
              <span
                key={flag}
                className={`rounded-[3px] px-1 py-0.5 font-mono text-[8px] uppercase tracking-wide text-accent ring-1 ring-accent/30 ${
                  reduce ? "" : "synth-flag"
                }`}
                style={{
                  animationDelay: reduce ? undefined : `${0.18 + index * 0.28}s`,
                }}
              >
                {flag}
              </span>
            ))}
          </div>
        </div>
      </div>
      <NotePencil
        className={`absolute bottom-[2.15rem] right-[2.05rem] size-7 text-accent ${
          reduce ? "" : "synth-pen"
        }`}
        weight="bold"
      />
    </>
  );
}

function PublishVisual({ reduce }: { reduce: boolean }) {
  return (
    <>
      <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_center,rgba(196,92,38,0.2),transparent_62%)]" />
      <span
        className={`absolute inset-4 rounded-full border border-accent/40 ${
          reduce ? "" : "publish-ring"
        }`}
      />
      <span
        className={`absolute inset-7 rounded-full border border-accent/30 ${
          reduce ? "" : "publish-ring"
        }`}
        style={{ animationDelay: reduce ? undefined : "0.4s" }}
      />
      <span
        className={`absolute inset-10 rounded-full border border-accent/20 ${
          reduce ? "" : "publish-ring"
        }`}
        style={{ animationDelay: reduce ? undefined : "0.8s" }}
      />
      <span className="absolute inset-[3.7rem] rounded-full border border-line" />
      {!reduce ? (
        <>
          <span className="absolute left-1/2 top-1.5 -translate-x-1/2">
            <span className="publish-dash block h-6 w-px bg-accent/75" />
          </span>
          <span className="absolute right-5 top-7 origin-bottom rotate-45">
            <span
              className="publish-dash block h-5 w-px bg-accent/50"
              style={{ animationDelay: "0.28s" }}
            />
          </span>
          <span className="absolute left-5 top-7 origin-bottom -rotate-45">
            <span
              className="publish-dash block h-5 w-px bg-accent/50"
              style={{ animationDelay: "0.52s" }}
            />
          </span>
        </>
      ) : null}
      <div
        className={`absolute inset-0 m-auto flex size-16 items-center justify-center rounded-full bg-raised ring-1 ring-accent/50 ${
          reduce ? "" : "publish-seal"
        }`}
      >
        <Broadcast
          className={`size-7 text-accent ${reduce ? "" : "stage-icon"}`}
          weight="bold"
        />
      </div>
    </>
  );
}

function RunningBody({
  step,
  reduce,
  address,
}: {
  step: number;
  reduce: boolean;
  address: string;
}) {
  const [sub, setSub] = useState(0);
  const subs = SCAN_SUBSTEPS[step] ?? SCAN_SUBSTEPS[0];

  useEffect(() => {
    setSub(0);
    if (reduce) return;
    const id = window.setInterval(() => {
      setSub((current) => (current + 1) % subs.length);
    }, 900);
    return () => window.clearInterval(id);
  }, [step, reduce, subs.length]);

  const progress = ((step + (sub + 1) / subs.length) / SCAN_STEPS.length) * 100;

  return (
    <div className="mt-5">
      <StageVisual step={step} reduce={reduce} />
      <p
        className="mt-4 text-center text-sm text-ink"
        aria-live="polite"
      >
        {SCAN_STEPS[step]}
      </p>
      <p className="mt-1 text-center font-mono text-[11px] tracking-wide text-accent">
        {subs[sub]}
      </p>
      <p className="mt-2 text-center font-mono text-[11px] text-ink-faint">
        {shortenAddress(address)}
      </p>

      <div className="mt-5 h-1 overflow-hidden rounded-full bg-line">
        <motion.div
          className="h-full bg-accent"
          animate={{ width: `${Math.min(96, progress)}%` }}
          transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 120, damping: 24 }}
        />
      </div>

      <ol className="mt-5 space-y-2">
        {SCAN_STEPS.map((label, index) => {
          const done = index < step;
          const active = index === step;
          const Icon = STEP_ICONS[index] ?? Scan;
          return (
            <motion.li
              key={label}
              className="flex items-center gap-2.5 text-sm"
              animate={{ opacity: done || active ? 1 : 0.4, x: active && !reduce ? 2 : 0 }}
              transition={{ duration: 0.2 }}
            >
              {done ? (
                <Check className="size-4 shrink-0 text-risk-low" weight="bold" />
              ) : active ? (
                <Icon className="size-4 shrink-0 text-accent" weight="bold" />
              ) : (
                <Circle className="size-4 shrink-0 text-ink-faint" weight="regular" />
              )}
              <span className={done || active ? "text-ink" : "text-ink-faint"}>
                {label}
              </span>
            </motion.li>
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
  reduce,
}: {
  mode: ScanMode;
  network: XLayerNetwork;
  chainId: number;
  result: ScanItem | null;
  score?: number;
  onClose: () => void;
  reduce: boolean;
}) {
  return (
    <div className="mt-6">
      <div className="flex items-start justify-between gap-4">
        {typeof score === "number" ? (
          <motion.div
            initial={reduce ? false : { scale: 0.86, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={iosSpring}
          >
            <ScanScore score={score} />
          </motion.div>
        ) : (
          <p className="text-sm text-ink-muted">Published with no numeric score.</p>
        )}
        <div className="pt-1 text-right">
          <p className="text-[11px] text-ink-muted">
            {result?.stage === "published" ? "On-chain · just now" : result?.stage}
          </p>
          <div className="mt-2">
            <TokenIdentity
              symbol={result?.report?.token?.symbol}
              name={result?.report?.token?.name}
              decimals={result?.report?.token?.decimals}
              poolOkb={result?.report?.token?.poolOkb}
              align="right"
            />
          </div>
        </div>
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
