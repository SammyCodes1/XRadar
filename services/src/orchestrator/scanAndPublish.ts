import type { Address, Hex } from "viem";
import type { DiscoveredToken, RiskReport, XLayerNetwork } from "@xradar/shared";
import { getNetwork, requireNetwork } from "@xradar/shared";
import { scanNewTokens } from "../detection/scan.js";
import { publishToRegistry } from "../publish/publishToRegistry.js";
import { runRiskChecks } from "../risk/runRiskChecks.js";
import { announcePublishedToken } from "../social/announce.js";
import type { AnnounceResult } from "../social/announce.js";
import { synthesizeReport } from "../synthesis/synthesizeReport.js";

export type PipelineItem = {
  token: Address;
  stage: "found" | "checked" | "synthesized" | "published" | "failed";
  deployer?: Address;
  source?: string;
  report?: RiskReport;
  txHash?: Hex;
  score?: number;
  tweet?: AnnounceResult;
  error?: string;
};

export type ScanAndPublishResult = {
  chain: XLayerNetwork;
  scannedFrom?: number;
  scannedTo?: number;
  discovered: number;
  published: number;
  failed: number;
  items: PipelineItem[];
};

export type ScanAndPublishOptions = {
  chain?: XLayerNetwork;
  lookback?: number;
  maxBlocks?: number;
  maxTokens?: number;
  forceTokens?: Address[];
  /** Skip the block scanner (on-demand address lookup). */
  skipDetection?: boolean;
};

function logFlow(message: string): void {
  console.log(`[pipeline] ${message}`);
}

async function processToken(
  token: Address,
  chain: XLayerNetwork,
  meta?: Pick<DiscoveredToken, "deployer" | "source">,
): Promise<PipelineItem> {
  const item: PipelineItem = {
    token,
    stage: "found",
    deployer: meta?.deployer,
    source: meta?.source,
  };
  logFlow(`token found → ${token} source=${meta?.source ?? "forced"}`);

  try {
    const findings = await runRiskChecks(token, chain);
    item.stage = "checked";
    logFlow(`risk checked → ${token}`);

    const report = await synthesizeReport(findings);
    item.stage = "synthesized";
    item.report = report;
    logFlow(
      `AI synthesized → ${token} overall=${report.score.overall} model=${report.model ?? "n/a"}`,
    );

    const published = await publishToRegistry(token, report, chain);
    item.stage = "published";
    item.txHash = published.txHash;
    item.score = published.score;
    logFlow(`published on-chain → ${token} tx=${published.txHash}`);

    item.tweet = await announcePublishedToken({
      token,
      chain,
      score: published.score,
      report,
    });
    logFlow(
      `x alert → ${token} status=${item.tweet.status} reason=${item.tweet.reason ?? "ok"} id=${item.tweet.tweetId ?? "n/a"}`,
    );
    return item;
  } catch (error) {
    item.stage = "failed";
    item.error = error instanceof Error ? error.message : "pipeline failed";
    logFlow(`failed → ${token} ${item.error}`);
    return item;
  }
}

/**
 * Full XRadar loop: detect new tokens, risk-check, synthesize, publish.
 */
export async function scanAndPublish(
  options: ScanAndPublishOptions = {},
): Promise<ScanAndPublishResult> {
  if (!options.chain) {
    throw new Error("scanAndPublish requires an explicit chain: 'testnet' or 'mainnet'");
  }
  const chain = requireNetwork(options.chain);
  const maxTokens = options.maxTokens ?? 3;
  const items: PipelineItem[] = [];

  let scannedFrom: number | undefined;
  let scannedTo: number | undefined;
  const discovered: DiscoveredToken[] = [];

  if (!options.skipDetection) {
    const scan = await scanNewTokens({
      network: chain,
      lookback: options.lookback ?? 80,
      maxBlocks: options.maxBlocks ?? 80,
      persist: true,
    });
    scannedFrom = scan.fromBlock;
    scannedTo = scan.toBlock;
    discovered.push(...scan.newTokens);
    logFlow(
      `scan ${chain} blocks=${scan.fromBlock}..${scan.toBlock} new=${scan.newTokens.length}`,
    );
  }
  const forced = options.forceTokens ?? [];
  for (const address of forced) {
    if (
      !discovered.some((t) => t.address.toLowerCase() === address.toLowerCase())
    ) {
      discovered.push({
        address,
        chainId: getNetwork(chain).chainId,
        deployer: "0x0000000000000000000000000000000000000000",
        deploymentBlock: 0,
        deploymentTimestamp: 0,
        txHash: "0x",
        source: "contract-create",
      });
    }
  }

  const batch = discovered.slice(0, maxTokens);
  for (const token of batch) {
    items.push(
      await processToken(token.address, chain, {
        deployer: token.deployer,
        source: token.source,
      }),
    );
  }

  return {
    chain,
    scannedFrom,
    scannedTo,
    discovered: discovered.length,
    published: items.filter((i) => i.stage === "published").length,
    failed: items.filter((i) => i.stage === "failed").length,
    items,
  };
}
