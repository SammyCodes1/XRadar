import { isAddress } from "viem";
import { searchListedTokens } from "@xradar/services/searchTokens";
import type { XLayerNetwork } from "@xradar/shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseChain(value: string | null): XLayerNetwork {
  return value === "testnet" ? "testnet" : "mainnet";
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = url.searchParams.get("q")?.trim() ?? "";
  const chain = parseChain(url.searchParams.get("chain"));
  if (query.length < 2) {
    return Response.json({ ok: true, hits: [] });
  }
  if (isAddress(query)) {
    return Response.json({
      ok: true,
      hits: [{ address: query, symbol: undefined, name: undefined }],
    });
  }
  try {
    const hits = await searchListedTokens(query, chain);
    return Response.json({ ok: true, hits });
  } catch (error) {
    return Response.json({
      ok: true,
      hits: [],
      error: error instanceof Error ? error.message : "search failed",
    });
  }
}
