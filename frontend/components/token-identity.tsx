import { tokenDisplayName } from "../lib/format";

export function TokenIdentity({
  symbol,
  name,
  decimals,
  poolOkb,
  align = "left",
}: {
  symbol?: string;
  name?: string;
  decimals?: number;
  poolOkb?: string;
  align?: "left" | "right";
}) {
  const title = tokenDisplayName(symbol, name, "");
  const bits = [
    decimals != null ? `${decimals} decimals` : null,
    poolOkb ? `Pool ${poolOkb} OKB` : null,
  ].filter(Boolean);

  if (!title && bits.length === 0) return null;

  return (
    <div className={align === "right" ? "sm:text-right" : ""}>
      {title ? (
        <p className="truncate text-sm font-medium text-ink">{title}</p>
      ) : null}
      {bits.length > 0 ? (
        <p className="mt-1 text-xs text-ink-muted">{bits.join(" · ")}</p>
      ) : null}
    </div>
  );
}
