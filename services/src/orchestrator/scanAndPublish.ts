import type { Address, Hex } from "viem";
import type { DiscoveredToken, RiskReport, XLayerNetwork } from "@xradar/shared";
import { getNetwork, requireNetwork } from "@xradar/shared";
import { createXLayerPublicClient } from "../detection/client";
import { MemoryDetectionStore } from "../detection/store";
import { scanNewTokens } from "../detection/scan";
import { isLegacyReportUri } from "../publish/legacyReport";
import { publishToRegistry } from "../publish/publishToRegistry";
import {
  RISK_REGISTRY_ABI,
  readScannedTokens,
  registryAddress,
} from "../publish/registry";
import { runRiskChecks } from "../risk/runRiskChecks";
import { synthesizeReport } from "../synthesis/synthesizeReport";

export type PipelineItem = {
  token: Address;
  stage: "found" | "checked" | "synthesized" | "published" | "failed";
  deployer?: Address;
  source?: string;
  report?: RiskReport;
  txHash?: Hex;
  score?: number;
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
  persist?: boolean;
  includeCreates?: boolean;
  skipKnown?: boolean;
  refreshLegacy?: boolean;
};

async function collectLegacyTokens(
  chain: XLayerNetwork,
  known: Address[],
  limit: number,
): Promise<Address[]> {
  if (limit <= 0 || known.length === 0) return [];
  const client = createXLayerPublicClient(chain);
  const registry = registryAddress(chain);
  const found: Address[] = [];
  for (const token of known) {
    if (found.length >= limit) break;
    try {
      const latest = await client.readContract({
        address: registry,
        abi: RISK_REGISTRY_ABI,
        functionName: "getLatestScore",
        args: [token],
      });
      const uri = String(latest[1] ?? "");
      if (isLegacyReportUri(uri)) found.push(token);
    } catch {
      // skip unreadable rows
    }
  }
  return found;
}

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

  const persist = options.persist ?? !process.env.VERCEL;
  const skipKnown = options.skipKnown !== false;
  let known: Address[] = [];
  if (skipKnown) {
    try {
      known = await readScannedTokens(chain);
      logFlow(`registry already has ${known.length} token(s) on ${chain}`);
    } catch (error) {
      logFlow(
        `could not read registry tokens: ${
          error instanceof Error ? error.message : "unknown error"
        }`,
      );
    }
  }

  if (!options.skipDetection) {
    const scan = await scanNewTokens({
      network: chain,
      lookback: options.lookback ?? 80,
      maxBlocks: options.maxBlocks ?? 80,
      persist,
      includeCreates: options.includeCreates ?? true,
      skipTokens: known,
      store: persist ? undefined : new MemoryDetectionStore(),
    });
    scannedFrom = scan.fromBlock;
    scannedTo = scan.toBlock;
    discovered.push(...scan.newTokens);
    logFlow(
      `scan ${chain} blocks=${scan.fromBlock}..${scan.toBlock} new=${scan.newTokens.length}`,
    );
  }
  if (options.refreshLegacy && discovered.length < maxTokens) {
    const legacy = await collectLegacyTokens(
      chain,
      known,
      maxTokens - discovered.length,
    );
    for (const address of legacy) {
      if (
        discovered.some((token) => token.address.toLowerCase() === address.toLowerCase())
      ) {
        continue;
      }
      discovered.push({
        address,
        chainId: getNetwork(chain).chainId,
        deployer: "0x0000000000000000000000000000000000000000",
        deploymentBlock: 0,
        deploymentTimestamp: 0,
        txHash: "0x",
        source: "contract-create",
      });
      logFlow(`legacy refresh queued → ${address}`);
    }
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
