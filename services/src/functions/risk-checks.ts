import type { HealthResponse, RiskFlags } from "@xradar/shared";
import type { FunctionHandler } from "../lib/http";
import { readJsonBody, sendError, sendJson } from "../lib/http";

const emptyFlags: RiskFlags = {};

export const riskChecksHandler: FunctionHandler = async (req, res) => {
  if (req.method === "GET") {
    const body: HealthResponse = {
      ok: true,
      service: "risk-checks",
      timestamp: new Date().toISOString(),
    };
    sendJson(res, 200, body);
    return;
  }

  if (req.method !== "POST") {
    sendError(res, 405, "Use GET for health or POST to run risk checks");
    return;
  }

  try {
    await readJsonBody(req);
    sendJson(res, 200, {
      ok: true,
      message: "Risk-check scaffold only — heuristics are not implemented yet.",
      flags: emptyFlags,
    });
  } catch (error) {
    sendError(res, 400, error instanceof Error ? error.message : "Invalid JSON");
  }
};
