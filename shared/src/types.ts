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
  method: "explorer" | "transfer-logs" | null;
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
};
