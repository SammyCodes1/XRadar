import type { Address } from "viem";
import { getNetwork, type RiskFindings, type XLayerNetwork } from "@xradar/shared";
import { createXLayerPublicClient } from "../detection/client.js";
import { checkDeployerHistory } from "./deployer.js";
import { checkHolderConcentration } from "./holders.js";
import { checkHoneypot } from "./honeypot.js";
import { checkLpLockStatus } from "./lpLock.js";
import { checkOwnershipStatus } from "./ownership.js";
import { checkVerifiedContract } from "./verified.js";

const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;

/**
 * Run the six read-only risk checks. Individual checks return
 * `{ status: "unknown" }` instead of throwing when data is missing.
 */
export async function runRiskChecks(
  tokenAddress: string,
  chain: XLayerNetwork,
): Promise<RiskFindings> {
  if (!ADDRESS_RE.test(tokenAddress)) {
    throw new Error("tokenAddress must be a 0x-prefixed 20-byte address");
  }
  if (chain !== "mainnet" && chain !== "testnet") {
    throw new Error("chain must be mainnet or testnet");
  }

  const token = tokenAddress.toLowerCase() as Address;
  const client = createXLayerPublicClient(chain);
  const chainId = getNetwork(chain).chainId;

  const [
    verifiedContract,
    ownershipStatus,
    honeypotCheck,
    lpLockStatus,
    holderConcentration,
    deployerHistory,
  ] = await Promise.all([
    checkVerifiedContract(token, chain),
    checkOwnershipStatus(client, token, chain),
    checkHoneypot(client, token),
    checkLpLockStatus(client, token),
    checkHolderConcentration(client, token, chain),
    checkDeployerHistory(client, token, chain),
  ]);

  return {
    token,
    chain,
    chainId,
    checkedAt: new Date().toISOString(),
    verifiedContract,
    ownershipStatus,
    honeypotCheck,
    lpLockStatus,
    holderConcentration,
    deployerHistory,
  };
}
