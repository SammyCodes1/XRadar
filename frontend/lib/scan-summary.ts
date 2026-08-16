export type SummaryFact = {
  label: string;
  value: string;
  address?: string;
};

const ADDRESS_RE = /0x[a-fA-F0-9]{40}/;

export function extractAddress(raw?: string): string | undefined {
  if (!raw) return undefined;
  const match = raw.match(ADDRESS_RE);
  return match?.[0];
}

type FlagLike = {
  triggered?: boolean;
  detail?: string;
};

const FACT_ORDER = ["Source", "Ownership", "Liquidity", "Pool", "Honeypot"] as const;

function setFact(
  map: Map<string, string>,
  label: (typeof FACT_ORDER)[number],
  value: string,
) {
  if (!map.has(label)) map.set(label, value);
}

function parseDumpBits(raw: string): Map<string, string> {
  const map = new Map<string, string>();
  const match = raw.match(/XRadar local synthesis:\s*(.+)$/i);
  const body = (match ? match[1] : raw).replace(/\.$/, "");
  if (!body.includes(";") && !/overall\s*=/i.test(body)) return map;

  for (const bit of body.split(";").map((part) => part.trim()).filter(Boolean)) {
    if (/^overall\s*=/i.test(bit)) continue;
    if (bit === "unverified") setFact(map, "Source", "Unverified");
    else if (bit === "verified") setFact(map, "Source", "Verified");
    else if (bit === "renounced") setFact(map, "Ownership", "Renounced");
    else if (bit === "no-owner-fn") setFact(map, "Ownership", "No owner() found");
    else if (bit.startsWith("owner=")) {
      setFact(map, "Ownership", bit.slice("owner=".length));
    } else if (bit === "lp-unlocked-or-unknown") {
      setFact(map, "Liquidity", "Unlocked or unknown");
    } else if (bit.startsWith("lp-locked=")) {
      setFact(map, "Liquidity", `Locked ${bit.slice("lp-locked=".length)}`);
    } else if (bit.toLowerCase() === "not-honeypot") {
      setFact(map, "Honeypot", "Not detected");
    } else if (bit.toLowerCase() === "honeypot") {
      setFact(map, "Honeypot", "Detected");
    }
  }
  return map;
}

function factsFromFlags(
  flags?: Record<string, FlagLike>,
): Map<string, string> {
  const map = new Map<string, string>();
  if (!flags) return map;

  const source = flags.unverifiedSource;
  if (source) {
    setFact(map, "Source", source.triggered ? "Unverified" : "Verified");
  }

  const renounced = flags.renouncedOwnership;
  const ownerAddress =
    extractAddress(renounced?.detail) ??
    extractAddress(flags.ownerNotDeployer?.detail);
  if (renounced?.triggered) {
    setFact(map, "Ownership", "Renounced");
  } else if (ownerAddress) {
    setFact(map, "Ownership", ownerAddress);
  }

  const liquidity = flags.liquidityUnlocked;
  if (liquidity) {
    setFact(
      map,
      "Liquidity",
      liquidity.triggered ? "Unlocked or unknown" : "Locked",
    );
  }

  const honeypot = flags.honeypot;
  if (honeypot) {
    setFact(map, "Honeypot", honeypot.triggered ? "Detected" : "Not detected");
  }

  const pool = flags.thinLiquidity;
  if (pool?.detail) {
    setFact(map, "Pool", pool.detail.includes("OKB") ? pool.detail : `${pool.detail} OKB`);
  }

  return map;
}

export function arrangeScanSummary(
  summary?: string,
  flags?: Record<string, FlagLike>,
): { facts: SummaryFact[]; prose?: string } {
  const map = factsFromFlags(flags);
  if (summary) {
    const ownerInProse = summary.match(/Owner is (0x[a-fA-F0-9]{40})/i);
    if (ownerInProse?.[1]) {
      setFact(map, "Ownership", ownerInProse[1]);
    }
    for (const [label, value] of parseDumpBits(summary)) {
      setFact(map, label as (typeof FACT_ORDER)[number], value);
    }
  }

  const facts = FACT_ORDER.flatMap((label) => {
    const value = map.get(label);
    if (!value) return [];
    const address = label === "Ownership" ? extractAddress(value) : undefined;
    return [{ label, value, address }];
  });

  const isDump =
    Boolean(summary) &&
    (/XRadar local synthesis/i.test(summary!) ||
      (/overall\s*=/i.test(summary!) && summary!.includes(";")));

  return {
    facts,
    prose: !isDump && summary?.trim() ? summary.trim() : undefined,
  };
}
