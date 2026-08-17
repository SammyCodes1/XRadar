import { isAddress } from "viem";
import { searchOkxTokens } from "@xradar/services/okxDex";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = url.searchParams.get("q")?.trim() ?? "";
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
    const hits = await searchOkxTokens(query);
    return Response.json({ ok: true, hits });
  } catch (error) {
    return Response.json({
      ok: true,
      hits: [],
      error: error instanceof Error ? error.message : "search failed",
    });
  }
}
