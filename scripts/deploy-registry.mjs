import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

function loadEnv(path) {
  const out = {};
  try {
    for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const i = t.indexOf("=");
      if (i <= 0) continue;
      let v = t.slice(i + 1).trim();
      if (
        (v.startsWith('"') && v.endsWith('"')) ||
        (v.startsWith("'") && v.endsWith("'"))
      ) {
        v = v.slice(1, -1);
      }
      out[t.slice(0, i).trim()] = v;
    }
  } catch {
    /* missing file */
  }
  return out;
}

const network = process.argv[2];
if (network !== "testnet" && network !== "mainnet") {
  console.error("Usage: node scripts/deploy-registry.mjs <testnet|mainnet>");
  process.exit(1);
}

const root = loadEnv(fileURLToPath(new URL("../.env", import.meta.url)));
const contracts = loadEnv(
  fileURLToPath(new URL("../contracts/.env", import.meta.url)),
);
const env = { ...root, ...contracts, ...process.env };

const rpc =
  network === "mainnet"
    ? env.XLAYER_MAINNET_RPC_URL
    : env.XLAYER_TESTNET_RPC_URL;
const oracle =
  network === "mainnet" ? env.ORACLE_WALLET_MAINNET : env.ORACLE_WALLET_TESTNET;

if (!env.PRIVATE_KEY) {
  console.error("PRIVATE_KEY missing in contracts/.env");
  process.exit(1);
}
if (!oracle) {
  console.error(`ORACLE_WALLET_${network.toUpperCase()} missing`);
  process.exit(1);
}
if (!rpc) {
  console.error("RPC URL missing");
  process.exit(1);
}

const args = [
  "script",
  "script/DeployRiskRegistry.s.sol:DeployRiskRegistry",
  "--rpc-url",
  rpc,
  "--broadcast",
  "--legacy",
];

if (env.EXPLORER_API_KEY) {
  args.push("--verify", "--etherscan-api-key", env.EXPLORER_API_KEY);
}

console.log(`deploying RiskRegistry to ${network} oracle=${oracle}`);
const forge = process.env.FORGE_BIN || "forge";
const result = spawnSync(forge, args, {
  cwd: fileURLToPath(new URL("../contracts", import.meta.url)),
  env: {
    ...process.env,
    PRIVATE_KEY: env.PRIVATE_KEY,
    ORACLE_WALLET: oracle,
    DEPLOY_NETWORK: network,
    DEPLOYED_ADDRESSES: fileURLToPath(
      new URL("../shared/deployedAddresses.json", import.meta.url),
    ),
    XLAYER_MAINNET_RPC_URL: env.XLAYER_MAINNET_RPC_URL,
    XLAYER_TESTNET_RPC_URL: env.XLAYER_TESTNET_RPC_URL,
    EXPLORER_API_KEY: env.EXPLORER_API_KEY || "",
  },
  stdio: "inherit",
  shell: true,
});
process.exit(result.status ?? 1);
