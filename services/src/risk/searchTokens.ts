import type { Address } from "viem";
import { searchExplorerTokens, type ExplorerNetwork } from "./explorer";
import { searchGeckoTokens } from "./geckoSearch";
import { searchOkxTokens, type OkxTokenHit } from "./okxDex";

export type TokenSearchHit = OkxTokenHit;

function rankHits(query: string, hits: TokenSearchHit[]): TokenSearchHit[] {
  const needle = query.trim().toLowerCase();
  const scored = hits.map((hit) => {
    const symbol = (hit.symbol ?? "").toLowerCase();
    const name = (hit.name ?? "").toLowerCase();
    let score = 0;
    if (symbol === needle) score += 100;
    else if (symbol.startsWith(needle)) score += 60;
    else if (symbol.includes(needle)) score += 30;
    if (name === needle) score += 80;
    else if (name.startsWith(needle)) score += 40;
    else if (name.includes(needle)) score += 20;
    return { hit, score };
  });
  scored.sort((a, b) => b.score - a.score);
  const unique = new Map<string, TokenSearchHit>();
  for (const row of scored) {
    const key = row.hit.address.toLowerCase();
    if (!unique.has(key)) unique.set(key, row.hit);
  }
  return [...unique.values()].slice(0, 8);
}

export async function searchListedTokens(
  query: string,
  chain: ExplorerNetwork,
): Promise<TokenSearchHit[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const [gecko, okx, explorer] = await Promise.all([
    searchGeckoTokens(trimmed),
    searchOkxTokens(trimmed).catch(() => []),
    searchExplorerTokens("mainnet", trimmed).catch(() => []),
  ]);

  return rankHits(trimmed, [...gecko, ...okx, ...explorer]);
}

export type { Address };
