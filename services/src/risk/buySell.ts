import type { BuySellFinding } from "@xradar/shared";
import {
  type Address,
  type PublicClient,
  decodeFunctionResult,
  encodeFunctionData,
} from "viem";
import {
  HONEYPOT_BUY_WEI,
  HONEYPOT_TAX_THRESHOLD,
  WOKB,
  honeypotProbeAbi,
} from "./constants";
import { findPrimaryWokbPair, getAmountsOut } from "./pairs";
import { HONEYPOT_PROBE_BYTECODE } from "./probeBytecode";

const PROBE: Address = "0x1000000000000000000000000000000000000001";

function clampTax(actual: bigint, expected: bigint): number {
  if (expected === 0n) return 0;
  if (actual >= expected) return 0;
  return Number(((expected - actual) * 10_000n) / expected) / 100;
}

export async function checkBuySell(
  client: PublicClient,
  token: Address,
): Promise<BuySellFinding> {
  try {
    const pair = await findPrimaryWokbPair(client, token);
    if (!pair) {
      return {
        status: "unknown",
        buyOk: null,
        sellOk: null,
        buyTax: null,
        sellTax: null,
        error: "no WOKB Uniswap V2 pair to simulate against",
      };
    }

    const buyIn =
      pair.reserveWokb / 200n > 0n
        ? pair.reserveWokb / 200n < HONEYPOT_BUY_WEI
          ? pair.reserveWokb / 200n
          : HONEYPOT_BUY_WEI
        : 0n;
    if (buyIn === 0n) {
      return {
        status: "unknown",
        buyOk: null,
        sellOk: null,
        buyTax: null,
        sellTax: null,
        pair: pair.pair,
        error: "pair reserves too small to simulate",
      };
    }

    const expectedBuy = await getAmountsOut(client, buyIn, [WOKB, token]);
    const expectedTokens = expectedBuy?.[1];
    if (!expectedTokens || expectedTokens === 0n) {
      return {
        status: "unknown",
        buyOk: null,
        sellOk: null,
        buyTax: null,
        sellTax: null,
        pair: pair.pair,
        error: "getAmountsOut failed for buy path",
      };
    }

    const data = encodeFunctionData({
      abi: honeypotProbeAbi,
      functionName: "buyAndSell",
      args: [pair.router, token],
    });

    let tokensBought: bigint;
    let ethOut: bigint;
    try {
      const result = await client.call({
        to: PROBE,
        data,
        value: buyIn,
        stateOverride: [
          {
            address: PROBE,
            code: HONEYPOT_PROBE_BYTECODE,
            balance: buyIn * 2n,
          },
        ],
      });
      const decoded = decodeFunctionResult({
        abi: honeypotProbeAbi,
        functionName: "buyAndSell",
        data: result.data ?? "0x",
      });
      tokensBought = decoded[0];
      ethOut = decoded[1];
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "buy/sell simulation reverted";
      if (/override|not supported|unimplemented/i.test(message)) {
        return {
          status: "unknown",
          buyOk: null,
          sellOk: null,
          buyTax: null,
          sellTax: null,
          pair: pair.pair,
          error: message,
        };
      }
      return {
        status: "ok",
        buyOk: false,
        sellOk: false,
        buyTax: null,
        sellTax: null,
        pair: pair.pair,
        error: message,
      };
    }

    const expectedSell = await getAmountsOut(client, tokensBought, [
      token,
      WOKB,
    ]);
    const expectedEth = expectedSell?.[1] ?? 0n;
    const buyTax = clampTax(tokensBought, expectedTokens);
    const sellTax = clampTax(ethOut, expectedEth);
    const buyOk = tokensBought > 0n && buyTax < HONEYPOT_TAX_THRESHOLD;
    const sellOk = ethOut > 0n && sellTax < HONEYPOT_TAX_THRESHOLD;

    return {
      status: "ok",
      buyOk,
      sellOk,
      buyTax,
      sellTax,
      pair: pair.pair,
    };
  } catch (error) {
    return {
      status: "unknown",
      buyOk: null,
      sellOk: null,
      buyTax: null,
      sellTax: null,
      error: error instanceof Error ? error.message : "buy/sell check failed",
    };
  }
}
