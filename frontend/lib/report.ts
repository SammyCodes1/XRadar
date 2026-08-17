import type {
  FindingOutcome,
  ReportCheck,
  ReportCheckKey,
  RiskFlags,
  RiskScore,
} from "@xradar/shared";

export type DecodedRiskReport = {
  summary?: string;
  flags?: RiskFlags;
  score?: RiskScore;
  checks?: ReportCheck[];
  generatedAt?: string;
  model?: string;
  token?: {
    symbol?: string;
    name?: string;
    address?: string;
    decimals?: number;
    poolOkb?: string;
  };
};

const NEW_CHECK_KEYS: ReportCheckKey[] = [
  "liquiditySize",
  "proxy",
  "tradingLimits",
  "ownerDeployer",
  "transferTax",
  "buySell",
];

export function isLegacyReport(report: DecodedRiskReport): boolean {
  const keys = new Set((report.checks ?? []).map((check) => check.key));
  if (keys.size === 0) {
    return !report.flags?.thinLiquidity && !report.flags?.buySellBlocked;
  }
  return NEW_CHECK_KEYS.some((key) => !keys.has(key));
}

export function isLegacyReportUri(uri: string): boolean {
  return isLegacyReport(decodeReportUri(uri));
}

export const CHECK_ORDER: ReportCheckKey[] = [
  "verified",
  "ownership",
  "honeypot",
  "lpLock",
  "liquiditySize",
  "holders",
  "deployer",
  "proxy",
  "tradingLimits",
  "ownerDeployer",
  "transferTax",
  "buySell",
];

export const CHECK_LABEL: Record<ReportCheckKey, string> = {
  verified: "Verified contract",
  ownership: "Ownership status",
  honeypot: "Honeypot result",
  lpLock: "LP lock status",
  holders: "Holder concentration",
  deployer: "Deployer history",
  liquiditySize: "Pool size",
  proxy: "Proxy / implementation",
  tradingLimits: "Trading limits",
  ownerDeployer: "Owner vs deployer",
  transferTax: "Pair transfer tax",
  buySell: "Buy then sell",
};

export function decodeReportUri(uri: string): DecodedRiskReport {
  if (!uri) return {};
  if (!uri.startsWith("data:application/json")) return {};
  try {
    const comma = uri.indexOf(",");
    if (comma < 0) return {};
    const meta = uri.slice(0, comma);
    const payload = uri.slice(comma + 1);
    const json = meta.includes(";base64")
      ? JSON.parse(atob(payload))
      : JSON.parse(decodeURIComponent(payload));
    return json as DecodedRiskReport;
  } catch {
    return {};
  }
}

function flagTriggered(
  flags: RiskFlags | undefined,
  key: keyof RiskFlags,
): boolean | undefined {
  const flag = flags?.[key];
  if (!flag) return undefined;
  return flag.triggered;
}

function flagDetail(
  flags: RiskFlags | undefined,
  key: keyof RiskFlags,
): string | undefined {
  return flags?.[key]?.detail;
}

function parseTop10(detail?: string): string | undefined {
  const match = detail?.match(/top10\s*=\s*([\d.]+)\s*%/i);
  if (!match) return undefined;
  return `Top 10 holders: ${match[1]}% of supply`;
}

