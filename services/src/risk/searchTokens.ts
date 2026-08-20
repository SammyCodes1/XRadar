import type { Address } from "viem";
import { searchExplorerTokens, type ExplorerNetwork } from "./explorer";
import { searchGeckoTokens } from "./geckoSearch";
import { searchOkxTokens, type OkxTokenHit } from "./okxDex";
import { searchLabelScore } from "./searchMatch";

export type TokenSearchHit = OkxTokenHit & { chain: ExplorerNetwork };

function withChain(
  hits: OkxTokenHit[],
  chain: ExplorerNetwork,
): TokenSearchHit[] {
  return hits.map((hit) => ({ ...hit, chain }));
}

export function rankHits(
  query: string,
  hits: TokenSearchHit[],
): TokenSearchHit[] {
  const scored = hits
    .map((hit) => ({
      hit,
      score: searchLabelScore(query, hit.symbol, hit.name),
    }))
    .filter((row) => row.score > 0);
  scored.sort((a, b) => b.score - a.score);
  const unique = new Map<string, TokenSearchHit>();
  for (const row of scored) {
    const key = `${row.hit.chain}:${row.hit.address.toLowerCase()}`;
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

  const [geckoHits, okxHits, explorer] = await Promise.all([
    searchGeckoTokens(trimmed),
    searchOkxTokens(trimmed).catch(() => []),
    searchExplorerTokens(chain, trimmed).catch(() => []),
  ]);

  return rankHits(trimmed, [
    ...withChain(geckoHits, "mainnet"),
    ...withChain(okxHits, "mainnet"),
    ...withChain(explorer, chain),
  ]);
}

export type { Address };
