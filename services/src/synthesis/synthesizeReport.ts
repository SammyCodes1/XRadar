import type {
  ReportCheck,
  RiskFindings,
  RiskFlags,
  RiskReport,
  RiskScore,
} from "@xradar/shared";
import { env } from "../lib/env";

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function flagsFromFindings(findings: RiskFindings): RiskFlags {
  const flags: RiskFlags = {};
  const honeypot = findings.honeypotCheck.isHoneypot === true;
  flags.honeypot = {
    key: "honeypot",
    label: "Honeypot",
    severity: "critical",
    triggered: honeypot,
    detail:
      findings.honeypotCheck.error ??
      (honeypot
        ? "Buy or sell reverted"
        : `buyTax=${findings.honeypotCheck.buyTax ?? "?"}% sellTax=${findings.honeypotCheck.sellTax ?? "?"}%`),
  };
  flags.highTax = {
    key: "highTax",
    label: "High buy/sell tax",
    severity: "high",
    triggered:
      (findings.honeypotCheck.buyTax ?? 0) >= 20 ||
      (findings.honeypotCheck.sellTax ?? 0) >= 20,
  };
  flags.hiddenMint = {
    key: "hiddenMint",
    label: "Mint function present",
    severity: "high",
    triggered: findings.ownershipStatus.hasMint === true,
  };
  flags.blacklist = {
    key: "blacklist",
    label: "Blacklist-style function",
    severity: "high",
    triggered: findings.ownershipStatus.hasBlacklist === true,
  };
  flags.ownerCanPause = {
    key: "ownerCanPause",
    label: "Pausable",
    severity: "medium",
    triggered: findings.ownershipStatus.hasPause === true,
  };
  flags.renouncedOwnership = {
    key: "renouncedOwnership",
    label: "Ownership renounced",
    severity: "info",
    triggered: findings.ownershipStatus.renounced === true,
  };
  flags.unverifiedSource = {
    key: "unverifiedSource",
    label: "Unverified source",
    severity: "medium",
    triggered: findings.verifiedContract.verified === false,
    detail: findings.verifiedContract.verified
      ? findings.verifiedContract.contractName
        ? `verified ${findings.verifiedContract.contractName}`
        : "verified"
      : (findings.verifiedContract.error ?? "source not verified"),
  };
  flags.liquidityUnlocked = {
    key: "liquidityUnlocked",
    label: "LP unlocked",
    severity: "high",
    triggered: findings.lpLockStatus.locked === false,
    detail:
      findings.lpLockStatus.locked === true
        ? `locked=${findings.lpLockStatus.lockedPercent ?? "?"}%`
        : findings.lpLockStatus.locked === false
          ? "LP unlocked"
          : (findings.lpLockStatus.error ?? "LP lock unknown"),
  };
  flags.concentratedHolders = {
    key: "concentratedHolders",
    label: "Concentrated holders",
    severity: "medium",
    triggered: (findings.holderConcentration.top10Percent ?? 0) >= 50,
    detail:
      findings.holderConcentration.top10Percent != null
        ? `top10=${findings.holderConcentration.top10Percent}%`
        : findings.holderConcentration.error,
  };
  flags.recentDeploy = {
    key: "recentDeploy",
    label: "Deployer history",
    severity: "medium",
    triggered: (findings.deployerHistory.abandoned ?? 0) >= 3,
    detail: findings.deployerHistory.deployer
      ? `deployer=${findings.deployerHistory.deployer}; created=${findings.deployerHistory.contractsCreated ?? "?"}; abandoned=${findings.deployerHistory.abandoned ?? "?"}`
      : findings.deployerHistory.error,
  };
  return flags;
}

