import type { DetectionJob, HealthResponse, TokenScanResult } from "@xradar/shared";
import type { FunctionHandler } from "../lib/http";
import { readJsonBody, sendError, sendJson } from "../lib/http";

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
    sendError(res, 405, "Use GET for health or POST to enqueue a scan");
    return;
  }

  try {
    const payload = (await readJsonBody(req)) as DetectionJob | undefined;
    if (!payload?.token?.address || !payload.token.chainId) {
      sendError(res, 400, "token.address and token.chainId are required");
      return;
    }

    const result: TokenScanResult = {
      id: crypto.randomUUID(),
      token: payload.token,
      status: "queued",
      startedAt: new Date().toISOString(),
    };

    sendJson(res, 202, {
      ok: true,
      message: "Detection scaffold only — scan pipeline is not implemented yet.",
      result,
    });
  } catch (error) {
    sendError(res, 400, error instanceof Error ? error.message : "Invalid JSON");
  }
};
