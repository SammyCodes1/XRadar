import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
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

function upsert(path, updates) {
  const text = readFileSync(path, "utf8");
  const lines = text.split(/\r?\n/);
  const seen = new Set();
  const next = lines.map((line) => {
    const t = line.trim();
    if (!t || t.startsWith("#") || !t.includes("=")) return line;
    const name = t.slice(0, t.indexOf("=")).trim();
    if (name in updates) {
      seen.add(name);
      return `${name}=${updates[name]}`;
    }
    return line;
  });
  for (const [name, value] of Object.entries(updates)) {
    if (!seen.has(name)) next.push(`${name}=${value}`);
  }
  writeFileSync(path, `${next.join("\n").replace(/\n+$/, "\n")}`);
}

const rootPath = fileURLToPath(new URL("../.env", import.meta.url));
const contractsPath = fileURLToPath(new URL("../contracts/.env", import.meta.url));
const cenv = loadEnv(contractsPath);
const root = loadEnv(rootPath);

const testnetKey = cenv.ORACLE_WALLET_PRIVATE_KEY || root.ORACLE_WALLET_PRIVATE_KEY;
if (!testnetKey) {
  console.error("missing testnet oracle key");
  process.exit(1);
}
const testnetOracle = privateKeyToAccount(testnetKey);
const testnetRegistry =
  root.ORACLE_CONTRACT_ADDRESS || "0x6A85d6C8609B52d8B5eb0a9FC5F5174a4BaeeCf3";
const mainnetOracle = root.ORACLE_WALLET_MAINNET || cenv.ORACLE_WALLET_MAINNET || "";

const updates = {
  ORACLE_WALLET_PRIVATE_KEY_TESTNET: testnetKey,
  ORACLE_WALLET_TESTNET: testnetOracle.address,
  ORACLE_CONTRACT_ADDRESS_TESTNET: testnetRegistry,
  ORACLE_CONTRACT_ADDRESS_MAINNET: root.ORACLE_CONTRACT_ADDRESS_MAINNET || "",
  ORACLE_WALLET_MAINNET: mainnetOracle,
};

upsert(rootPath, updates);
upsert(contractsPath, updates);
console.log("testnetOracle", testnetOracle.address);
console.log("testnetRegistry", testnetRegistry);
console.log("mainnetOracle", mainnetOracle || "pending");
