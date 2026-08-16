import type { Address } from "viem";
import { getNetwork, type RiskFindings, type XLayerNetwork } from "@xradar/shared";
import { createXLayerPublicClient } from "../detection/client";
import { checkBuySell } from "./buySell";
import { checkDeployerHistory } from "./deployer";
import { checkHolderConcentration } from "./holders";
import { checkHoneypot } from "./honeypot";
import { checkLiquiditySize } from "./liquiditySize";
import { checkLpLockStatus } from "./lpLock";
import { checkOwnerDeployer } from "./ownerDeployer";
import { checkOwnershipStatus } from "./ownership";
import { checkProxy } from "./proxy";
import { checkTokenMeta } from "./tokenMeta";
import { checkTradingLimits } from "./tradingLimits";
import { checkTransferTax } from "./transferTax";
import { checkVerifiedContract } from "./verified";

const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;

/**
 * Run read-only risk checks. Individual checks return
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
    tokenMeta,
    liquiditySize,
    proxy,
    tradingLimits,
    transferTax,
    buySell,
  ] = await Promise.all([
    checkVerifiedContract(token, chain),
    checkOwnershipStatus(client, token, chain),
    checkHoneypot(client, token),
    checkLpLockStatus(client, token),
    checkHolderConcentration(client, token, chain),
    checkDeployerHistory(client, token, chain),
    checkTokenMeta(client, token),
    checkLiquiditySize(client, token),
    checkProxy(client, token),
    checkTradingLimits(client, token),
    checkTransferTax(client, token),
    checkBuySell(client, token),
  ]);

  const ownerDeployer = await checkOwnerDeployer(
    client,
    ownershipStatus,
    deployerHistory,
  );

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
    tokenMeta,
    liquiditySize,
    proxy,
    tradingLimits,
    ownerDeployer,
    transferTax,
    buySell,
  };
}
