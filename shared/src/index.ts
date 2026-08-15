export type Address = `0x${string}`;
export type Hex = `0x${string}`;

export type XLayerNetwork = "mainnet" | "testnet";

export type ChainRef = {
  network: XLayerNetwork;
  chainId: number;
};

export type TokenIdentity = {
  address: Address;
  chainId: number;
  symbol?: string;
  name?: string;
  decimals?: number;
};

export type RiskSeverity = "info" | "low" | "medium" | "high" | "critical";

export type RiskFlagKey =
  | "honeypot"
  | "hiddenMint"
  | "ownerCanPause"
  | "blacklist"
  | "highTax"
  | "liquidityUnlocked"
  | "renouncedOwnership"
  | "proxyUpgradeable"
  | "unverifiedSource"
  | "concentratedHolders"
  | "recentDeploy"
  | "socialSpam";

export type RiskFlag = {
  key: RiskFlagKey;
  label: string;
  severity: RiskSeverity;
  triggered: boolean;
  detail?: string;
};

export type RiskFlags = Partial<Record<RiskFlagKey, RiskFlag>>;

export type ScanStatus = "queued" | "running" | "complete" | "failed";

export type TokenScanResult = {
  id: string;
  token: TokenIdentity;
  status: ScanStatus;
  startedAt: string;
  finishedAt?: string;
  error?: string;
};

export type RiskScore = {
  overall: number;
  liquidity: number;
  contract: number;
  holders: number;
  social: number;
};

export type FindingOutcome = "pass" | "fail" | "warning";

export type ReportCheckKey =
  | "verified"
  | "ownership"
  | "honeypot"
  | "lpLock"
  | "holders"
  | "deployer";

export type ReportCheck = {
  key: ReportCheckKey;
  label: string;
  outcome: FindingOutcome;
  value: string;
};

export type RiskReport = {
  scanId: string;
  token: TokenIdentity;
  flags: RiskFlags;
  score: RiskScore;
  summary: string;
  generatedAt: string;
  model?: string;
  checks?: ReportCheck[];
};

export type DetectionSource = "manual" | "mempool" | "listing" | "contract-create" | "pair-created" | "pool-created";

export type DetectionJob = {
  token: TokenIdentity;
  source: DetectionSource;
  requestedAt: string;
};

export type DiscoveredToken = {
  address: Address;
  chainId: number;
  deployer: Address;
  deploymentBlock: number;
  deploymentTimestamp: number;
  txHash: Hex;
  source: Extract<DetectionSource, "contract-create" | "pair-created" | "pool-created">;
  factory?: Address;
  pairOrPool?: Address;
  counterpart?: Address;
};

export type OraclePublication = {
  token: Address;
  chainId: number;
  score: number;
  reportHash: Hex;
  txHash?: Hex;
  publishedAt?: string;
};

export type HealthResponse = {
  ok: true;
  service: string;
  timestamp: string;
};

export type {
  CheckStatus,
  VerifiedContractFinding,
  OwnershipStatusFinding,
  HoneypotFinding,
  LpLockFinding,
  HolderConcentrationFinding,
  DeployerHistoryFinding,
  RiskFindings,
} from "./types.js";

export {
  XLAYER_NETWORKS,
  getNetwork,
  parseNetwork,
  requireNetwork,
  networkFromChainId,
  chainIdFromNetwork,
} from "./networks";
export type { NetworkConfig, NetworkId } from "./networks";

export {
  DEPLOYED_ADDRESSES,
  getRegistryAddress,
  tryRegistryAddress,
  registryByChainId,
} from "./addresses";
export type { DeployedNetwork } from "./addresses";
