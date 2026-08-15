import type { HealthResponse, OraclePublication } from "@xradar/shared";
import type { FunctionHandler } from "../lib/http.js";
import { readJsonBody, sendError, sendJson } from "../lib/http.js";

export const oraclePublisherHandler: FunctionHandler = async (req, res) => {
  if (req.method === "GET") {
    const body: HealthResponse = {
      ok: true,
      service: "oracle-publisher",
      timestamp: new Date().toISOString(),
    };
    sendJson(res, 200, body);
    return;
  }

  if (req.method !== "POST") {
    sendError(res, 405, "Use GET for health or POST to publish a score");
    return;
  }

  try {
    const payload = await readJsonBody(req);
    const publication: OraclePublication = {
      token:
        typeof payload?.token === "string"
          ? (payload.token as `0x${string}`)
          : "0x",
      chainId: typeof payload?.chainId === "number" ? payload.chainId : 1952,
      score: typeof payload?.score === "number" ? payload.score : 0,
      reportHash:
        typeof payload?.reportHash === "string"
          ? (payload.reportHash as `0x${string}`)
          : "0x",
    };

    sendJson(res, 200, {
      ok: true,
      message:
        "Oracle publisher scaffold only — no transaction is broadcast yet.",
      publication,
      configured: Boolean(process.env.ORACLE_WALLET_PRIVATE_KEY),
    });
  } catch (error) {
    sendError(res, 400, error instanceof Error ? error.message : "Invalid JSON");
  }
};
