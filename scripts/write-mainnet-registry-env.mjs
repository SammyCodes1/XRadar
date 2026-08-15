import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const address = "0x4720a706Fb1688559f7966ed50D161B275D8D87b";

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
  writeFileSync(path, `${next.join("\n").replace(/\n+$/, "\n")}`);
}

const updates = {
  ORACLE_CONTRACT_ADDRESS_MAINNET: address,
  NEXT_PUBLIC_RISK_REGISTRY_MAINNET: address,
};

upsert(fileURLToPath(new URL("../.env", import.meta.url)), updates);
upsert(fileURLToPath(new URL("../contracts/.env", import.meta.url)), updates);
upsert(fileURLToPath(new URL("../frontend/.env.local", import.meta.url)), updates);
console.log("wrote", address);
