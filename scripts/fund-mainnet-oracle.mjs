import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createWalletClient, http, parseEther, publicActions } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { getNetwork } from "../shared/src/networks.ts";

function loadEnv(path) {
  const out = {};
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
  return out;
}

const contracts = loadEnv(fileURLToPath(new URL("../contracts/.env", import.meta.url)));
const root = loadEnv(fileURLToPath(new URL("../.env", import.meta.url)));
const net = getNetwork("mainnet");
const deployer = privateKeyToAccount(contracts.PRIVATE_KEY);
const oracle = root.ORACLE_WALLET_MAINNET || contracts.ORACLE_WALLET_MAINNET;
if (!oracle) {
  console.error("missing mainnet oracle address");
  process.exit(1);
}

const client = createWalletClient({
  account: deployer,
  chain: {
    id: net.chainId,
    name: net.name,
    nativeCurrency: net.nativeCurrency,
    rpcUrls: { default: { http: [net.rpcUrl] } },
  },
  transport: http(net.rpcUrl),
}).extend(publicActions);

const amount = parseEther("0.004");
const hash = await client.sendTransaction({
  to: oracle,
  value: amount,
  type: "legacy",
  gasPrice: 20_000_001n,
});
const receipt = await client.waitForTransactionReceipt({ hash, timeout: 120_000 });
console.log("funded", oracle, "tx", hash, "status", receipt.status);
