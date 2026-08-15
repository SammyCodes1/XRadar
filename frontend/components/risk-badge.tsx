import { riskLabel, riskLevel } from "../lib/format";

const LEVEL_CLASS = {
  low: "bg-risk-low/15 text-risk-low ring-risk-low/30",
  medium: "bg-accent/15 text-accent ring-accent/35",
  high: "bg-risk-high/15 text-risk-high ring-risk-high/35",
} as const;

export function RiskBadge({ score }: { score: number }) {
  const level = riskLevel(score);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 font-mono text-xs font-medium ring-1 ring-inset ${LEVEL_CLASS[level]}`}
    >
      <span className="tabular-nums">{score}</span>
      <span className="hidden font-sans font-normal sm:inline">
        {riskLabel(level)}
      </span>
    </span>
  );
}
