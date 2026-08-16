import type { Address } from "viem";

export const UNISWAP_V2_FACTORY: Address =
  "0xDf38F24fE153761634Be942F9d859f3DBA857E95";
export const UNISWAP_V2_ROUTER: Address =
  "0x182a927119d56008d921126764bf884221b10f59";
export const WOKB: Address = "0xe538905cf8410324e03A5A23C1c177a474D59b2b";

/**
 * Official OKX DEX aggregator router on X Layer (chain 196).
 * Docs: https://web3.okx.com/onchainos/dev-docs/trade/dex-smart-contract
 * Prefer the `to` address returned by /aggregator/swap — OKX may upgrade.
 */
export const OKX_DEX_ROUTER_XLAYER: Address =
  "0x7c5bee2a8091c3ef39072f64f18fac913060aeaf";

/** OKX aggregator sentinel for native OKB. */
export const OKX_NATIVE_TOKEN: Address =
  "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";

export const ZERO_ADDRESS: Address =
  "0x0000000000000000000000000000000000000000";
export const DEAD_ADDRESS: Address =
  "0x000000000000000000000000000000000000dEaD";

export const BURN_ADDRESSES: readonly Address[] = [ZERO_ADDRESS, DEAD_ADDRESS];

/** Expand this list as lockers deploy on X Layer. */
export const KNOWN_LOCKERS: readonly { address: Address; label: string }[] = [
  {
    address: "0x663A5C229c09b049E36dCc11a9B0d4a8Eb9db214",
    label: "Unicrypt (common)",
  },
  {
    address: "0x407993575c91ce7643a4d4cCACc9A98c36eE1BBE",
    label: "PinkLock v2 (common)",
  },
];

export const HONEYPOT_TAX_THRESHOLD = 50;
export const HONEYPOT_BUY_WEI = 10n ** 16n; // 0.01 OKB
export const ABANDONED_TRANSFER_WINDOW_SEC = 30 * 24 * 60 * 60;
export const THIN_LIQUIDITY_OKB_WEI = 5n * 10n ** 18n;
export const VERY_THIN_LIQUIDITY_OKB_WEI = 1n * 10n ** 18n;

/** EIP-1967 storage slots. */
export const EIP1967_IMPLEMENTATION_SLOT =
  "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc" as const;
export const EIP1967_ADMIN_SLOT =
  "0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103" as const;

export const TRANSFER_TAX_SINK: Address =
  "0x1111111111111111111111111111111111111111";

export const SELECTORS = {
  owner: "8da5cb5b",
  getOwner: "893d20e8",
  mint: "40c10f19",
  pause: "8456cb59",
  blacklist: "f9f92be4",
  addBlackList: "0ecb93c0",
  addToBlacklist: "0ec411c4",
  excludeFromFee: "437823ec",
} as const;

export const erc20Abi = [
  {
    type: "function",
    name: "totalSupply",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "decimals",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint8" }],
  },
  {
    type: "function",
    name: "symbol",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "string" }],
  },
  {
    type: "function",
    name: "name",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "string" }],
  },
  {
    type: "event",
    name: "Transfer",
    inputs: [
      { name: "from", type: "address", indexed: true },
      { name: "to", type: "address", indexed: true },
      { name: "value", type: "uint256", indexed: false },
    ],
  },
] as const;

export const ownableAbi = [
  {
    type: "function",
    name: "owner",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "address" }],
  },
] as const;

export const uniswapV2FactoryAbi = [
  {
    type: "function",
    name: "getPair",
    stateMutability: "view",
    inputs: [
      { name: "tokenA", type: "address" },
      { name: "tokenB", type: "address" },
    ],
    outputs: [{ type: "address" }],
  },
] as const;

export const uniswapV2PairAbi = [
  {
    type: "function",
    name: "token0",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "address" }],
  },
  {
    type: "function",
    name: "token1",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "address" }],
  },
  {
    type: "function",
    name: "getReserves",
    stateMutability: "view",
    inputs: [],
    outputs: [
      { name: "reserve0", type: "uint112" },
      { name: "reserve1", type: "uint112" },
      { name: "blockTimestampLast", type: "uint32" },
    ],
  },
  {
    type: "function",
    name: "totalSupply",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
] as const;

export const uniswapV2RouterAbi = [
  {
    type: "function",
    name: "WETH",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "address" }],
  },
  {
    type: "function",
    name: "factory",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "address" }],
  },
  {
    type: "function",
    name: "getAmountsOut",
    stateMutability: "view",
    inputs: [
      { name: "amountIn", type: "uint256" },
      { name: "path", type: "address[]" },
    ],
    outputs: [{ name: "amounts", type: "uint256[]" }],
  },
] as const;

export const honeypotProbeAbi = [
  {
    type: "function",
    name: "buyAndSell",
    stateMutability: "payable",
    inputs: [
      { name: "router", type: "address" },
      { name: "token", type: "address" },
    ],
    outputs: [
      { name: "tokensBought", type: "uint256" },
      { name: "ethOut", type: "uint256" },
    ],
  },
] as const;
