import type { RiskFlag, RiskReport, XLayerNetwork } from "@xradar/shared";

export const DEFAULT_ALERT_MIN_SCORE = 70;

const SEVERITY_RANK: Record<string, number> = {
  critical: 5,
  high: 4,
  medium: 3,
  low: 2,
  info: 1,
};

export function truncateAddress(address: string): string {
  if (address.length < 12) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function frontendTokenUrl(
  address: string,
  chain: XLayerNetwork,
  baseUrl?: string,
): string {
  const root = (baseUrl ?? process.env.FRONTEND_URL ?? "http://localhost:3000")
    .trim()
    .replace(/\/$/, "");
  return `${root}/token/${address}?chain=${chain}`;
}

export function topRiskFlags(report: RiskReport | undefined, limit = 2): RiskFlag[] {
  if (!report?.flags) return [];
  return Object.values(report.flags)
    .filter((flag): flag is RiskFlag => Boolean(flag?.triggered))
    .filter((flag) => flag.key !== "renouncedOwnership")
    .sort((a, b) => {
      const rank =
        (SEVERITY_RANK[b.severity] ?? 0) - (SEVERITY_RANK[a.severity] ?? 0);
      if (rank !== 0) return rank;
      return a.label.localeCompare(b.label);
    })
    .slice(0, limit);
}

export function shouldAnnounceAlert(input: {
  score: number;
  report?: RiskReport;
  minScore?: number;
}): boolean {
  const min = input.minScore ?? DEFAULT_ALERT_MIN_SCORE;
  if (input.score >= min) return true;
  return input.report?.flags?.honeypot?.triggered === true;
}

export function composeAlertTweet(input: {
  token: string;
  score: number;
  chain: XLayerNetwork;
  report?: RiskReport;
  frontendBaseUrl?: string;
}): string {
  const flags = topRiskFlags(input.report, 2);
  const flagLine =
    flags.length > 0
      ? flags.map((flag) => flag.label).join(", ")
      : "High composite risk";
  const lines = [
    `XRadar high-risk alert on X Layer`,
    `${truncateAddress(input.token)}  score ${input.score}`,
    flagLine,
    frontendTokenUrl(input.token, input.chain, input.frontendBaseUrl),
  ];
  let text = lines.join("\n");
  if (text.length <= 280) return text;
  const shortFlags = flags
    .slice(0, 1)
    .map((flag) => flag.label)
    .join(", ");
  text = [
    `XRadar high-risk alert on X Layer`,
    `${truncateAddress(input.token)}  score ${input.score}`,
    shortFlags || "High composite risk",
    frontendTokenUrl(input.token, input.chain, input.frontendBaseUrl),
  ].join("\n");
  return text.slice(0, 280);
}