function deriveChecks(report: DecodedRiskReport): ReportCheck[] {
  const flags = report.flags;
  const unverified = flagTriggered(flags, "unverifiedSource");
  const honeypot = flagTriggered(flags, "honeypot");
  const highTax = flagTriggered(flags, "highTax");
  const mint = flagTriggered(flags, "hiddenMint");
  const blacklist = flagTriggered(flags, "blacklist");
  const pause = flagTriggered(flags, "ownerCanPause");
  const renounced = flagTriggered(flags, "renouncedOwnership");
  const unlocked = flagTriggered(flags, "liquidityUnlocked");
  const concentrated = flagTriggered(flags, "concentratedHolders");
  const deployerFlag = flagTriggered(flags, "recentDeploy");
  const thin = flagTriggered(flags, "thinLiquidity");
  const proxy = flagTriggered(flags, "proxyUpgradeable");
  const limited = flagTriggered(flags, "tradingLimited");
  const ownerDiff = flagTriggered(flags, "ownerNotDeployer");
  const transferTax = flagTriggered(flags, "transferTax");
  const buySell = flagTriggered(flags, "buySellBlocked");

  const ownerParts = [
    renounced
      ? "Ownership renounced"
      : renounced === false
        ? "Owner still active"
        : null,
    mint ? "Mint function present" : null,
    blacklist ? "Blacklist-style function" : null,
    pause ? "Owner can pause" : null,
  ].filter(Boolean);

  const checks: ReportCheck[] = [
    {
      key: "verified",
      label: CHECK_LABEL.verified,
      outcome:
        unverified === undefined ? "unknown" : unverified ? "fail" : "pass",
      value:
        flagDetail(flags, "unverifiedSource") ??
        (unverified
          ? "Source not verified on explorer"
          : unverified === false
            ? "Source verified on explorer"
            : "Verification not in this report"),
    },
    {
      key: "ownership",
      label: CHECK_LABEL.ownership,
      outcome:
        mint || blacklist
          ? "fail"
          : renounced
            ? "pass"
            : renounced === undefined && !mint && !blacklist && !pause
              ? "unknown"
              : "warning",
      value:
        ownerParts.length > 0
          ? ownerParts.join("; ")
          : "Ownership details not in this report",
    },
    {
      key: "honeypot",
      label: CHECK_LABEL.honeypot,
      outcome: honeypot
        ? "fail"
        : highTax
          ? "warning"
          : honeypot === false
            ? "pass"
            : "unknown",
      value:
        flagDetail(flags, "honeypot") ??
        (honeypot
          ? "Buy or sell reverted (honeypot)"
          : highTax
            ? "High buy/sell tax"
            : honeypot === false
              ? "Not a honeypot"
              : "Honeypot check not in this report"),
    },
    {
      key: "lpLock",
      label: CHECK_LABEL.lpLock,
      outcome:
        unlocked === undefined ? "unknown" : unlocked ? "fail" : "pass",
      value:
        flagDetail(flags, "liquidityUnlocked") ??
        (unlocked
          ? "LP unlocked"
          : unlocked === false
            ? "LP locked"
            : "LP lock not in this report"),
    },
    {
      key: "holders",
      label: CHECK_LABEL.holders,
      outcome:
        concentrated === undefined
          ? "unknown"
          : concentrated
            ? "fail"
            : "pass",
      value:
        parseTop10(flagDetail(flags, "concentratedHolders")) ??
        flagDetail(flags, "concentratedHolders") ??
        (concentrated
          ? "Top holders are concentrated"
          : concentrated === false
            ? "Holder concentration is moderate"
            : "Holder data not in this report"),
    },
    {
      key: "deployer",
      label: CHECK_LABEL.deployer,
      outcome:
        deployerFlag === undefined ? "unknown" : deployerFlag ? "fail" : "pass",
      value:
        flagDetail(flags, "recentDeploy") ??
        "Deployer history not in this report",
    },
    {
      key: "liquiditySize",
      label: CHECK_LABEL.liquiditySize,
      outcome: thin === undefined ? "unknown" : thin ? "fail" : "pass",
      value:
        flagDetail(flags, "thinLiquidity") ??
        (report.token?.poolOkb
          ? `${report.token.poolOkb} OKB in the WOKB pair`
          : "Pool size not in this report"),
    },
    {
      key: "proxy",
      label: CHECK_LABEL.proxy,
      outcome: proxy === undefined ? "unknown" : proxy ? "warning" : "pass",
      value:
        flagDetail(flags, "proxyUpgradeable") ??
        (proxy
          ? "Upgradeable proxy detected"
          : proxy === false
            ? "No proxy detected"
            : "Proxy data not in this report"),
    },
    {
      key: "tradingLimits",
      label: CHECK_LABEL.tradingLimits,
      outcome: limited === undefined ? "unknown" : limited ? "fail" : "pass",
      value:
        flagDetail(flags, "tradingLimited") ??
        (limited
          ? "Trading limits or callable mint/blacklist"
          : "Trading limit data not in this report"),
    },
    {
      key: "ownerDeployer",
      label: CHECK_LABEL.ownerDeployer,
      outcome: ownerDiff === undefined ? "unknown" : "warning",
      value:
        flagDetail(flags, "ownerNotDeployer") ??
        "Owner vs deployer not in this report",
    },
    {
      key: "transferTax",
      label: CHECK_LABEL.transferTax,
      outcome:
        transferTax === undefined ? "unknown" : transferTax ? "fail" : "pass",
      value:
        flagDetail(flags, "transferTax") ??
        "Pair transfer tax not in this report",
    },
    {
      key: "buySell",
      label: CHECK_LABEL.buySell,
      outcome: buySell === undefined ? "unknown" : buySell ? "fail" : "pass",
      value:
        flagDetail(flags, "buySellBlocked") ??
        "Buy/sell simulation not in this report",
    },
  ];

  return checks;
}

export function checksForReport(report: DecodedRiskReport): ReportCheck[] {
  if (report.checks && report.checks.length > 0) {
    const byKey = new Map(report.checks.map((check) => [check.key, check]));
    return CHECK_ORDER.map(
      (key) =>
        byKey.get(key) ?? {
          key,
          label: CHECK_LABEL[key],
          outcome: "unknown" as FindingOutcome,
          value: "Not published in this report",
        },
    );
  }
  return deriveChecks(report);
}
