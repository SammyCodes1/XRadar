import { riskLabel, riskLevel } from "../lib/format";

export function ScoreGauge({ score }: { score: number }) {
  const level = riskLevel(score);
  const radius = 58;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - Math.min(100, Math.max(0, score)) / 100);
  const stroke =
    level === "high"
      ? "var(--risk-high)"
      : level === "medium"
        ? "var(--accent)"
        : "var(--risk-low)";

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative size-40">
        <svg viewBox="0 0 140 140" className="size-full -rotate-90">
          <circle
            cx="70"
            cy="70"
            r={radius}
            fill="none"
            stroke="rgba(var(--ink-rgb), 0.12)"
            strokeWidth="10"
          />
          <circle
            cx="70"
            cy="70"
            r={radius}
            fill="none"
            stroke={stroke}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-mono text-4xl font-semibold tabular-nums text-ink">
            {score}
          </span>
          <span className="text-[11px] text-ink-muted">/ 100</span>
        </div>
      </div>
      <p className="text-sm text-ink">{riskLabel(level)}</p>
    </div>
  );
}
