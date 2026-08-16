import type { DetectionJob, HealthResponse } from "@xradar/shared";
import { networkFromChainId } from "@xradar/shared";
import type { Address } from "viem";
import type { FunctionHandler } from "../lib/http";
import { readJsonBody, sendError, sendJson } from "../lib/http";
import { scanAndPublish } from "../orchestrator/scanAndPublish";

export const detectionHandler: FunctionHandler = async (req, res) => {
  if (req.method === "GET") {
    const body: HealthResponse = {
      ok: true,
      service: "detection",
      timestamp: new Date().toISOString(),
    };
    sendJson(res, 200, body);
    return;
  }

  if (req.method !== "POST") {
    sendError(res, 405, "Use GET for health or POST to discover and publish");
    return;
  }

  try {
    const payload = (await readJsonBody(req)) as
      | (Partial<DetectionJob> & { chain?: string })
      | undefined;

    const forced = payload?.token?.address;
    const fromId = payload?.token?.chainId
      ? networkFromChainId(payload.token.chainId)
      : undefined;
    const chain =
      payload?.chain === "testnet" || payload?.chain === "mainnet"
        ? payload.chain
        : fromId ?? "mainnet";

    const result = await scanAndPublish({
      chain,
      forceTokens: forced ? [forced as Address] : undefined,
      skipDetection: Boolean(forced),
      persist: !process.env.VERCEL,
      includeCreates: !forced,
      maxTokens: forced ? 1 : 3,
      lookback: 120,
      maxBlocks: 120,
    });

    sendJson(res, 200, {
      ok: true,
      chain: result.chain,
      discovered: result.discovered,
      published: result.published,
      failed: result.failed,
      scannedFrom: result.scannedFrom,
      scannedTo: result.scannedTo,
      items: result.items,
    });
  } catch (error) {
    sendError(res, 400, error instanceof Error ? error.message : "Invalid JSON");
  }
};
