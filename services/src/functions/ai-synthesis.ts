import type { HealthResponse, RiskReport } from "@xradar/shared";
import type { FunctionHandler } from "../lib/http.js";
import { readJsonBody, sendError, sendJson } from "../lib/http.js";

export const aiSynthesisHandler: FunctionHandler = async (req, res) => {
  if (req.method === "GET") {
    const body: HealthResponse = {
      ok: true,
      service: "ai-synthesis",
      timestamp: new Date().toISOString(),
    };
    sendJson(res, 200, body);
    return;
  }

  if (req.method !== "POST") {
    sendError(res, 405, "Use GET for health or POST to synthesize a report");
    return;
  }

  try {
    const payload = await readJsonBody(req);
    const address =
      typeof payload?.address === "string" ? payload.address : "0x";
    const chainId =
      typeof payload?.chainId === "number" ? payload.chainId : 1952;

    const report: RiskReport = {
      scanId: crypto.randomUUID(),
      token: { address: address as `0x${string}`, chainId },
      flags: {},
      score: {
        overall: 0,
        liquidity: 0,
        contract: 0,
        holders: 0,
        social: 0,
      },
      summary: "AI synthesis scaffold only - DeepSeek is not called yet.",
      generatedAt: new Date().toISOString(),
      model: process.env.DEEPSEEK_MODEL ?? "deepseek-v4-pro",
    };

    sendJson(res, 200, { ok: true, report });
  } catch (error) {
    sendError(res, 400, error instanceof Error ? error.message : "Invalid JSON");
  }
};
