import type { Address, Hex } from "viem";
import {
  createWalletClient,
  http,
  publicActions,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import type { RiskReport, XLayerNetwork } from "@xradar/shared";
import { chainFor, rpcFor } from "../detection/client.js";
import { env } from "../lib/env.js";
import { enqueuePublish } from "./nonceQueue.js";
import { RISK_REGISTRY_ABI, registryAddress } from "./registry.js";

export type PublishResult = {
  token: Address;
  chain: XLayerNetwork;
  score: number;
  reportURI: string;
  txHash: Hex;
  blockNumber: number;
};

function oracleAccount(chain: XLayerNetwork) {
  const key = env.oraclePrivateKeyFor(chain);
  if (!key || !/^0x[0-9a-fA-F]{64}$/.test(key)) {
    throw new Error(
      `ORACLE_WALLET_PRIVATE_KEY_${chain.toUpperCase()} is missing or not 0x + 64 hex`,
    );
  }
  return privateKeyToAccount(key as Hex);
}

function clampScore(report: RiskReport): number {
  const raw = Number(report.score.overall);
  if (!Number.isFinite(raw) || raw < 0) return 0;
  return Math.min(100, Math.round(raw));
}

/**
 * Encode the full RiskReport as a data URI.
 * Compact enough for calldata now; swap this for an IPFS/HTTPS upload later.
 */
export function reportToDataUri(report: RiskReport): string {
  const json = JSON.stringify(report);
  const uri = `data:application/json,${encodeURIComponent(json)}`;
  const bytes = new TextEncoder().encode(uri);
  if (bytes.length > 12_000) {
    const slim = {
      scanId: report.scanId,
      token: report.token,
      score: report.score,
      summary: report.summary.slice(0, 280),
      generatedAt: report.generatedAt,
      model: report.model,
      flags: report.flags,
      checks: report.checks,
    };
    return `data:application/json,${encodeURIComponent(JSON.stringify(slim))}`;
  }
  return uri;
}

export async function publishToRegistry(
  tokenAddress: string,
  report: RiskReport,
  chain: XLayerNetwork,
): Promise<PublishResult> {
  if (!/^0x[0-9a-fA-F]{40}$/.test(tokenAddress)) {
    throw new Error("tokenAddress must be a 0x-prefixed 20-byte address");
  }

  return enqueuePublish(async () => {
    const token = tokenAddress.toLowerCase() as Address;
    const score = clampScore(report);
    const reportURI = reportToDataUri(report);
    const account = oracleAccount(chain);
    const client = createWalletClient({
      account,
      chain: chainFor(chain),
      transport: http(rpcFor(chain), { timeout: 30_000, retryCount: 2 }),
    }).extend(publicActions);

    const registry = registryAddress(chain);
    const nonce = await client.getTransactionCount({
      address: account.address,
      blockTag: "pending",
    });

    console.log(
      `[publish] submitting score=${score} token=${token} oracle=${account.address} nonce=${nonce} registry=${registry}`,
    );

    const hash = await client.writeContract({
      address: registry,
      abi: RISK_REGISTRY_ABI,
      functionName: "publishScore",
      args: [token, score, reportURI],
      nonce,
      type: "legacy",
      gasPrice: 20_000_001n,
    });

    const receipt = await client.waitForTransactionReceipt({
      hash,
      timeout: 120_000,
    });
    if (receipt.status !== "success") {
      throw new Error(`publishScore reverted in ${hash}`);
    }

    console.log(
      `[publish] confirmed ${hash} block=${receipt.blockNumber} token=${token}`,
    );

    return {
      token,
      chain,
      score,
      reportURI,
      txHash: hash,
      blockNumber: Number(receipt.blockNumber),
    };
  });
}

export async function readLatestScore(
  tokenAddress: string,
  chain: XLayerNetwork,
) {
  const account = oracleAccount(chain);
  const client = createWalletClient({
    account,
    chain: chainFor(chain),
    transport: http(rpcFor(chain)),
  }).extend(publicActions);
  return client.readContract({
    address: registryAddress(chain),
    abi: RISK_REGISTRY_ABI,
    functionName: "getLatestScore",
    args: [tokenAddress as Address],
  });
}
