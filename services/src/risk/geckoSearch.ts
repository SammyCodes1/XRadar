import type { Address } from "viem";
import { WOKB } from "./constants";
import type { OkxTokenHit } from "./okxDex";

const GECKO = "https://api.geckoterminal.com/api/v2";

type Json = Record<string, unknown>;

function asRecord(value: unknown): Json | undefined {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Json;
  }
  return undefined;
}

function tokenFromRel(id: unknown): Address | null {
  if (typeof id !== "string") return null;
  const addr = id.includes("_") ? id.slice(id.lastIndexOf("_") + 1) : id;
  if (!/^0x[0-9a-fA-F]{40}$/.test(addr)) return null;
  return addr.toLowerCase() as Address;
}

function symbolFromPoolName(name: unknown): string | undefined {
  if (typeof name !== "string" || !name.includes("/")) return undefined;
  const symbol = name.split("/")[0]?.trim();
  return symbol || undefined;
}

function hitFromPool(pool: unknown): OkxTokenHit | null {
  const rec = asRecord(pool);
  if (!rec) return null;
  const attrs = asRecord(rec.attributes);
  const rel = asRecord(rec.relationships);
  const base = tokenFromRel(asRecord(asRecord(rel?.base_token)?.data)?.id);
  const quote = tokenFromRel(asRecord(asRecord(rel?.quote_token)?.data)?.id);
  let address = base;
  if (address && address.toLowerCase() === WOKB.toLowerCase()) address = quote;
  if (!address || address.toLowerCase() === WOKB.toLowerCase()) return null;
  const symbol = symbolFromPoolName(attrs?.name);
  return { address, symbol, name: symbol };
}

async function hitFromPoolAddress(poolAddress: string, name?: string): Promise<OkxTokenHit | null> {
  try {
    const response = await fetch(
      `${GECKO}/networks/x-layer/pools/${poolAddress}`,
      {
        headers: { accept: "application/json" },
        signal: AbortSignal.timeout(6_000),
      },
    );
    if (!response.ok) return null;
    const body = (await response.json()) as { data?: unknown };
    return hitFromPool({
      ...(asRecord(body.data) ?? {}),
      attributes: {
        ...(asRecord(asRecord(body.data)?.attributes) ?? {}),
        name: name ?? asRecord(asRecord(body.data)?.attributes)?.name,
      },
    });
  } catch {
    return null;
  }
}

export async function searchGeckoTokens(query: string): Promise<OkxTokenHit[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];
  try {
    const url = `${GECKO}/search/pools?query=${encodeURIComponent(trimmed)}&network=x-layer`;
    const response = await fetch(url, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) return [];
    const body = (await response.json()) as { data?: unknown };
    const rows = Array.isArray(body.data) ? body.data : [];
    const hits: OkxTokenHit[] = [];
    const seen = new Set<string>();
    const pending: Promise<OkxTokenHit | null>[] = [];
    for (const row of rows.slice(0, 6)) {
      const direct = hitFromPool(row);
      if (direct) {
        if (!seen.has(direct.address)) {
          seen.add(direct.address);
          hits.push(direct);
        }
        continue;
      }
      const pool = asRecord(asRecord(row)?.attributes)?.address;
      const name = asRecord(asRecord(row)?.attributes)?.name;
      if (typeof pool === "string") {
        pending.push(
          hitFromPoolAddress(
            pool,
            typeof name === "string" ? name : undefined,
          ),
        );
      }
    }
    for (const hit of await Promise.all(pending)) {
      if (!hit || seen.has(hit.address)) continue;
      seen.add(hit.address);
      hits.push(hit);
    }
    return hits.slice(0, 8);
  } catch {
    return [];
  }
}
