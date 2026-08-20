import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { rankHits, type TokenSearchHit } from "./searchTokens";
import { searchLabelScore } from "./searchMatch";

const WOKB = "0xe538905cf8410324e03a5a23c1c177a474d59b2b" as const;
const USDT = "0x1e4a5963abfd975d8c9021ce480b42188849d41d" as const;
const PEPE = "0x1f56f393ae32a228d350303150618a3e8e9906a6" as const;
const XDOG = "0x0cc24c51bf89c00c5affbfcf5e856c25ecbdb48e" as const;

function hit(
  address: typeof WOKB | typeof USDT | typeof PEPE | typeof XDOG,
  symbol: string,
  name?: string,
): TokenSearchHit {
  return { address, symbol, name, chain: "mainnet" };
}

describe("searchLabelScore", () => {
  it("treats okb as a match for WOKB", () => {
    assert.ok(searchLabelScore("okb", "WOKB", "Wrapped OKB") > 0);
    assert.equal(searchLabelScore("okb", "XDOG", "XDOG"), 0);
    assert.equal(searchLabelScore("okb", "USDT", "Tether USD"), 0);
  });
});

describe("rankHits", () => {
  it("drops tokens whose name does not match the query", () => {
    const ranked = rankHits("okb", [
      hit(USDT, "USDT", "Tether USD"),
      hit(XDOG, "XDOG"),
      hit(WOKB, "WOKB", "Wrapped OKB"),
    ]);
    assert.deepEqual(
      ranked.map((row) => row.address),
      [WOKB],
    );
  });

  it("keeps pepe ahead of weaker substring hits", () => {
    const ranked = rankHits("pepe", [
      hit(PEPE, "PEPE", "Pepe 100x Meme coin"),
      hit(XDOG, "XDOG"),
    ]);
    assert.equal(ranked[0]?.address, PEPE);
    assert.equal(ranked.length, 1);
  });
});
