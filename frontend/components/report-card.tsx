import type { ReportCheck } from "@xradar/shared";
import { riskLabel, riskLevel, shortenAddress } from "../lib/format";
import { ScoreGauge } from "./score-gauge";

export function ReportCard({
  address,
  network,
  score,
  symbol,
  name,
  decimals,
  poolOkb,
  scannedLabel,
  checks,
}: {
  address: string;
  network: string;
  score: number;
  symbol?: string;
  name?: string;
  decimals?: number;
  poolOkb?: string;
  scannedLabel?: string;
  checks: ReportCheck[];
}) {
  const title = [symbol, name].filter(Boolean).join(" ") || shortenAddress(address);
  const facts = checks.slice(0, 4);
  const level = riskLevel(score);

  return (
    <article className="scan-bezel">
      <div className="scan-well p-6 sm:p-8">
        <p className="text-[11px] text-ink-muted">XRadar · X Layer {network}</p>
        <div className="mt-5 grid items-center gap-6 sm:grid-cols-[auto_minmax(0,1fr)]">
          <ScoreGauge score={score} />
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight text-ink">{title}</h1>
            <p className="mt-1 font-mono text-sm text-ink-muted">
              {shortenAddress(address)}
            </p>
            <p className="mt-3 text-sm text-ink">
              {riskLabel(level)}
              {scannedLabel ? ` · ${scannedLabel}` : ""}
            </p>
            <p className="mt-1 text-xs text-ink-muted">
              {[
                decimals != null ? `${decimals} decimals` : null,
                poolOkb ? `Pool ${poolOkb} OKB` : null,
              ]
                .filter(Boolean)
                .join(" · ") || "Screener snapshot from RiskRegistry"}
            </p>
          </div>
        </div>
        {facts.length > 0 ? (
          <dl className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {facts.map((check) => (
              <div key={check.key}>
                <dt className="text-[11px] text-ink-muted">{check.label}</dt>
                <dd className="mt-1 text-sm leading-6 text-ink">{check.value}</dd>
              </div>
            ))}
          </dl>
        ) : null}
        <p className="mt-6 text-xs text-ink-faint">
          This is a screener, not an audit. Unknown means the check could not finish.
        </p>
      </div>
    </article>
  );
}