function shortAddr(value: string | null | undefined): string {
  if (!value || value.length < 12) return value ?? "unknown";
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

function checksFromFindings(findings: RiskFindings): ReportCheck[] {
  const verified = findings.verifiedContract;
  const ownership = findings.ownershipStatus;
  const honeypot = findings.honeypotCheck;
  const lp = findings.lpLockStatus;
  const holders = findings.holderConcentration;
  const deployer = findings.deployerHistory;

  const ownerBits = [
    ownership.renounced
      ? "Ownership renounced"
      : ownership.owner
        ? `Owner ${shortAddr(ownership.owner)}`
        : "No owner() found",
    ownership.hasMint ? "mint present" : null,
    ownership.hasBlacklist ? "blacklist present" : null,
    ownership.hasPause ? "pausable" : null,
  ].filter(Boolean);

  return [
    {
      key: "verified",
      label: "Verified contract",
      outcome:
        verified.status === "unknown"
          ? "warning"
          : verified.verified
            ? "pass"
            : "fail",
      value: verified.verified
        ? verified.contractName
          ? `Verified as ${verified.contractName}`
          : "Source verified on explorer"
        : (verified.error ?? "Source not verified on explorer"),
    },
    {
      key: "ownership",
      label: "Ownership status",
      outcome:
        ownership.status === "unknown"
          ? "warning"
          : ownership.hasMint || ownership.hasBlacklist
            ? "fail"
            : ownership.renounced
              ? "pass"
              : "warning",
      value: ownerBits.join("; "),
    },
    {
      key: "honeypot",
      label: "Honeypot result",
      outcome:
        honeypot.status === "unknown"
          ? "warning"
          : honeypot.isHoneypot
            ? "fail"
            : (honeypot.buyTax ?? 0) >= 20 || (honeypot.sellTax ?? 0) >= 20
              ? "warning"
              : "pass",
      value: honeypot.isHoneypot
        ? (honeypot.error ?? "Buy or sell reverted (honeypot)")
        : `Buy tax ${honeypot.buyTax ?? "?"}%, sell tax ${honeypot.sellTax ?? "?"}%`,
    },
    {
      key: "lpLock",
      label: "LP lock status",
      outcome:
        lp.status === "unknown" || lp.locked == null
          ? "warning"
          : lp.locked
            ? "pass"
            : "fail",
      value:
        lp.locked === true
          ? `LP locked: ${lp.lockedPercent ?? "?"}% of LP supply`
          : lp.locked === false
            ? "LP unlocked"
            : (lp.error ?? "LP lock unknown"),
    },
    {
      key: "holders",
      label: "Holder concentration",
      outcome:
        holders.top10Percent == null
          ? "warning"
          : holders.top10Percent >= 50
            ? "fail"
            : holders.top10Percent >= 30
              ? "warning"
              : "pass",
      value:
        holders.top10Percent != null
          ? `Top 10 holders: ${holders.top10Percent}% of supply`
          : (holders.error ?? "Holder data unavailable"),
    },
    {
      key: "deployer",
      label: "Deployer history",
      outcome:
        deployer.status === "unknown" || !deployer.deployer
          ? "warning"
          : (deployer.abandoned ?? 0) >= 3
            ? "fail"
            : "pass",
      value: deployer.deployer
        ? `Deployer ${shortAddr(deployer.deployer)}; ${deployer.contractsCreated ?? "?"} contracts created, ${deployer.abandoned ?? "?"} abandoned`
        : (deployer.error ?? "Deployer unknown"),
    },
  ];
}

/**
 * Higher number = more risk. Matches dashboard badges and X alerts
 * (low < 34, medium < 67, high >= 67).
 */
export function scoreFromFindings(findings: RiskFindings): RiskScore {
  const ownerActive =
    findings.ownershipStatus.renounced !== true &&
    (findings.ownershipStatus.hasOwnerFunction === true ||
      findings.ownershipStatus.owner != null);

  let contract = 24;
  if (findings.verifiedContract.verified === true) contract = 12;
  else if (findings.verifiedContract.verified === false) contract = 32;
  if (findings.ownershipStatus.hasMint) contract += ownerActive ? 28 : 10;
  if (findings.ownershipStatus.hasBlacklist) contract += ownerActive ? 24 : 8;
  if (findings.ownershipStatus.hasPause) contract += ownerActive ? 12 : 4;
  if (findings.ownershipStatus.renounced === true) contract -= 10;
  else if (ownerActive) contract += 8;
  contract = clamp(contract);

  let liquidity: number;
  if (
    findings.lpLockStatus.status === "unknown" ||
    findings.lpLockStatus.locked == null
  ) {
    liquidity = 52;
  } else if (findings.lpLockStatus.locked) {
    const lockedPct = findings.lpLockStatus.lockedPercent ?? 50;
    liquidity = clamp(62 - lockedPct * 0.55);
  } else {
    liquidity = 72;
  }
  const maxTax = Math.max(
    findings.honeypotCheck.buyTax ?? 0,
    findings.honeypotCheck.sellTax ?? 0,
  );
  if (maxTax >= 50) liquidity = clamp(liquidity + 28);
  else if (maxTax >= 20) liquidity = clamp(liquidity + 16);
  else if (maxTax >= 10) liquidity = clamp(liquidity + 8);

  const top10 = findings.holderConcentration.top10Percent;
  let holders: number;
  if (top10 == null) holders = 42;
  else if (top10 >= 90) holders = 92;
  else if (top10 >= 70) holders = 78;
  else if (top10 >= 50) holders = 62;
  else if (top10 >= 30) holders = 38;
  else holders = clamp(8 + top10 * 0.7);

  const abandoned = findings.deployerHistory.abandoned ?? 0;
  let social: number;
  if (
    findings.deployerHistory.status === "unknown" ||
    !findings.deployerHistory.deployer
  ) {
    social = 28;
  } else if (abandoned >= 5) {
    social = 82;
  } else if (abandoned >= 3) {
    social = 64;
  } else {
    social = 18;
  }

  if (findings.honeypotCheck.isHoneypot === true) {
    return {
      overall: 94,
      contract: Math.max(contract, 88),
      liquidity: Math.max(liquidity, 90),
      holders,
      social,
    };
  }

  const overall = clamp(
    contract * 0.32 + liquidity * 0.3 + holders * 0.23 + social * 0.15,
  );
  return {
    overall,
    liquidity: clamp(liquidity),
    contract,
    holders,
    social,
  };
}

function localSummary(findings: RiskFindings, _score: RiskScore): string {
  const source = findings.verifiedContract.verified
    ? "Source is verified."
    : "Source is unverified.";
  const ownership = findings.ownershipStatus.renounced
    ? "Ownership is renounced."
    : findings.ownershipStatus.owner
      ? `Owner is ${findings.ownershipStatus.owner}.`
      : "No owner() on the contract.";
  const liquidity = findings.lpLockStatus.locked
    ? `Liquidity is locked (${findings.lpLockStatus.lockedPercent ?? "?"}%).`
    : "Liquidity lock is unknown or unlocked.";
  const honeypot = findings.honeypotCheck.isHoneypot
    ? "Honeypot detected."
    : "Not a honeypot.";
  return `${source} ${ownership} ${liquidity} ${honeypot}`;
}

async function maybeDeepSeekSummary(
  findings: RiskFindings,
  score: RiskScore,
): Promise<{ summary: string; model?: string }> {
  if (!env.deepseekApiKey) {
    return { summary: localSummary(findings, score), model: "local-heuristic" };
  }
  try {
    const response = await fetch(`${env.deepseekBaseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${env.deepseekApiKey}`,
      },
      body: JSON.stringify({
        model: env.deepseekModel,
        max_tokens: 200,
        thinking: { type: "disabled" },
        messages: [
          {
            role: "user",
            content: `Summarize this X Layer token risk in 2 sentences. JSON: ${JSON.stringify({ findings, score })}`,
          },
        ],
      }),
      signal: AbortSignal.timeout(12_000),
    });
    if (!response.ok) {
      return { summary: localSummary(findings, score), model: "local-heuristic" };
    }
    const body = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const text = body.choices?.[0]?.message?.content?.trim();
    if (!text) {
      return { summary: localSummary(findings, score), model: "local-heuristic" };
    }
    return { summary: text, model: env.deepseekModel };
  } catch {
    return { summary: localSummary(findings, score), model: "local-heuristic" };
  }
}

export async function synthesizeReport(
  findings: RiskFindings,
): Promise<RiskReport> {
  const flags = flagsFromFindings(findings);
  const score = scoreFromFindings(findings);
  const { summary, model } = await maybeDeepSeekSummary(findings, score);
  return {
    scanId: crypto.randomUUID(),
    token: {
      address: findings.token,
      chainId: findings.chainId,
    },
    flags,
    score,
    summary,
    generatedAt: new Date().toISOString(),
    model,
    checks: checksFromFindings(findings),
  };
}
