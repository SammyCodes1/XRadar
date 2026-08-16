import type { VercelRequest, VercelResponse } from "@vercel/node";
import { scanAndPublish } from "../../src/orchestrator/scanAndPublish";

/**
 * Vercel Cron: every 2 minutes (see vercel.json).
 * Cron invocations send `Authorization: Bearer $CRON_SECRET` when that env is set.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.authorization;
    if (auth !== `Bearer ${secret}`) {
      res.status(401).json({ ok: false, error: "unauthorized" });
      return;
    }
  }

  const raw = req.query.chain ?? req.query.network;
  if (raw !== "mainnet" && raw !== "testnet") {
    res.status(400).json({
      ok: false,
      error: "Pass ?chain=testnet or ?chain=mainnet",
    });
    return;
  }
  const chain = raw;
  try {
    const result = await scanAndPublish({
      chain,
      lookback: 60,
      maxBlocks: 60,
      maxTokens: 3,
    });
    res.status(200).json({ ok: true, result });
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : "pipeline failed",
    });
  }
}
