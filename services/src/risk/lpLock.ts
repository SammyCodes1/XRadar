import type { LpLockFinding } from "@xradar/shared";
import type { Address, PublicClient } from "viem";
import {
  BURN_ADDRESSES,
  KNOWN_LOCKERS,
  uniswapV2PairAbi,
} from "./constants.js";
import { findPrimaryWokbPair } from "./pairs.js";

function pct(part: bigint, whole: bigint): number {
  if (whole === 0n) return 0;
  return Number((part * 10_000n) / whole) / 100;
}

export async function checkLpLockStatus(
  client: PublicClient,
  token: Address,
): Promise<LpLockFinding> {
  try {
    const pairInfo = await findPrimaryWokbPair(client, token);
    if (!pairInfo) {
      return {
        status: "unknown",
        locked: null,
        lockedPercent: null,
        error: "no WOKB Uniswap V2 pair with reserves",
      };
    }

    const totalSupply = await client.readContract({
      address: pairInfo.pair,
      abi: uniswapV2PairAbi,
      functionName: "totalSupply",
    });
    if (totalSupply === 0n) {
      return {
        status: "unknown",
        locked: null,
        lockedPercent: null,
        pair: pairInfo.pair,
        error: "LP totalSupply is 0",
      };
    }

    const targets = [
      ...BURN_ADDRESSES.map((address) => ({ address, label: "burn" })),
      ...KNOWN_LOCKERS,
    ];

    const holders: { address: Address; label: string; percent: number }[] = [];
    let burned = 0n;
    let locker = 0n;

    for (const target of targets) {
      const balance = await client.readContract({
        address: pairInfo.pair,
        abi: uniswapV2PairAbi,
        functionName: "balanceOf",
        args: [target.address],
      });
      if (balance === 0n) continue;
      const percent = pct(balance, totalSupply);
      holders.push({
        address: target.address,
        label: target.label,
        percent,
      });
      if (target.label === "burn") burned += balance;
      else locker += balance;
    }

    const lockedAmount = burned + locker;
    const lockedPercent = pct(lockedAmount, totalSupply);

    return {
      status: "ok",
      locked: lockedPercent >= 50,
      lockedPercent,
      pair: pairInfo.pair,
      totalLpSupply: totalSupply.toString(),
      burnedPercent: pct(burned, totalSupply),
      lockerPercent: pct(locker, totalSupply),
      holders,
    };
  } catch (error) {
    return {
      status: "unknown",
      locked: null,
      lockedPercent: null,
      error: error instanceof Error ? error.message : "lp lock check failed",
    };
  }
}
