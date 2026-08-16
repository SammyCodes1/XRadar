import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isErc20Bytecode } from "./erc20";

describe("isErc20Bytecode", () => {
  it("accepts bytecode that contains all three selectors", () => {
    const bytecode =
      "0x6080604052a9059cbb70a0823118160ddd00" as const;
    assert.equal(isErc20Bytecode(bytecode), true);
  });

  it("rejects empty or missing code", () => {
    assert.equal(isErc20Bytecode("0x"), false);
    assert.equal(isErc20Bytecode(undefined), false);
  });

  it("rejects bytecode missing a selector", () => {
    assert.equal(isErc20Bytecode("0x6080604052a9059cbb70a08231"), false);
  });
});
