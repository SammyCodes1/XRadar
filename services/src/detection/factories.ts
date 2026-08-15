import { parseAbiItem, type Address, type Hex } from "viem";

export type DexKind = "uniswap-v2" | "uniswap-v3" | "algebra";

export type DexFactory = {
  name: string;
  kind: DexKind;
  address: Address;
  /** Official docs URL used to confirm the address. */
  source: string;
};

/**
 * DEX factories on X Layer mainnet (chain 196).
 *
 * Uniswap is the preferred DEX on X Layer (Jan 2026). Addresses from
 * https://developers.uniswap.org/docs/protocols/v2/deployments and
 * https://developers.uniswap.org/docs/protocols/v3/deployments/v3-xlayer-deployments
 *
 * QuickSwap Algebra factory also has code on mainnet; included as a V3-style
 * fork. Testnet (1952) has no official factory at these addresses — the
 * scanner skips factories with empty bytecode.
 */
export const XLAYER_MAINNET_FACTORIES: readonly DexFactory[] = [
  {
    name: "Uniswap V2",
    kind: "uniswap-v2",
    address: "0xDf38F24fE153761634Be942F9d859f3DBA857E95",
    source: "https://developers.uniswap.org/docs/protocols/v2/deployments",
  },
  {
    name: "Uniswap V3",
    kind: "uniswap-v3",
    address: "0x4B2ab38DBF28D31D467aA8993f6c2585981D6804",
    source:
      "https://developers.uniswap.org/docs/protocols/v3/deployments/v3-xlayer-deployments",
  },
  {
    name: "QuickSwap Algebra",
    kind: "algebra",
    address: "0xd2480162Aa7F02Ead7BF4C127465446150D58452",
    source: "https://docs.quickswap.exchange/overview/contracts-and-addresses",
  },
];

/** Wrapped OKB — skip as a "new token" when discovered via pair events. */
export const WOKB_MAINNET: Address =
  "0xe538905cf8410324e03A5A23C1c177a474D59b2b";

export const pairCreatedEvent = parseAbiItem(
  "event PairCreated(address indexed token0, address indexed token1, address pair, uint256)",
);

export const poolCreatedV3Event = parseAbiItem(
  "event PoolCreated(address indexed token0, address indexed token1, uint24 indexed fee, int24 tickSpacing, address pool)",
);

export const algebraPoolEvent = parseAbiItem(
  "event Pool(address indexed token0, address indexed token1, address pool)",
);

export function eventForKind(kind: DexKind) {
  if (kind === "uniswap-v2") return pairCreatedEvent;
  if (kind === "uniswap-v3") return poolCreatedV3Event;
  return algebraPoolEvent;
}

export function extraFactoryFromEnv(kind: "v2" | "v3" | "algebra"): Address | undefined {
  const key =
    kind === "v2"
      ? "XLAYER_EXTRA_V2_FACTORY"
      : kind === "v3"
        ? "XLAYER_EXTRA_V3_FACTORY"
        : "XLAYER_EXTRA_ALGEBRA_FACTORY";
  const raw = process.env[key];
  if (!raw || !/^0x[0-9a-fA-F]{40}$/.test(raw)) return undefined;
  return raw as Address;
}

export function factoriesForScan(): DexFactory[] {
  const extra: DexFactory[] = [];
  const v2 = extraFactoryFromEnv("v2");
  const v3 = extraFactoryFromEnv("v3");
  const algebra = extraFactoryFromEnv("algebra");
  if (v2) {
    extra.push({
      name: "Extra Uniswap V2",
      kind: "uniswap-v2",
      address: v2,
      source: "env:XLAYER_EXTRA_V2_FACTORY",
    });
  }
  if (v3) {
    extra.push({
      name: "Extra Uniswap V3",
      kind: "uniswap-v3",
      address: v3,
      source: "env:XLAYER_EXTRA_V3_FACTORY",
    });
  }
  if (algebra) {
    extra.push({
      name: "Extra Algebra",
      kind: "algebra",
      address: algebra,
      source: "env:XLAYER_EXTRA_ALGEBRA_FACTORY",
    });
  }
  return [...XLAYER_MAINNET_FACTORIES, ...extra];
}

export function isIgnoredBaseToken(address: Address, extras: readonly Address[] = []): boolean {
  const set = new Set<string>([
    WOKB_MAINNET.toLowerCase(),
    "0x0000000000000000000000000000000000000000",
    ...extras.map((a) => a.toLowerCase()),
  ]);
  return set.has(address.toLowerCase());
}

export type DecodedPair = {
  token0: Address;
  token1: Address;
  pairOrPool: Address;
  source: "pair-created" | "pool-created";
};

export function decodePairArgs(
  kind: DexKind,
  args: {
    token0?: unknown;
    token1?: unknown;
    pair?: unknown;
    pool?: unknown;
  },
): DecodedPair | undefined {
  const token0 = args.token0;
  const token1 = args.token1;
  const pairOrPool = kind === "uniswap-v2" ? args.pair : args.pool;
  if (
    typeof token0 !== "string" ||
    typeof token1 !== "string" ||
    typeof pairOrPool !== "string"
  ) {
    return undefined;
  }
  return {
    token0: token0 as Address,
    token1: token1 as Address,
    pairOrPool: pairOrPool as Address,
    source: kind === "uniswap-v2" ? "pair-created" : "pool-created",
  };
}

export type { Hex };
