import type { TransferTaxFinding } from "@xradar/shared";
import {
  type Address,
  type PublicClient,
  decodeFunctionResult,
  encodeFunctionData,
} from "viem";
import { TRANSFER_TAX_SINK, erc20Abi } from "./constants";
import { PAIR_TRANSFER_PROBE_BYTECODE } from "./pairTransferBytecode";
import { findPrimaryWokbPair } from "./pairs";

const measureAbi = [
  {
    type: "function",
    name: "measure",
    stateMutability: "nonpayable",
    inputs: [
      { name: "token", type: "address" },
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [
      { name: "sent", type: "uint256" },
      { name: "received", type: "uint256" },
    ],
  },
] as const;

function taxPercent(sent: bigint, received: bigint): number {
  if (sent === 0n) return 0;
  if (received >= sent) return 0;
  return Number(((sent - received) * 10_000n) / sent) / 100;
}

export async function checkTransferTax(
  client: PublicClient,
  token: Address,
): Promise<TransferTaxFinding> {
  try {
    const pair = await findPrimaryWokbPair(client, token);
    if (!pair) {
      return {
        status: "unknown",
        transferTax: null,
        reverted: null,
        method: null,
        error: "no WOKB Uniswap V2 pair with reserves",
      };
    }

    const pairBalance = await client.readContract({
      address: token,
      abi: erc20Abi,
      functionName: "balanceOf",
      args: [pair.pair],
    });
    const amount = pairBalance / 100n;
    if (amount === 0n) {
      return {
        status: "unknown",
        transferTax: null,
        reverted: null,
        method: "pair-transfer",
        error: "pair token balance too small to measure tax",
      };
    }

    const data = encodeFunctionData({
      abi: measureAbi,
      functionName: "measure",
      args: [token, TRANSFER_TAX_SINK, amount],
    });

    try {
      const result = await client.call({
        to: pair.pair,
        data,
        stateOverride: [
          {
            address: pair.pair,
            code: PAIR_TRANSFER_PROBE_BYTECODE,
          },
        ],
      });
      const decoded = decodeFunctionResult({
        abi: measureAbi,
        functionName: "measure",
        data: result.data ?? "0x",
      });
      return {
        status: "ok",
        transferTax: taxPercent(decoded[0], decoded[1]),
        reverted: false,
        method: "pair-transfer",
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "pair transfer reverted";
      if (/override|not supported|unimplemented/i.test(message)) {
        return {
          status: "unknown",
          transferTax: null,
          reverted: null,
          method: "pair-transfer",
          error: message,
        };
      }
      return {
        status: "ok",
        transferTax: null,
        reverted: true,
        method: "pair-transfer",
        error: message,
      };
    }
  } catch (error) {
    return {
      status: "unknown",
      transferTax: null,
      reverted: null,
      method: null,
      error: error instanceof Error ? error.message : "transfer tax failed",
    };
  }
}
