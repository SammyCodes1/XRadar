import type { DiscoveredToken } from "@xradar/shared";
import type { Address, Hex, PublicClient } from "viem";
import { isErc20Bytecode } from "./erc20.js";
import {
  decodePairArgs,
  eventForKind,
  factoriesForScan,
  isIgnoredBaseToken,
  type DexFactory,
} from "./factories.js";
import {
  FileDetectionStore,
  defaultStorePath,
  type DetectionStore,
} from "./store.js";
import {
  chainFor,
  createXLayerPublicClient,
  type DetectionNetwork,
} from "./client.js";

export type ScanOptions = {
  network?: DetectionNetwork;
  /** Inclusive start. Defaults to lastScannedBlock+1, or latest-lookback on first run. */
  fromBlock?: number;
  /** Inclusive end. Defaults to latest. */
  toBlock?: number;
  /** Blocks to rewind on first run or after a gap. Default 128. */
  lookback?: number;
  /** Hard cap per invocation so a 1–2 min cron stays inside the time budget. */
  maxBlocks?: number;
  client?: PublicClient;
  store?: DetectionStore;
  persist?: boolean;
  skipTokens?: Address[];
};

export type ScanResult = {
  network: DetectionNetwork;
  chainId: number;
  fromBlock: number;
  toBlock: number;
  createTxs: number;
  erc20Candidates: number;
  pairEvents: number;
  newTokens: DiscoveredToken[];
  lastScannedBlock: number;
  seenCount: number;
};

const DEFAULT_LOOKBACK = 128;
const DEFAULT_MAX_BLOCKS = 300;

function log(message: string): void {
  console.log(`[detection] ${message}`);
}

function asAddress(value: string): Address {
  return value.toLowerCase() as Address;
}

async function liveFactories(
  client: PublicClient,
  factories: DexFactory[],
): Promise<DexFactory[]> {
  const live: DexFactory[] = [];
  for (const factory of factories) {
    const code = await client.getCode({ address: factory.address });
    if (code && code !== "0x") {
      live.push(factory);
      log(`factory live: ${factory.name} ${factory.address}`);
    } else {
      log(`factory skipped (no code): ${factory.name} ${factory.address}`);
    }
  }
  return live;
}

async function scanCreates(
  client: PublicClient,
  chainId: number,
  fromBlock: number,
  toBlock: number,
  seen: Set<string>,
  skip: Address[],
): Promise<{ createTxs: number; erc20Candidates: number; tokens: DiscoveredToken[] }> {
  let createTxs = 0;
  let erc20Candidates = 0;
  const tokens: DiscoveredToken[] = [];

  for (let blockNumber = fromBlock; blockNumber <= toBlock; blockNumber++) {
    const block = await client.getBlock({
      blockNumber: BigInt(blockNumber),
      includeTransactions: true,
    });

    for (const tx of block.transactions) {
      if (typeof tx === "string") continue;
      if (tx.to !== null) continue;
      createTxs += 1;

      const receipt = await client.getTransactionReceipt({ hash: tx.hash });
      const created = receipt.contractAddress;
      if (!created) continue;

      const code = await client.getCode({ address: created });
      if (!isErc20Bytecode(code as Hex | undefined)) continue;
      erc20Candidates += 1;

      const address = asAddress(created);
      if (seen.has(address) || isIgnoredBaseToken(address, skip)) continue;
      seen.add(address);

      tokens.push({
        address,
        chainId,
        deployer: asAddress(tx.from),
        deploymentBlock: blockNumber,
        deploymentTimestamp: Number(block.timestamp),
        txHash: tx.hash,
        source: "contract-create",
      });
    }
  }

  return { createTxs, erc20Candidates, tokens };
}

async function scanFactories(
  client: PublicClient,
  chainId: number,
  fromBlock: number,
  toBlock: number,
  factories: DexFactory[],
  seen: Set<string>,
  skip: Address[],
): Promise<{ pairEvents: number; tokens: DiscoveredToken[] }> {
  let pairEvents = 0;
  const tokens: DiscoveredToken[] = [];

  for (const factory of factories) {
    const event = eventForKind(factory.kind);
    const logs = await client.getLogs({
      address: factory.address,
      event,
      fromBlock: BigInt(fromBlock),
      toBlock: BigInt(toBlock),
    });

    pairEvents += logs.length;
    log(`${factory.name}: ${logs.length} ${factory.kind} event(s)`);

    for (const entry of logs) {
      const decoded = decodePairArgs(
        factory.kind,
        (entry.args ?? {}) as {
          token0?: unknown;
          token1?: unknown;
          pair?: unknown;
          pool?: unknown;
        },
      );
      if (!decoded) continue;

      const tx = await client.getTransaction({ hash: entry.transactionHash });
      const block = await client.getBlock({ blockNumber: entry.blockNumber });
      const candidates = [decoded.token0, decoded.token1];

      for (const raw of candidates) {
        const address = asAddress(raw);
        if (seen.has(address) || isIgnoredBaseToken(address, skip)) continue;

        const code = await client.getCode({ address });
        if (!isErc20Bytecode(code as Hex | undefined)) continue;

        seen.add(address);
        const counterpart = asAddress(
          raw.toLowerCase() === decoded.token0.toLowerCase()
            ? decoded.token1
            : decoded.token0,
        );

        tokens.push({
          address,
          chainId,
          deployer: asAddress(tx.from),
          deploymentBlock: Number(entry.blockNumber),
          deploymentTimestamp: Number(block.timestamp),
          txHash: entry.transactionHash,
          source: decoded.source,
          factory: factory.address,
          pairOrPool: decoded.pairOrPool,
          counterpart,
        });
      }
    }
  }

  return { pairEvents, tokens };
}

