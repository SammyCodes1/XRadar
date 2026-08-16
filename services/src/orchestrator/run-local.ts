/**
 *   npm run pipeline:testnet
 *   npm run pipeline:testnet -- --force 0x...
 */
import type { Address } from "viem";
import { scanAndPublish } from "./scanAndPublish";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  if (i === -1) return undefined;
  return process.argv[i + 1];
}

const force = arg("force");
const skipDetection = process.argv.includes("--skip-detection");
const chainArg = arg("chain");
if (chainArg !== "mainnet" && chainArg !== "testnet") {
  throw new Error("Pass --chain testnet or --chain mainnet");
}
const result = await scanAndPublish({
  chain: chainArg,
  lookback: arg("lookback") ? Number(arg("lookback")) : 40,
  maxBlocks: arg("max-blocks") ? Number(arg("max-blocks")) : 40,
  maxTokens: arg("max-tokens") ? Number(arg("max-tokens")) : 3,
  forceTokens: force ? [force as Address] : undefined,
  skipDetection,
});
console.log(JSON.stringify(result, null, 2));
