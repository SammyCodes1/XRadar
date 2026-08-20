import type { Address } from "viem";
import { WOKB, ZERO_ADDRESS } from "./constants";
import type { OkxTokenHit } from "./okxDex";
import { searchLabelScore } from "./searchMatch";

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

function pairSymbolsFromPoolName(
  name: unknown,
): { base?: string; quote?: string } {
  if (typeof name !== "string" || !name.includes("/")) return {};
  const cleaned = name.replace(/\s+\d+(?:\.\d+)?%\s*$/u, "").trim();
  const [base, quote] = cleaned.split("/").map((part) => part.trim());
  return {
    base: base || undefined,
    quote: quote || undefined,
  };
}

function metaFromIncluded(included: unknown): Map<string, OkxTokenHit> {
  const map = new Map<string, OkxTokenHit>();
  if (!Array.isArray(included)) return map;
  for (const row of included) {
    const rec = asRecord(row);
    if (!rec || rec.type !== "token") continue;
    const attrs = asRecord(rec.attributes);
    const address =
      tokenFromRel(rec.id) ??
      (typeof attrs?.address === "string" ? tokenFromRel(attrs.address) : null);
    if (!address) continue;
    const symbol =
      typeof attrs?.symbol === "string" && attrs.symbol
        ? attrs.symbol
        : undefined;
    const name =
      typeof attrs?.name === "string" && attrs.name && attrs.name !== symbol
        ? attrs.name
        : undefined;
    map.set(address, { address, symbol, name });
  }
  return map;
}

function asHit(
  address: Address | null,
  symbol?: string,
  name?: string,
): OkxTokenHit | null {
  if (!address) return null;
  const native = address === ZERO_ADDRESS;
  const resolved = native ? (WOKB.toLowerCase() as Address) : address;
  const nextSymbol =
    native && (symbol ?? "").toLowerCase() === "okb" ? "WOKB" : symbol;
  const nextName =
    native && (name ?? "").toLowerCase() === "okb"
      ? "Wrapped OKB"
      : name && name !== nextSymbol
        ? name
        : undefined;
  return { address: resolved, symbol: nextSymbol, name: nextName };
}

export function hitFromPool(
  pool: unknown,
  query: string,
  included: Map<string, OkxTokenHit> = new Map(),
): OkxTokenHit | null {
  const rec = asRecord(pool);
  if (!rec) return null;
  const attrs = asRecord(rec.attributes);
  const rel = asRecord(rec.relationships);
  const baseAddr = tokenFromRel(asRecord(asRecord(rel?.base_token)?.data)?.id);
  const quoteAddr = tokenFromRel(asRecord(asRecord(rel?.quote_token)?.data)?.id);
  const parsed = pairSymbolsFromPoolName(attrs?.name);
  const baseMeta = (baseAddr && included.get(baseAddr)) || undefined;
  const quoteMeta = (quoteAddr && included.get(quoteAddr)) || undefined;
  const legs = [
    asHit(baseAddr, baseMeta?.symbol ?? parsed.base, baseMeta?.name),
    asHit(quoteAddr, quoteMeta?.symbol ?? parsed.quote, quoteMeta?.name),
  ].filter((leg): leg is OkxTokenHit => Boolean(leg));

  let best: { hit: OkxTokenHit; score: number } | null = null;
  for (const leg of legs) {
    const score = searchLabelScore(query, leg.symbol, leg.name);
    if (score <= 0) continue;
    if (!best || score > best.score) best = { hit: leg, score };
  }
  return best?.hit ?? null;
}

async function hitFromPoolAddress(
  poolAddress: string,
  query: string,
  name?: string,
): Promise<OkxTokenHit | null> {
  try {
    const response = await fetch(
      `${GECKO}/networks/x-layer/pools/${poolAddress}?include=base_token,quote_token`,
      {
        headers: { accept: "application/json" },
        signal: AbortSignal.timeout(6_000),
      },
    );
    if (!response.ok) return null;
    const body = (await response.json()) as {
      data?: unknown;
      included?: unknown;
    };
    return hitFromPool(
      {
        ...(asRecord(body.data) ?? {}),
        attributes: {
          ...(asRecord(asRecord(body.data)?.attributes) ?? {}),
          name: name ?? asRecord(asRecord(body.data)?.attributes)?.name,
        },
      },
      query,
      metaFromIncluded(body.included),
    );
  } catch {
    return null;
  }
}

export async function searchGeckoTokens(query: string): Promise<OkxTokenHit[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];
  try {
    const url = `${GECKO}/search/pools?query=${encodeURIComponent(trimmed)}&network=x-layer&include=base_token,quote_token`;
    const response = await fetch(url, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) return [];
    const body = (await response.json()) as {
      data?: unknown;
      included?: unknown;
    };
    const included = metaFromIncluded(body.included);
    const rows = Array.isArray(body.data) ? body.data : [];
    const hits: OkxTokenHit[] = [];
    const seen = new Set<string>();
    const pending: Promise<OkxTokenHit | null>[] = [];
    for (const row of rows.slice(0, 12)) {
      const direct = hitFromPool(row, trimmed, included);
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
            trimmed,
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
