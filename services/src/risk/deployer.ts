import type { DeployerHistoryFinding } from "@xradar/shared";
import {
  type Address,
  type PublicClient,
  parseAbiItem,
} from "viem";
import { ABANDONED_TRANSFER_WINDOW_SEC } from "./constants";
import {
  fetchContractCreator,
  fetchCreatedContracts,
  type ExplorerNetwork,
} from "./explorer";
import { getLogsChunked } from "./logRange";
import { findPrimaryWokbPair } from "./pairs";

const transferEvent = parseAbiItem(
  "event Transfer(address indexed from, address indexed to, uint256 value)",
);

async function deployerFromMint(
  client: PublicClient,
  token: Address,
): Promise<Address | null> {
  try {
    const latest = await client.getBlockNumber();
    const fromBlock = latest > 2_000n ? latest - 2_000n : 0n;
    const logs = await getLogsChunked({
      client,
      address: token,
      event: transferEvent,
      args: { from: "0x0000000000000000000000000000000000000000" },
      fromBlock,
      toBlock: latest,
      maxChunks: 20,
    });
    const first = logs[0];
    if (!first?.transactionHash) return null;
    const tx = await client.getTransaction({ hash: first.transactionHash });
    return tx.from;
  } catch {
    return null;
  }
}

async function isAbandoned(
  client: PublicClient,
  token: Address,
  now: number,
): Promise<boolean> {
  const pair = await findPrimaryWokbPair(client, token);
  if (!pair) return true;
  try {
    const latest = await client.getBlockNumber();
    const fromBlock = latest > 500n ? latest - 500n : 0n;
    const logs = await getLogsChunked({
      client,
      address: token,
      event: transferEvent,
      fromBlock,
      toBlock: latest,
      maxChunks: 5,
    });
    if (logs.length === 0) return true;
    const last = logs[logs.length - 1];
    if (!last?.blockNumber) return true;
    const block = await client.getBlock({ blockNumber: last.blockNumber });
    return now - Number(block.timestamp) > ABANDONED_TRANSFER_WINDOW_SEC;
  } catch {
    return true;
  }
}

export async function checkDeployerHistory(
  client: PublicClient,
  token: Address,
  chain: ExplorerNetwork,
): Promise<DeployerHistoryFinding> {
  try {
    const deployer =
      ((await fetchContractCreator(chain, token)) as Address | null) ??
      (await deployerFromMint(client, token));

    if (!deployer) {
      return {
        status: "unknown",
        deployer: null,
        contractsCreated: null,
        stillLiquid: null,
        abandoned: null,
        error: "could not resolve deployer",
      };
    }

    const created = await fetchCreatedContracts(chain, deployer);
    const others = (created ?? [token]).filter(
      (addr) => addr.toLowerCase() !== token.toLowerCase(),
    );
    const sample = others.slice(0, 8);
    const now = Math.floor(Date.now() / 1000);
    let stillLiquid = 0;
    let abandoned = 0;
    for (const addr of sample) {
      const gone = await isAbandoned(client, addr as Address, now);
      if (gone) abandoned += 1;
      else stillLiquid += 1;
    }

    return {
      status: "ok",
      deployer,
      contractsCreated: created ? created.length : sample.length + 1,
      stillLiquid: created ? stillLiquid : null,
      abandoned: created ? abandoned : null,
    };
  } catch (error) {
    return {
      status: "unknown",
      deployer: null,
      contractsCreated: null,
      stillLiquid: null,
      abandoned: null,
      error:
        error instanceof Error ? error.message : "deployer history failed",
    };
  }
}
