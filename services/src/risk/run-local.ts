/**
 *   npm run risk:check -- --token 0x... --chain mainnet
 */
import { runRiskChecks } from "./runRiskChecks";
import type { XLayerNetwork } from "@xradar/shared";

function arg(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  if (index === -1) return undefined;
  return process.argv[index + 1];
}

const token = arg("token");
const chain = (arg("chain") ?? "mainnet") as XLayerNetwork;
if (!token) {
  throw new Error("usage: --token 0x... [--chain mainnet|testnet]");
}

const findings = await runRiskChecks(token, chain);
console.log(JSON.stringify(findings, null, 2));
