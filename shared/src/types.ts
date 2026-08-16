export type Address = `0x${string}`;

export type XLayerNetwork = "mainnet" | "testnet";

export type CheckStatus = "ok" | "unknown";

export type VerifiedContractFinding = {
  status: CheckStatus;
  verified: boolean | null;
  contractName?: string;
  compilerVersion?: string;
  error?: string;
};

export type OwnershipStatusFinding = {
  status: CheckStatus;
  hasOwnerFunction: boolean | null;
  owner: Address | null;
  renounced: boolean | null;
  hasMint: boolean | null;
  hasBlacklist: boolean | null;
  hasPause: boolean | null;
  source: "abi" | "bytecode" | "owner-call" | null;
  error?: string;
};

export type HoneypotFinding = {
  status: CheckStatus;
  isHoneypot: boolean | null;
  buyTax: number | null;
  sellTax: number | null;
  buyReverted: boolean | null;
  sellReverted: boolean | null;
  router?: Address;
  routerSource?: "okx-dex" | "uniswap-v2";
  listedOnOkx?: boolean;
  pair?: Address;
  error?: string;
};

export type LpLockFinding = {
  status: CheckStatus;
  locked: boolean | null;
  lockedPercent: number | null;
  pair?: Address;
  totalLpSupply?: string;
  burnedPercent?: number;
  lockerPercent?: number;
  holders?: { address: Address; label: string; percent: number }[];
  error?: string;
};

export type HolderConcentrationFinding = {
  status: CheckStatus;
  top10Percent: number | null;
  holderSampleSize?: number;
  method: "explorer" | "transfer-logs" | "on-chain" | null;
  error?: string;
};

export type DeployerHistoryFinding = {
  status: CheckStatus;
  deployer: Address | null;
  contractsCreated: number | null;
  stillLiquid: number | null;
  abandoned: number | null;
  error?: string;
};

export type TokenMetaFinding = {
  status: CheckStatus;
  name: string | null;
  symbol: string | null;
  decimals: number | null;
  error?: string;
};

export type LiquiditySizeFinding = {
  status: CheckStatus;
  pair?: Address;
  reserveWokb?: string;
  reserveWokbFormatted?: string;
  thin: boolean | null;
  error?: string;
};

export type ProxyFinding = {
  status: CheckStatus;
  isProxy: boolean | null;
  kind: "eip1967" | "eip1167" | "implementation-fn" | null;
  implementation: Address | null;
  admin: Address | null;
  error?: string;
};

export type TradingLimitsFinding = {
  status: CheckStatus;
  maxTx: string | null;
  maxWallet: string | null;
  paused: boolean | null;
  tradingOpen: boolean | null;
  mintCallable: boolean | null;
  blacklistCallable: boolean | null;
  error?: string;
};

export type OwnerDeployerFinding = {
  status: CheckStatus;
  owner: Address | null;
  deployer: Address | null;
  sameWallet: boolean | null;
  ownerIsContract: boolean | null;
  error?: string;
};

export type TransferTaxFinding = {
  status: CheckStatus;
  transferTax: number | null;
  reverted: boolean | null;
  method: "pair-transfer" | null;
  error?: string;
};

export type BuySellFinding = {
  status: CheckStatus;
  buyOk: boolean | null;
  sellOk: boolean | null;
  buyTax: number | null;
  sellTax: number | null;
  pair?: Address;
  error?: string;
};

export type RiskFindings = {
  token: Address;
  chain: XLayerNetwork;
  chainId: number;
  checkedAt: string;
  verifiedContract: VerifiedContractFinding;
  ownershipStatus: OwnershipStatusFinding;
  honeypotCheck: HoneypotFinding;
  lpLockStatus: LpLockFinding;
  holderConcentration: HolderConcentrationFinding;
  deployerHistory: DeployerHistoryFinding;
  tokenMeta: TokenMetaFinding;
  liquiditySize: LiquiditySizeFinding;
  proxy: ProxyFinding;
  tradingLimits: TradingLimitsFinding;
  ownerDeployer: OwnerDeployerFinding;
  transferTax: TransferTaxFinding;
  buySell: BuySellFinding;
};
