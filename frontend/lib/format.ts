export type RiskLevel = "low" | "medium" | "high";

export function shortenAddress(address: string): string {
  if (address.length < 12) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function riskLevel(score: number): RiskLevel {
  if (score >= 67) return "high";
  if (score >= 34) return "medium";
  return "low";
}

export function riskLabel(level: RiskLevel): string {
  if (level === "high") return "High risk";
  if (level === "medium") return "Medium risk";
  return "Low risk";
}

export function timeSince(unixSeconds: number, nowMs = Date.now()): string {
  if (!unixSeconds) return "Not scanned";
  const delta = Math.max(0, Math.floor(nowMs / 1000) - unixSeconds);
  if (delta < 10) return "just now";
  if (delta < 60) return `${delta}s ago`;
  const minutes = Math.floor(delta / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
