import type { LiquiditySizeFinding } from "@xradar/shared";
import { formatUnits, type Address, type PublicClient } from "viem";
import { THIN_LIQUIDITY_OKB_WEI } from "./constants";
import { findPrimaryWokbPair } from "./pairs";

export function formatOkb(wei: bigint): string {
  const value = Number(formatUnits(wei, 18));
  if (!Number.isFinite(value)) return wei.toString();
  if (value >= 100) return value.toFixed(0);
  if (value >= 1) return value.toFixed(2);
  if (value >= 0.01) return value.toFixed(4);
  return value.toPrecision(2);
}

export async function checkLiquiditySize(
  client: PublicClient,
  token: Address,
): Promise<LiquiditySizeFinding> {
  try {
    const pair = await findPrimaryWokbPair(client, token);
    if (!pair) {
      return {
        status: "unknown",
        thin: null,
        error: "no WOKB Uniswap V2 pair with reserves",
      };
    }

    return {
      status: "ok",
      pair: pair.pair,
      reserveWokb: pair.reserveWokb.toString(),
      reserveWokbFormatted: formatOkb(pair.reserveWokb),
      thin: pair.reserveWokb < THIN_LIQUIDITY_OKB_WEI,
    };
  } catch (error) {
    return {
      status: "unknown",
      thin: null,
      error: error instanceof Error ? error.message : "liquidity size failed",
    };
  }
}