/**
 * Scan X Layer for newly deployed ERC-20s and tokens listed on known DEX
 * factories since the last persisted cursor.
 *
 * Standalone — call this from a CLI, a test, or later from a Vercel Cron
 * function (`vercel.json` schedule `*\/2 * * * *`). Do not rely on the
 * file store once this is on serverless.
 */
export async function scanNewTokens(options: ScanOptions = {}): Promise<ScanResult> {
  const network = options.network ?? "mainnet";
  const chain = chainFor(network);
  const client = options.client ?? createXLayerPublicClient(network);
  const store =
    options.store ?? new FileDetectionStore(defaultStorePath(network));
  const persist = options.persist ?? true;
  const lookback = options.lookback ?? DEFAULT_LOOKBACK;
  const maxBlocks = options.maxBlocks ?? DEFAULT_MAX_BLOCKS;
  const skip = options.skipTokens ?? [];

  const state = await store.load();
  const seen = new Set(state.seenTokens.map((a) => a.toLowerCase()));
  const latest = Number(await client.getBlockNumber());

  let fromBlock = options.fromBlock;
  if (fromBlock === undefined) {
    fromBlock =
      state.lastScannedBlock > 0
        ? state.lastScannedBlock + 1
        : Math.max(0, latest - lookback);
  }
  let toBlock = options.toBlock ?? latest;
  if (toBlock > latest) toBlock = latest;
  if (fromBlock < 0) fromBlock = 0;

  if (toBlock - fromBlock + 1 > maxBlocks * 2) {
    fromBlock = Math.max(0, toBlock - lookback);
    log(
      `cursor lagged far behind tip; jumping to latest-${lookback} (${fromBlock})`,
    );
  }

  if (toBlock - fromBlock + 1 > maxBlocks) {
    toBlock = fromBlock + maxBlocks - 1;
    log(`range capped to ${maxBlocks} blocks (cron budget)`);
  }

  if (fromBlock > toBlock) {
    log(`nothing to scan (from=${fromBlock} to=${toBlock} latest=${latest})`);
    return {
      network,
      chainId: chain.id,
      fromBlock,
      toBlock,
      createTxs: 0,
      erc20Candidates: 0,
      pairEvents: 0,
      newTokens: [],
      lastScannedBlock: state.lastScannedBlock,
      seenCount: seen.size,
    };
  }

  log(
    `network=${network} chainId=${chain.id} blocks=${fromBlock}..${toBlock} (${toBlock - fromBlock + 1} blocks) latest=${latest}`,
  );

  const factories = await liveFactories(client, factoriesForScan());
  const creates = await scanCreates(
    client,
    chain.id,
    fromBlock,
    toBlock,
    seen,
    skip,
  );
  const pairs = await scanFactories(
    client,
    chain.id,
    fromBlock,
    toBlock,
    factories,
    seen,
    skip,
  );

  const newTokens = [...creates.tokens, ...pairs.tokens];

  log(
    `create-txs=${creates.createTxs} erc20-matches=${creates.erc20Candidates} pair/pool-events=${pairs.pairEvents} new-tokens=${newTokens.length}`,
  );
  for (const token of newTokens) {
    log(
      `new ${token.address} source=${token.source} deployer=${token.deployer} block=${token.deploymentBlock} tx=${token.txHash}`,
    );
  }

  if (persist) {
    await store.save({
      lastScannedBlock: toBlock,
      seenTokens: [...seen] as Address[],
    });
    log(`persisted lastScannedBlock=${toBlock} seen=${seen.size}`);
  }

  return {
    network,
    chainId: chain.id,
    fromBlock,
    toBlock,
    createTxs: creates.createTxs,
    erc20Candidates: creates.erc20Candidates,
    pairEvents: pairs.pairEvents,
    newTokens,
    lastScannedBlock: toBlock,
    seenCount: seen.size,
  };
}
