import { readFileSync } from "node:fs";
import { createPublicClient, formatEther, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";

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

async function chainId(url) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "eth_chainId",
      params: [],
    }),
  });
  const json = await res.json();
  return { hex: json.result, dec: Number.parseInt(json.result, 16) };
}

const root = loadEnv(new URL("../.env", import.meta.url));
const cenv = loadEnv(new URL("../contracts/.env", import.meta.url));
const testRpc = root.XLAYER_TESTNET_RPC_URL;
const mainRpc = root.XLAYER_MAINNET_RPC_URL;

const testnet = await chainId(testRpc);
const mainnet = await chainId(mainRpc);
console.log(
  JSON.stringify({ testRpc, testnet, mainRpc, mainnet }, null, 2),
);

const deployer = cenv.PRIVATE_KEY ? privateKeyToAccount(cenv.PRIVATE_KEY) : null;
const oracle = cenv.ORACLE_WALLET_PRIVATE_KEY
  ? privateKeyToAccount(cenv.ORACLE_WALLET_PRIVATE_KEY)
  : null;

console.log("deployer", deployer?.address ?? "missing");
console.log("oracleFromKey", oracle?.address ?? "missing");
console.log("ORACLE_WALLET", cenv.ORACLE_WALLET || root.ORACLE_WALLET || "missing");

const testClient = createPublicClient({ transport: http(testRpc) });
const mainClient = createPublicClient({ transport: http(mainRpc) });

async function bal(client, addr, label) {
  if (!addr) return;
  const b = await client.getBalance({ address: addr });
  console.log(label, addr, formatEther(b), "OKB");
}

if (deployer) {
  await bal(testClient, deployer.address, "deployer testnet");
  await bal(mainClient, deployer.address, "deployer mainnet");
}
if (oracle) {
  await bal(testClient, oracle.address, "oracle testnet");
  await bal(mainClient, oracle.address, "oracle mainnet");
}
