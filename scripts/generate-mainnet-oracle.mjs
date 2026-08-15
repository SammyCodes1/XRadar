import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

const key = generatePrivateKey();
const account = privateKeyToAccount(key);

function upsert(path, updates) {
  let text = "";
  try {
    text = readFileSync(path, "utf8");
  } catch {
    text = "";
  }
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
  writeFileSync(path, `${next.filter((l, i, arr) => !(i === arr.length - 1 && l === "")).join("\n")}\n`);
}

const updates = {
  ORACLE_WALLET_PRIVATE_KEY_MAINNET: key,
  ORACLE_WALLET_MAINNET: account.address,
};

upsert(fileURLToPath(new URL("../.env", import.meta.url)), updates);
upsert(fileURLToPath(new URL("../contracts/.env", import.meta.url)), updates);

console.log("mainnetOracle", account.address);
