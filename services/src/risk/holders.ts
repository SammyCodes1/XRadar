import type { HolderConcentrationFinding } from "@xradar/shared";
import {
  type Address,
  type PublicClient,
  parseAbiItem,
} from "viem";
import {
  DEAD_ADDRESS,
  KNOWN_LOCKERS,
  ZERO_ADDRESS,
  erc20Abi,
  ownableAbi,
} from "./constants";
import { fetchTokenHolders, type ExplorerNetwork } from "./explorer";
import { getLogsChunked } from "./logRange";
import { findPrimaryWokbPair } from "./pairs";

const transferEvent = parseAbiItem(
  "event Transfer(address indexed from, address indexed to, uint256 value)",
);

function pct(part: bigint, whole: bigint): number {
  if (whole === 0n) return 0;
  return Number((part * 10_000n) / whole) / 100;
}

function parseAmount(raw: string): bigint {
  const value = raw.trim();
  if (!value) return 0n;
  try {
    if (/^0x[0-9a-fA-F]+$/.test(value)) return BigInt(value);
    if (/^\d+$/.test(value)) return BigInt(value);
    const whole = value.split(".")[0] ?? "0";
    if (/^\d+$/.test(whole)) return BigInt(whole);
  } catch {
    return 0n;
  }
  return 0n;
}

async function fromExplorer(
  chain: ExplorerNetwork,
  token: Address,
  totalSupply: bigint,
): Promise<HolderConcentrationFinding | null> {
  const holders = await fetchTokenHolders(chain, token, 20);
  if (!holders || holders.length === 0) return null;
  const amounts = holders
    .map((holder) => parseAmount(holder.amount))
    .filter((amount) => amount > 0n)
    .sort((a, b) => (a === b ? 0 : a < b ? 1 : -1));
  if (amounts.length === 0) return null;
  const top10 = amounts.slice(0, 10).reduce((sum, n) => sum + n, 0n);
  const percent = pct(top10, totalSupply);
  // Explorer sometimes returns human units, not wei. Ignore a near-zero read.
  if (percent === 0 && amounts[0] < totalSupply / 1_000_000n) return null;
  return {
    status: "ok",
    top10Percent: percent,
    holderSampleSize: amounts.length,
    method: "explorer",
  };
}

async function seedAddresses(
  client: PublicClient,
  token: Address,
): Promise<Address[]> {
  const seeds = new Set<string>([
    ZERO_ADDRESS,
    DEAD_ADDRESS,
    token.toLowerCase(),
    ...KNOWN_LOCKERS.map((locker) => locker.address.toLowerCase()),
  ]);
  const [pair, owner] = await Promise.all([
    findPrimaryWokbPair(client, token).catch(() => null),
    client
      .readContract({
        address: token,
        abi: ownableAbi,
        functionName: "owner",
      })
      .catch(() => null),
  ]);
  if (pair?.pair) seeds.add(pair.pair.toLowerCase());
  if (owner) seeds.add(owner.toLowerCase());
  return [...seeds] as Address[];
}

async function recentTransferAddresses(
  client: PublicClient,
  token: Address,
): Promise<Address[]> {
  try {
    const latest = await client.getBlockNumber();
    const lookback = 4_000n;
    const fromBlock = latest > lookback ? latest - lookback : 0n;
    const logs = await getLogsChunked({
      client,
      address: token,
      event: transferEvent,
      fromBlock,
      toBlock: latest,
      maxChunks: 40,
    });
    const unique = new Set<string>();
    for (const log of logs) {
      const from = log.topics[1];
      const to = log.topics[2];
      if (from) unique.add(`0x${from.slice(-40)}`.toLowerCase());
      if (to) unique.add(`0x${to.slice(-40)}`.toLowerCase());
    }
    return [...unique].slice(0, 120) as Address[];
  } catch {
    return [];
  }
}

async function positiveBalances(
  client: PublicClient,
  token: Address,
  addresses: Address[],
): Promise<bigint[]> {
  const unique = [
    ...new Set(addresses.map((address) => address.toLowerCase())),
  ] as Address[];
  const rows = await Promise.all(
    unique.map(async (address) => {
      try {
        return await client.readContract({
          address: token,
          abi: erc20Abi,
          functionName: "balanceOf",
          args: [address],
        });
      } catch {
        return 0n;
      }
    }),
  );
  return rows.filter((balance) => balance > 0n);
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

    const [seeds, transferred] = await Promise.all([
      seedAddresses(client, token),
      recentTransferAddresses(client, token),
    ]);
    const balances = await positiveBalances(client, token, [
      ...seeds,
      ...transferred,
    ]);
    if (balances.length === 0) {
      return {
        status: "unknown",
        top10Percent: null,
        method: null,
        error: "no holder balances readable",
      };
    }

    balances.sort((a, b) => (a === b ? 0 : a < b ? 1 : -1));
    const top10 = balances.slice(0, 10).reduce((sum, n) => sum + n, 0n);
    return {
      status: "ok",
      top10Percent: pct(top10, totalSupply),
      holderSampleSize: balances.length,
      method: transferred.length > 0 ? "transfer-logs" : "on-chain",
    };
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
