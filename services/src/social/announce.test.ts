import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import type { Address } from "viem";
import type { RiskReport } from "@xradar/shared";
import { announcePublishedToken } from "./announce";
import {
  composeAlertTweet,
  shouldAnnounceAlert,
  topRiskFlags,
  truncateAddress,
} from "./composeAlert";
import { percentEncode } from "./oauth1";
import { FileAlertStore, alreadyPosted } from "./store";

const token = "0xD44Dec3B0617Fb707D4101814a51a6741469cebe" as Address;

function report(flags: RiskReport["flags"]): RiskReport {
  return {
    scanId: "test",
    token: { address: token, chainId: 1952 },
    flags,
    score: { overall: 81, liquidity: 10, contract: 10, holders: 10, social: 10 },
    summary: "test",
    generatedAt: new Date().toISOString(),
  };
}

describe("composeAlertTweet", () => {
  it("includes truncated address, score, top flags, and detail link", () => {
    const text = composeAlertTweet({
      token,
      score: 81,
      chain: "testnet",
      frontendBaseUrl: "https://xradar.example",
      report: report({
        honeypot: {
          key: "honeypot",
          label: "Honeypot",
          severity: "critical",
          triggered: true,
        },
        liquidityUnlocked: {
          key: "liquidityUnlocked",
          label: "LP unlocked",
          severity: "high",
          triggered: true,
        },
        unverifiedSource: {
          key: "unverifiedSource",
          label: "Unverified source",
          severity: "medium",
          triggered: true,
        },
      }),
    });
    assert.equal(text.includes(truncateAddress(token)), true);
    assert.equal(text.includes("score 81"), true);
    assert.equal(text.includes("Honeypot"), true);
    assert.equal(text.includes("LP unlocked"), true);
    assert.equal(
      text.includes(
        "https://xradar.example/token/0xD44Dec3B0617Fb707D4101814a51a6741469cebe?chain=testnet",
      ),
      true,
    );
    assert.equal(text.includes("Unverified source"), false);
    assert.ok(text.length <= 280);
  });

  it("ranks critical flags first", () => {
    const flags = topRiskFlags(
      report({
        concentratedHolders: {
          key: "concentratedHolders",
          label: "Concentrated holders",
          severity: "medium",
          triggered: true,
        },
        honeypot: {
          key: "honeypot",
          label: "Honeypot",
          severity: "critical",
          triggered: true,
        },
      }),
    );
    assert.equal(flags[0]?.key, "honeypot");
  });
});

describe("shouldAnnounceAlert", () => {
  it("fires at score 70+ or honeypot", () => {
    assert.equal(shouldAnnounceAlert({ score: 70 }), true);
    assert.equal(shouldAnnounceAlert({ score: 69 }), false);
    assert.equal(
      shouldAnnounceAlert({
        score: 24,
        report: report({
          honeypot: {
            key: "honeypot",
            label: "Honeypot",
            severity: "critical",
            triggered: true,
          },
        }),
      }),
      true,
    );
  });
});

describe("alert store", () => {
  it("blocks a second post for the same token", async () => {
    const dir = await mkdtemp(join(tmpdir(), "xradar-alerts-"));
    const store = new FileAlertStore(join(dir, "alerts.json"));
    await store.save({
      posts: [
        {
          token,
          score: 81,
          tweetId: "1",
          postedAt: new Date().toISOString(),
          reason: "score",
        },
      ],
    });
    const loaded = await store.load();
    assert.equal(alreadyPosted(loaded.posts, token), true);
    assert.equal(
      alreadyPosted(loaded.posts, "0x0000000000000000000000000000000000000001"),
      false,
    );
    await rm(dir, { recursive: true, force: true });
  });
});

describe("announcePublishedToken", () => {
  it("skips below-threshold publishes", async () => {
    const result = await announcePublishedToken({
      token,
      chain: "testnet",
      score: 24,
      report: report({}),
      dryRun: true,
    });
    assert.equal(result.status, "skipped");
    assert.equal(result.reason, "below-threshold");
  });

  it("dry-runs a high-risk compose without posting", async () => {
    const result = await announcePublishedToken({
      token,
      chain: "testnet",
      score: 81,
      report: report({
        honeypot: {
          key: "honeypot",
          label: "Honeypot",
          severity: "critical",
          triggered: true,
        },
      }),
      dryRun: true,
    });
    assert.equal(result.status, "skipped");
    assert.equal(result.reason, "dry-run");
    assert.match(result.text ?? "", /score 81/);
  });
});

describe("oauth1", () => {
  it("percent-encodes reserved characters", () => {
    assert.equal(percentEncode("a b"), "a%20b");
    assert.equal(percentEncode("!*"), "%21%2A");
  });
});
