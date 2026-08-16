import type { XLayerNetwork } from "@xradar/shared";
import { loadPipelineEnv } from "../../../lib/load-pipeline-env";
import { runDiscover } from "../../../lib/run-scan-pipeline";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const inflight = new Set<string>();
let lastStarted = 0;
const COOLDOWN_MS = 2 * 60 * 1000;

function authorize(request: Request): "cron" | "opportunistic" | null {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (secret && auth === `Bearer ${secret}`) return "cron";
  if (request.headers.get("x-vercel-cron") === "1") return "cron";
  if (request.headers.get("sec-fetch-site") === "same-origin") {
    return "opportunistic";
  }
  if (!secret) return "opportunistic";
  return null;
}

function parseChain(value: string | null): XLayerNetwork | undefined {
  if (value === "mainnet" || value === "testnet") return value;
  return undefined;
}

async function handle(request: Request): Promise<Response> {
  loadPipelineEnv();

  const kind = authorize(request);
  if (!kind) {
    return Response.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  let bodyChain: string | undefined;
  if (request.method === "POST") {
    try {
      const body = (await request.json()) as { chain?: unknown };
      if (typeof body.chain === "string") bodyChain = body.chain;
    } catch {
      bodyChain = undefined;
    }
  }

  const url = new URL(request.url);
  const requested = parseChain(url.searchParams.get("chain") ?? bodyChain ?? null);
  const chains: XLayerNetwork[] =
    requested ? [requested] : kind === "cron" ? ["mainnet", "testnet"] : ["mainnet"];

  if (kind === "opportunistic" && Date.now() - lastStarted < COOLDOWN_MS) {
    return Response.json({ ok: true, skipped: "cooldown" });
  }

  const lockKey = chains.join(",");
  if (inflight.size > 0) {
    return Response.json({ ok: true, skipped: "busy" });
  }

  inflight.add(lockKey);
  lastStarted = Date.now();
  try {
    const runs = [];
    for (const chain of chains) {
      runs.push(await runDiscover(chain));
    }
    return Response.json({
      ok: true,
      kind,
      runs: runs.map((run) => ({
        chain: run.chain,
        scannedFrom: run.scannedFrom,
        scannedTo: run.scannedTo,
        discovered: run.discovered,
        published: run.published,
        failed: run.failed,
        items: run.items.map((item) => ({
          token: item.token,
          stage: item.stage,
          score: item.score,
          txHash: item.txHash,
          error: item.error,
        })),
      })),
    });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "discover failed",
      },
      { status: 500 },
    );
  } finally {
    inflight.delete(lockKey);
  }
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}
