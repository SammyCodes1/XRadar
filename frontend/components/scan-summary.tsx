import { arrangeScanSummary } from "../lib/scan-summary";

type FlagLike = {
  triggered?: boolean;
  detail?: string;
};

export function ScanSummary({
  summary,
  flags,
  empty = "No summary was stored in the on-chain report.",
}: {
  summary?: string;
  flags?: Record<string, FlagLike>;
  empty?: string;
}) {
  const { facts, prose } = arrangeScanSummary(summary, flags);

  if (facts.length === 0 && !prose) {
    return <p className="text-sm leading-6 text-ink-muted">{empty}</p>;
  }

  return (
    <div className="space-y-4">
      {facts.length > 0 ? (
        <dl className="grid grid-cols-1 gap-x-10 gap-y-3 sm:grid-cols-2">
          {facts.map((fact) => (
            <div key={fact.label}>
              <dt className="text-[11px] text-ink-muted">{fact.label}</dt>
              <dd className="mt-1 text-sm leading-6 text-ink">{fact.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      {prose ? (
        <p className="max-w-[65ch] text-sm leading-6 text-ink">{prose}</p>
      ) : null}
    </div>
  );
}
