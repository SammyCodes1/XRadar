import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { hitFromPool } from "./geckoSearch";
import type { OkxTokenHit } from "./okxDex";

const WOKB = "0xe538905cf8410324e03a5a23c1c177a474d59b2b";
const USDT = "0x1e4a5963abfd975d8c9021ce480b42188849d41d";
const PEPE = "0x1f56f393ae32a228d350303150618a3e8e9906a6";
const XDOG = "0x0cc24c51bf89c00c5affbfcf5e856c25ecbdb48e";

function pool(name: string, base: string, quote: string) {
  return {
    attributes: { name },
    relationships: {
      base_token: { data: { id: `x-layer_${base}` } },
      quote_token: { data: { id: `x-layer_${quote}` } },
    },
  };
}

function included(
  rows: { address: string; symbol: string; name: string }[],
): Map<string, OkxTokenHit> {
  const map = new Map<string, OkxTokenHit>();
  for (const row of rows) {
    map.set(row.address, {
      address: row.address as OkxTokenHit["address"],
      symbol: row.symbol,
      name: row.name === row.symbol ? undefined : row.name,
    });
  }
  return map;
}

const meta = included([
  { address: PEPE, symbol: "PEPE", name: "Pepe 100x Meme coin" },
  { address: WOKB, symbol: "WOKB", name: "Wrapped OKB" },
  { address: USDT, symbol: "USDT", name: "Tether USD" },
  { address: XDOG, symbol: "XDOG", name: "XDOG" },
]);

describe("hitFromPool", () => {
  it("returns the matching base token, not the quote, with a real name", () => {
    const hit = hitFromPool(pool("PEPE / WOKB 1%", PEPE, WOKB), "pepe", meta);
    assert.equal(hit?.address, PEPE);
    assert.equal(hit?.symbol, "PEPE");
    assert.equal(hit?.name, "Pepe 100x Meme coin");
  });

  it("returns WOKB when the query is okb, not the USDT side of the pair", () => {
    const hit = hitFromPool(pool("WOKB / USDT", WOKB, USDT), "okb", meta);
    assert.equal(hit?.address, WOKB);
    assert.equal(hit?.symbol, "WOKB");
    assert.equal(hit?.name, "Wrapped OKB");
  });

  it("does not return XDOG for an okb query against an XDOG/WOKB pool", () => {
    const hit = hitFromPool(pool("XDOG / WOKB", XDOG, WOKB), "okb", meta);
    assert.equal(hit?.address, WOKB);
    assert.equal(hit?.symbol, "WOKB");
  });

  it("falls back to pool-name symbols when include data is missing", () => {
    const hit = hitFromPool(pool("PEPE / WOKB 1%", PEPE, WOKB), "pepe");
    assert.equal(hit?.address, PEPE);
    assert.equal(hit?.symbol, "PEPE");
    assert.equal(hit?.name, undefined);
  });

  it("maps native OKB to the WOKB contract", () => {
    const hit = hitFromPool(
      pool("OKB / USD₮0 0.2%", "0x0000000000000000000000000000000000000000", USDT),
      "okb",
    );
    assert.equal(hit?.address, WOKB);
    assert.equal(hit?.symbol, "WOKB");
  });
});
