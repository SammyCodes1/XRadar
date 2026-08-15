import { riskLabel, riskLevel } from "../lib/format";

const TONE = {
  low: "text-risk-low",
  medium: "text-accent",
  high: "text-risk-high",
} as const;

export function ScanScore({
  score,
  size = "md",
}: {
  score: number;
  size?: "md" | "lg";
}) {
  const level = riskLevel(score);
  return (
    <div className="min-w-[4.5rem]">
      <p
        className={`font-mono font-semibold tabular-nums tracking-tight ${TONE[level]} ${
          size === "lg" ? "text-[2.5rem] leading-none" : "text-[2rem] leading-none"
        }`}
      >
        {score}
      </p>
      <p className="mt-1.5 text-[11px] leading-none text-ink-muted">{riskLabel(level)}</p>
    </div>
  );
}
