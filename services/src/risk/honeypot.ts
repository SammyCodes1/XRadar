import type { HoneypotFinding } from "@xradar/shared";
import {
  type Address,
  type PublicClient,
  decodeFunctionResult,
  encodeFunctionData,
} from "viem";
import {
  HONEYPOT_BUY_WEI,
  HONEYPOT_TAX_THRESHOLD,
  OKX_NATIVE_TOKEN,
  WOKB,
  honeypotProbeAbi,
} from "./constants.js";
import {
  getOkxSwapTx,
  quoteOkxSwap,
} from "./okxDex.js";
import { findPrimaryWokbPair, getAmountsOut } from "./pairs.js";
import { HONEYPOT_PROBE_BYTECODE } from "./probeBytecode.js";

const PROBE: Address = "0x1000000000000000000000000000000000000001";

function clampTax(actual: bigint, expected: bigint): number {
  if (expected === 0n) return 0;
  if (actual >= expected) return 0;
  return Number(((expected - actual) * 10_000n) / expected) / 100;
}

async function checkHoneypotViaOkx(
  client: PublicClient,
  token: Address,
): Promise<HoneypotFinding | null> {
  const quote = await quoteOkxSwap({
    fromToken: OKX_NATIVE_TOKEN,
    toToken: token,
    amount: HONEYPOT_BUY_WEI,
  });
  if (!quote) return null;

  const swapTx = await getOkxSwapTx({
    fromToken: OKX_NATIVE_TOKEN,
    toToken: token,
    amount: HONEYPOT_BUY_WEI,
    user: PROBE,
  });

  if (!swapTx) {
    return {
      status: "ok",
      isHoneypot: null,
      buyTax: null,
      sellTax: null,
      buyReverted: null,
      sellReverted: null,
      listedOnOkx: true,
      router: quote.router,
      routerSource: "okx-dex",
      error: "token is quoted on OKX DEX but swap calldata was unavailable",
    };
  }

  try {
    await client.call({
      account: PROBE,
      to: swapTx.to,
      data: swapTx.data,
      value: swapTx.value,
      stateOverride: [{ address: PROBE, balance: HONEYPOT_BUY_WEI * 2n }],
    });
    return {
      status: "ok",
      isHoneypot: false,
      buyTax: 0,
      sellTax: null,
      buyReverted: false,
      sellReverted: null,
      listedOnOkx: true,
      router: swapTx.router,
      routerSource: "okx-dex",
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "OKX swap reverted";
    return {
      status: "ok",
      isHoneypot: true,
      buyTax: null,
      sellTax: null,
      buyReverted: true,
      sellReverted: null,
      listedOnOkx: true,
      router: swapTx.router,
      routerSource: "okx-dex",
      error: message,
    };
  }
}

export async function checkHoneypot(
  client: PublicClient,
  token: Address,
): Promise<HoneypotFinding> {
  try {
    const okx = await checkHoneypotViaOkx(client, token);
    if (okx) return okx;

    const pair = await findPrimaryWokbPair(client, token);
    if (!pair) {
      return {
        status: "unknown",
        isHoneypot: null,
        buyTax: null,
        sellTax: null,
        buyReverted: null,
        sellReverted: null,
        listedOnOkx: false,
        error: "no WOKB V2 pair to simulate against",
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
        isHoneypot: null,
        buyTax: null,
        sellTax: null,
        buyReverted: null,
        sellReverted: null,
        pair: pair.pair,
        router: pair.router,
        routerSource: "uniswap-v2",
        listedOnOkx: false,
        error: "pair reserves too small to simulate",
      };
    }

    const expectedBuy = await getAmountsOut(client, buyIn, [WOKB, token]);
    const expectedTokens = expectedBuy?.[1];
    if (!expectedTokens || expectedTokens === 0n) {
      return {
        status: "unknown",
        isHoneypot: null,
        buyTax: null,
        sellTax: null,
        buyReverted: null,
        sellReverted: null,
        pair: pair.pair,
        router: pair.router,
        routerSource: "uniswap-v2",
        listedOnOkx: false,
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
      const unsupported = /override|not supported|unimplemented/i.test(message);
      return {
        status: unsupported ? "unknown" : "ok",
        isHoneypot: unsupported ? null : true,
        buyTax: null,
        sellTax: null,
        buyReverted: unsupported ? null : true,
        sellReverted: unsupported ? null : true,
        pair: pair.pair,
        router: pair.router,
        routerSource: "uniswap-v2",
        listedOnOkx: false,
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
    const isHoneypot =
      tokensBought === 0n ||
      ethOut === 0n ||
      sellTax >= HONEYPOT_TAX_THRESHOLD ||
      buyTax >= HONEYPOT_TAX_THRESHOLD;

    return {
      status: "ok",
      isHoneypot,
      buyTax,
      sellTax,
      buyReverted: false,
      sellReverted: false,
      pair: pair.pair,
      router: pair.router,
      routerSource: "uniswap-v2",
      listedOnOkx: false,
    };
  } catch (error) {
    return {
      status: "unknown",
      isHoneypot: null,
      buyTax: null,
      sellTax: null,
      buyReverted: null,
      sellReverted: null,
      error: error instanceof Error ? error.message : "honeypot check failed",
    };
  }
}
