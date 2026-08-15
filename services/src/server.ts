import { createServer } from "node:http";
import { env } from "./lib/env.js";
import {
  type FunctionHandler,
  setCors,
  sendError,
  sendJson,
} from "./lib/http.js";
import { detectionHandler } from "./functions/detection.js";
import { riskChecksHandler } from "./functions/risk-checks.js";
import { aiSynthesisHandler } from "./functions/ai-synthesis.js";
import { oraclePublisherHandler } from "./functions/oracle-publisher.js";

const healthHandler: FunctionHandler = (_req, res) => {
  sendJson(res, 200, {
    ok: true,
    service: "xradar-services",
    timestamp: new Date().toISOString(),
    routes: [
      "/health",
      "/detection",
      "/risk-checks",
      "/ai-synthesis",
      "/oracle-publisher",
    ],
  });
};

const routes: Record<string, FunctionHandler> = {
  "/health": healthHandler,
  "/detection": detectionHandler,
  "/risk-checks": riskChecksHandler,
  "/ai-synthesis": aiSynthesisHandler,
  "/oracle-publisher": oraclePublisherHandler,
};

const server = createServer(async (req, res) => {
  setCors(res);
  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }

  const path = (req.url ?? "/").split("?")[0] ?? "/";
  const handler = routes[path];
  if (!handler) {
    sendError(res, 404, `No function mounted at ${path}`);
    return;
  }

  try {
    await handler(req, res);
  } catch (error) {
    sendError(
      res,
      500,
      error instanceof Error ? error.message : "Unhandled function error",
    );
  }
});

server.listen(env.port, () => {
  console.log(`XRadar services listening on http://localhost:${env.port}`);
});
