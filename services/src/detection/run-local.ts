/**
 * Local runner — not a serverless entrypoint.
 *
 *   npm run scan:testnet -- --lookback 200
 *   npm run scan:testnet -- --from 38300000 --to 38300100
 *   npm run scan:testnet -- --reset --lookback 50
 */
import { resolve } from "node:path";
import { FileDetectionStore } from "./store";
import { scanNewTokens, type ScanOptions } from "./scan";
import type { DetectionNetwork } from "./client";

function flag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function arg(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  if (index === -1) return undefined;
  return process.argv[index + 1];
}

function num(name: string): number | undefined {
  const raw = arg(name);
  if (raw === undefined) return undefined;
  const value = Number(raw);
  if (!Number.isFinite(value)) {
    throw new Error(`--${name} must be a number`);
  }
  return value;
}

const network = (arg("network") ?? "testnet") as DetectionNetwork;
if (network !== "mainnet" && network !== "testnet") {
  throw new Error("--network must be mainnet or testnet");
}

const storePath =
  arg("store") ?? resolve(process.cwd(), ".data", `detection-${network}.json`);
const store = new FileDetectionStore(storePath);

if (flag("reset")) {
  await store.save({ lastScannedBlock: 0, seenTokens: [] });
  console.log(`[detection] reset store ${storePath}`);
}

const options: ScanOptions = {
  network,
  store,
  persist: !flag("no-persist"),
  fromBlock: num("from"),
  toBlock: num("to"),
  lookback: num("lookback"),
  maxBlocks: num("max-blocks"),
};

const result = await scanNewTokens(options);
console.log(
  JSON.stringify(
    {
      ...result,
      newTokens: result.newTokens,
    },
    null,
    2,
  ),
);
