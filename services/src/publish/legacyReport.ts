const NEW_CHECK_KEYS = [
  "liquiditySize",
  "proxy",
  "tradingLimits",
  "ownerDeployer",
  "transferTax",
  "buySell",
] as const;

function decodeReportUri(uri: string): {
  checks?: { key?: string }[];
  flags?: Record<string, unknown>;
} {
  if (!uri || !uri.startsWith("data:application/json")) return {};
  try {
    const comma = uri.indexOf(",");
    if (comma < 0) return {};
    const meta = uri.slice(0, comma);
    const payload = uri.slice(comma + 1);
    const json = meta.includes(";base64")
      ? JSON.parse(Buffer.from(payload, "base64").toString("utf8"))
      : JSON.parse(decodeURIComponent(payload));
    return json as { checks?: { key?: string }[]; flags?: Record<string, unknown> };
  } catch {
    return {};
  }
}

export function isLegacyReportUri(uri: string): boolean {
  const report = decodeReportUri(uri);
  const keys = new Set(
    (report.checks ?? []).map((check) => check.key).filter(Boolean),
  );
  if (keys.size === 0) {
    return !report.flags?.thinLiquidity && !report.flags?.buySellBlocked;
  }
  return NEW_CHECK_KEYS.some((key) => !keys.has(key));
}
