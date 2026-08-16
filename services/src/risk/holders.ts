import type { HolderConcentrationFinding } from "@xradar/shared";
import {
  type Address,
  type PublicClient,
  parseAbiItem,
} from "viem";
import { erc20Abi } from "./constants";
import { fetchTokenHolders, type ExplorerNetwork } from "./explorer";
import { getLogsChunked } from "./logRange";

const transferEvent = parseAbiItem(
  "event Transfer(address indexed from, address indexed to, uint256 value)",
);

function pct(part: bigint, whole: bigint): number {
  if (whole === 0n) return 0;
  return Number((part * 10_000n) / whole) / 100;
}

async function fromExplorer(
  chain: ExplorerNetwork,
  token: Address,
  totalSupply: bigint,
): Promise<HolderConcentrationFinding | null> {
  const holders = await fetchTokenHolders(chain, token, 20);
  if (!holders || holders.length === 0) return null;
  const amounts = holders
    .map((h) => {
      try {
        return BigInt(h.amount.split(".")[0] ?? "0");
      } catch {
        return 0n;
      }
    })
    .sort((a, b) => (a === b ? 0 : a < b ? 1 : -1));
  const top10 = amounts.slice(0, 10).reduce((sum, n) => sum + n, 0n);
  return {
    status: "ok",
    top10Percent: pct(top10, totalSupply),
    holderSampleSize: holders.length,
    method: "explorer",
  };
}

async function fromTransferLogs(
  client: PublicClient,
  token: Address,
  totalSupply: bigint,
): Promise<HolderConcentrationFinding> {
  const latest = await client.getBlockNumber();
  const lookback = 1_000n;
  const fromBlock = latest > lookback ? latest - lookback : 0n;
  const logs = await getLogsChunked({
    client,
    address: token,
    event: transferEvent,
    fromBlock,
    toBlock: latest,
    maxChunks: 12,
  });

  const unique = new Set<string>();
  for (const log of logs) {
    const from = log.topics[1];
    const to = log.topics[2];
    if (from) unique.add(`0x${from.slice(-40)}`.toLowerCase());
    if (to) unique.add(`0x${to.slice(-40)}`.toLowerCase());
  }

  const addresses = [...unique].slice(0, 80) as Address[];
  const balances: bigint[] = [];
  for (const address of addresses) {
    try {
      const bal = await client.readContract({
        address: token,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [address],
      });
      if (bal > 0n) balances.push(bal);
    } catch {
      // skip
    }
  }
  balances.sort((a, b) => (a === b ? 0 : a < b ? 1 : -1));
  const top10 = balances.slice(0, 10).reduce((sum, n) => sum + n, 0n);
  return {
    status: "ok",
    top10Percent: pct(top10, totalSupply),
    holderSampleSize: balances.length,
    method: "transfer-logs",
  };
}

export async function checkHolderConcentration(
  client: PublicClient,
  token: Address,
  chain: ExplorerNetwork,
): Promise<HolderConcentrationFinding> {
  try {
    const totalSupply = await client.readContract({
      address: token,
      abi: erc20Abi,
      functionName: "totalSupply",
    });
    if (totalSupply === 0n) {
      return {
        status: "unknown",
        top10Percent: null,
        method: null,
        error: "totalSupply is 0",
      };
    }

    const explorer = await fromExplorer(chain, token, totalSupply);
    if (explorer) return explorer;
    return await fromTransferLogs(client, token, totalSupply);
  } catch (error) {
    return {
      status: "unknown",
      top10Percent: null,
      method: null,
      error:
        error instanceof Error ? error.message : "holder concentration failed",
    };
  }
}
