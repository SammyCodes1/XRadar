"use client";

import {
  CheckCircle,
  MinusCircle,
  WarningCircle,
  XCircle,
} from "@phosphor-icons/react";
import type { FindingOutcome, ReportCheck } from "@xradar/shared";
import { CopyableText } from "./copyable-text";

const OUTCOME_STYLE: Record<
  FindingOutcome,
  { wrap: string; label: string }
> = {
  pass: {
    wrap: "text-risk-low",
    label: "Pass",
  },
  fail: {
    wrap: "text-risk-high",
    label: "Fail",
  },
  warning: {
    wrap: "text-accent",
    label: "Warning",
  },
  unknown: {
    wrap: "text-ink-muted",
    label: "Unknown",
  },
};

function OutcomeIcon({ outcome }: { outcome: FindingOutcome }) {
  if (outcome === "pass") {
    return <CheckCircle className="size-5 shrink-0" weight="fill" />;
  }
  if (outcome === "fail") {
    return <XCircle className="size-5 shrink-0" weight="fill" />;
  }
  if (outcome === "unknown") {
    return <MinusCircle className="size-5 shrink-0" weight="regular" />;
  }
  return <WarningCircle className="size-5 shrink-0" weight="fill" />;
}

export function FindingList({ checks }: { checks: ReportCheck[] }) {
  return (
    <ul className="divide-y divide-line">
      {checks.map((check) => {
        const style = OUTCOME_STYLE[check.outcome] ?? OUTCOME_STYLE.unknown;
        return (
          <li key={check.key} className="flex items-start gap-3 py-3.5 first:pt-0 last:pb-0">
            <span className={`mt-0.5 ${style.wrap}`} aria-hidden>
              <OutcomeIcon outcome={check.outcome} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-medium text-ink">{check.label}</p>
                <span className={`text-[11px] ${style.wrap}`}>{style.label}</span>
              </div>
              <div className="mt-1">
                <CopyableText
                  text={check.value}
                  className="text-sm leading-6 text-ink-muted"
                />
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
