import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { RiskFindings } from "@xradar/shared";
import { checksFromFindings, scoreFromFindings } from "./synthesizeReport";

function base(over: Partial<RiskFindings> = {}): RiskFindings {
  return {
    token: "0x0000000000000000000000000000000000000001",
    chain: "testnet",
    chainId: 1952,
    checkedAt: new Date().toISOString(),
    verifiedContract: { status: "ok", verified: true },
    ownershipStatus: {
      status: "ok",
      hasOwnerFunction: false,
      owner: null,
      renounced: true,
      hasMint: false,
      hasBlacklist: false,
      hasPause: false,
      source: "owner-call",
    },
    honeypotCheck: {
      status: "ok",
      isHoneypot: false,
      buyTax: 1,
      sellTax: 1,
      buyReverted: false,
      sellReverted: false,
    },
    lpLockStatus: {
      status: "ok",
      locked: true,
      lockedPercent: 90,
    },
    holderConcentration: {
      status: "ok",
      top10Percent: 18,
      method: "transfer-logs",
    },
    deployerHistory: {
      status: "ok",
      deployer: "0x0000000000000000000000000000000000000002",
      contractsCreated: 1,
      stillLiquid: 1,
      abandoned: 0,
    },
    tokenMeta: {
      status: "ok",
      name: "Clean",
      symbol: "CLN",
      decimals: 18,
    },
    liquiditySize: {
      status: "ok",
      reserveWokb: (50n * 10n ** 18n).toString(),
      reserveWokbFormatted: "50.00",
      thin: false,
    },
    proxy: {
      status: "ok",
      isProxy: false,
      kind: null,
      implementation: null,
      admin: null,
    },
    tradingLimits: {
      status: "ok",
      maxTx: null,
      maxWallet: null,
      paused: false,
      tradingOpen: true,
      mintCallable: false,
      blacklistCallable: false,
    },
    ownerDeployer: {
      status: "ok",
      owner: "0x0000000000000000000000000000000000000000",
      deployer: "0x0000000000000000000000000000000000000002",
      sameWallet: false,
      ownerIsContract: false,
    },
    transferTax: {
      status: "ok",
      transferTax: 0,
      reverted: false,
      method: "pair-transfer",
    },
    buySell: {
      status: "ok",
      buyOk: true,
      sellOk: true,
      buyTax: 1,
      sellTax: 1,
    },
    ...over,
  };
}

describe("scoreFromFindings", () => {
  it("rates a clean verified token as low risk", () => {
    const score = scoreFromFindings(base());
    assert.ok(score.overall < 34, `expected low, got ${score.overall}`);
  });

  it("rates a honeypot as high risk even if other checks look fine", () => {
    const score = scoreFromFindings(
      base({
        honeypotCheck: {
          status: "ok",
          isHoneypot: true,
          buyTax: 0,
          sellTax: 99,
          buyReverted: false,
          sellReverted: true,
        },
      }),
    );
    assert.ok(score.overall >= 67, `expected high, got ${score.overall}`);
  });

  it("rates an unverified concentrated unlocked token as at least medium", () => {
    const score = scoreFromFindings(
      base({
        verifiedContract: { status: "ok", verified: false },
        ownershipStatus: {
          status: "ok",
          hasOwnerFunction: false,
          owner: null,
          renounced: false,
          hasMint: false,
          hasBlacklist: false,
          hasPause: false,
          source: null,
        },
        lpLockStatus: {
          status: "unknown",
          locked: null,
          lockedPercent: null,
        },
        holderConcentration: {
          status: "ok",
          top10Percent: 100,
          method: "transfer-logs",
        },
        deployerHistory: {
          status: "unknown",
          deployer: null,
          contractsCreated: null,
          stillLiquid: null,
          abandoned: null,
        },
      }),
    );
    assert.ok(score.overall >= 34, `expected not-low, got ${score.overall}`);
  });

  it("rates a minting owner plus unlocked LP as high risk", () => {
    const score = scoreFromFindings(
      base({
        verifiedContract: { status: "ok", verified: false },
        ownershipStatus: {
          status: "ok",
          hasOwnerFunction: true,
          owner: "0x0000000000000000000000000000000000000003",
          renounced: false,
          hasMint: true,
          hasBlacklist: true,
          hasPause: false,
          source: "abi",
        },
        lpLockStatus: { status: "ok", locked: false, lockedPercent: 0 },
        holderConcentration: {
          status: "ok",
          top10Percent: 80,
          method: "transfer-logs",
        },
        deployerHistory: {
          status: "ok",
          deployer: "0x0000000000000000000000000000000000000003",
          contractsCreated: 6,
          stillLiquid: 1,
          abandoned: 4,
        },
      }),
    );
    assert.ok(score.overall >= 67, `expected high, got ${score.overall}`);
  });

  it("labels missing pool data as unknown, not fail", () => {
    const checks = checksFromFindings(
      base({
        liquiditySize: {
          status: "unknown",
          thin: null,
          error: "no WOKB Uniswap V2 pair with reserves",
        },
      }),
    );
    const pool = checks.find((check) => check.key === "liquiditySize");
    assert.equal(pool?.outcome, "unknown");
  });

  it("treats a failed buy/sell simulation as high risk", () => {
    const score = scoreFromFindings(
      base({
        buySell: {
          status: "ok",
          buyOk: true,
          sellOk: false,
          buyTax: 0,
          sellTax: null,
        },
      }),
    );
    assert.ok(score.overall >= 67, `expected high, got ${score.overall}`);
  });
});
