/**
 *   npm run x:announce -- --token 0x... --chain testnet --dry-run
 *   npm run x:announce -- --token 0x... --score 81 --flags honeypot,liquidityUnlocked
 */
import type { Address } from "viem";
import type { RiskFlag, RiskFlagKey, RiskReport } from "@xradar/shared";
import { getNetwork } from "@xradar/shared";
import { announcePublishedToken } from "./announce.js";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  if (i === -1) return undefined;
  return process.argv[i + 1];
}

const token = (arg("token") ??
  "0xD44Dec3B0617Fb707D4101814a51a6741469cebe") as Address;
const chainArg = arg("chain");
if (chainArg !== "mainnet" && chainArg !== "testnet") {
  throw new Error("Pass --chain testnet or --chain mainnet");
}
const chain = chainArg;
const score = Number(arg("score") ?? 81);
const dryRun = process.argv.includes("--dry-run");
const flagKeys = (arg("flags") ?? "honeypot").split(",").filter(Boolean);

const FLAG_META: Partial<
  Record<RiskFlagKey, Pick<RiskFlag, "label" | "severity">>
> = {
  honeypot: { label: "Honeypot", severity: "critical" },
  liquidityUnlocked: { label: "LP unlocked", severity: "high" },
  hiddenMint: { label: "Mint function present", severity: "high" },
  unverifiedSource: { label: "Unverified source", severity: "medium" },
  concentratedHolders: { label: "Concentrated holders", severity: "medium" },
};

const flags: RiskReport["flags"] = {};
for (const key of flagKeys) {
  const typed = key.trim() as RiskFlagKey;
  const meta = FLAG_META[typed];
  flags[typed] = {
    key: typed,
    label: meta?.label ?? typed,
    severity: meta?.severity ?? "high",
    triggered: true,
  };
}

const report: RiskReport = {
  scanId: "cli",
  token: { address: token, chainId: chain === "mainnet" ? getNetwork("mainnet").chainId : getNetwork("testnet").chainId },
  flags,
  score: {
    overall: score,
    liquidity: score,
    contract: score,
    holders: score,
    social: 50,
  },
  summary: "cli",
  generatedAt: new Date().toISOString(),
};

const result = await announcePublishedToken({
  token,
  chain,
  score,
  report,
  dryRun,
});
console.log(JSON.stringify(result, null, 2));
