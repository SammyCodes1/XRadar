import type { Address } from "viem";
import type { XLayerNetwork } from "@xradar/shared";
import { scanAndPublish } from "@xradar/services/scanAndPublish";

export type PipelineItem = {
  token: Address;
  stage: "found" | "checked" | "synthesized" | "published" | "failed";
  score?: number;
  txHash?: string;
  error?: string;
  report?: {
    summary?: string;
    flags?: Record<
      string,
      { key: string; label: string; triggered: boolean; detail?: string }
    >;
    score?: { overall?: number };
  };
};

export type PipelineRun = {
  chain: XLayerNetwork;
  items: PipelineItem[];
};

/**
 * Run the oracle pipeline in-process. Vercel cannot spawn a local tsx CLI.
 */
export async function runScanAndPublish(
  address: Address,
  chain: XLayerNetwork,
): Promise<PipelineRun> {
  const result = await scanAndPublish({
    chain,
    forceTokens: [address],
    skipDetection: true,
    maxTokens: 1,
  });
  return {
    chain: result.chain,
    items: result.items.map((item) => ({
      token: item.token,
      stage: item.stage,
      score: item.score,
      txHash: item.txHash,
      error: item.error,
      report: item.report
        ? {
            summary: item.report.summary,
            flags: item.report.flags,
            score: item.report.score,
          }
        : undefined,
    })),
  };
}
