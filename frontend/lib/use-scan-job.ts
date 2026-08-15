"use client";

import { useCallback, useRef, useState } from "react";
import type { XLayerNetwork } from "@xradar/shared";
import { requestScan, type ScanItem } from "./scan-client";

export const SCAN_STEPS = [
  "Reading contract and liquidity",
  "Synthesizing the report",
  "Publishing the score",
] as const;

export type ScanPhase = "idle" | "running" | "success" | "error";
export type ScanMode = "scan" | "rescan";

export function useScanJob() {
  const [phase, setPhase] = useState<ScanPhase>("idle");
  const [step, setStep] = useState(0);
  const [result, setResult] = useState<ScanItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const runningRef = useRef(false);

  const reset = useCallback(() => {
    runningRef.current = false;
    setPhase("idle");
    setStep(0);
    setResult(null);
    setError(null);
  }, []);

  const run = useCallback(async (address: string, network: XLayerNetwork) => {
    if (runningRef.current) return;
    runningRef.current = true;
    setPhase("running");
    setStep(0);
    setResult(null);
    setError(null);

    const tick = window.setInterval(() => {
      setStep((current) => Math.min(current + 1, SCAN_STEPS.length - 1));
    }, 3200);

    try {
      const payload = await requestScan(address, network);
      if (!payload.ok || !payload.item) {
        setError(payload.error ?? "Scan failed. Try again.");
        setPhase("error");
        return;
      }
      if (payload.item.stage === "failed" || payload.item.error) {
        setError(payload.item.error ?? payload.error ?? "Scan failed. Try again.");
        setResult(payload.item);
        setPhase("error");
        return;
      }
      setResult(payload.item);
      setStep(SCAN_STEPS.length - 1);
      setPhase("success");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Network error during scan.");
      setPhase("error");
    } finally {
      window.clearInterval(tick);
      runningRef.current = false;
    }
  }, []);

  return { phase, step, result, error, run, reset };
}
