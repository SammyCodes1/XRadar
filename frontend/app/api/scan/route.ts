import { getAddress, isAddress } from "viem";
import type { Address } from "viem";
import type { XLayerNetwork } from "@xradar/shared";
import { loadPipelineEnv } from "../../../lib/load-pipeline-env";
import { runScanAndPublish } from "../../../lib/run-scan-pipeline";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const inflight = new Set<string>();

function parseChain(value: unknown): XLayerNetwork {
  return value === "mainnet" ? "mainnet" : "testnet";
}

export async function GET() {
  return Response.json({
    ok: true,
    service: "scan",
    message: "POST a token address to run scanAndPublish.",
  });
}

export async function POST(request: Request) {
  loadPipelineEnv();

  let body: { address?: unknown; chain?: unknown };
  try {
    body = (await request.json()) as { address?: unknown; chain?: unknown };
  } catch {
    return Response.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const raw = typeof body.address === "string" ? body.address.trim() : "";
  if (!isAddress(raw)) {
    return Response.json(
      { ok: false, error: "Provide a valid 0x token contract address." },
      { status: 400 },
    );
  }

  const address = getAddress(raw) as Address;
  const chain = parseChain(body.chain);
  const lockKey = `${chain}:${address.toLowerCase()}`;
  if (inflight.has(lockKey)) {
    return Response.json(
      { ok: false, error: "A scan for this token is already running." },
      { status: 409 },
    );
  }

  inflight.add(lockKey);
  try {
    const result = await runScanAndPublish(address, chain);
    const item = result.items[0];
    if (!item) {
      return Response.json(
        { ok: false, error: "Pipeline returned no result." },
        { status: 500 },
      );
    }
    if (item.stage === "failed") {
      return Response.json(
        { ok: false, error: item.error ?? "Pipeline failed.", item },
        { status: 502 },
      );
    }
    return Response.json({ ok: true, item, chain: result.chain });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "scanAndPublish failed",
      },
      { status: 500 },
    );
  } finally {
    inflight.delete(lockKey);
  }
}
