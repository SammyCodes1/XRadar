import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

function applyEnvFile(filePath: string): void {
  if (!existsSync(filePath)) return;
  const text = readFileSync(filePath, "utf8");
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    if (!key || process.env[key]) continue;
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!value) continue;
    process.env[key] = value;
  }
}

function loadLocalEnvFiles(): void {
  if (process.env.VERCEL) return;
  const cwd = process.cwd();
  const files = [
    resolve(cwd, "../contracts/.env"),
    resolve(cwd, "../.env"),
    resolve(cwd, "../../contracts/.env"),
    resolve(cwd, "../../.env"),
    resolve(cwd, "contracts/.env"),
    resolve(cwd, ".env"),
    resolve(cwd, ".env.local"),
  ];
  for (const file of files) applyEnvFile(file);
}

loadLocalEnvFiles();

export const env = {
  get port() {
    return Number(process.env.PORT ?? 8787);
  },
  get mainnetRpc() {
    return process.env.XLAYER_MAINNET_RPC_URL ?? "https://rpc.xlayer.tech";
  },
  get testnetRpc() {
    return (
      process.env.XLAYER_TESTNET_RPC_URL ??
      "https://testrpc.xlayer.tech/terigon"
    );
  },
  get oraclePrivateKey() {
    return process.env.ORACLE_WALLET_PRIVATE_KEY ?? "";
  },
  oraclePrivateKeyFor(network: "mainnet" | "testnet") {
    if (network === "mainnet") {
      return (
        process.env.ORACLE_WALLET_PRIVATE_KEY_MAINNET ||
        process.env.ORACLE_WALLET_PRIVATE_KEY ||
        ""
      );
    }
    return (
      process.env.ORACLE_WALLET_PRIVATE_KEY_TESTNET ||
      process.env.ORACLE_WALLET_PRIVATE_KEY ||
      ""
    );
  },
  get oracleContract() {
    return process.env.ORACLE_CONTRACT_ADDRESS ?? "";
  },
  oracleContractFor(network: "mainnet" | "testnet") {
    if (network === "mainnet") {
      return process.env.ORACLE_CONTRACT_ADDRESS_MAINNET ?? "";
    }
    return (
      process.env.ORACLE_CONTRACT_ADDRESS_TESTNET ||
      process.env.ORACLE_CONTRACT_ADDRESS ||
      ""
    );
  },
  xAlertsEnabledFor(network: "mainnet" | "testnet") {
    if (!this.xAlertsEnabled) return false;
    if (network === "mainnet") {
      const raw = (process.env.X_ALERTS_MAINNET ?? "true").toLowerCase();
      return raw !== "0" && raw !== "false" && raw !== "off";
    }
    const raw = (process.env.X_ALERTS_TESTNET ?? "false").toLowerCase();
    return raw === "1" || raw === "true" || raw === "on";
  },
  get deepseekApiKey() {
    return process.env.DEEPSEEK_API_KEY ?? "";
  },
  get deepseekModel() {
    return process.env.DEEPSEEK_MODEL ?? "deepseek-v4-pro";
  },
  get deepseekBaseUrl() {
    return (
      process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com"
    ).replace(/\/$/, "");
  },
  get xApiKey() {
    return process.env.X_API_KEY ?? "";
  },
  get xApiSecret() {
    return process.env.X_API_SECRET ?? "";
  },
  get xAccessToken() {
    return process.env.X_ACCESS_TOKEN ?? "";
  },
  get xAccessTokenSecret() {
    return process.env.X_ACCESS_TOKEN_SECRET ?? "";
  },
  get xBearerToken() {
    return process.env.X_BEARER_TOKEN ?? "";
  },
  get frontendUrl() {
    return process.env.FRONTEND_URL ?? "http://localhost:3000";
  },
  get xAlertMinScore() {
    const raw = Number(process.env.X_ALERT_MIN_SCORE ?? 70);
    return Number.isFinite(raw) ? raw : 70;
  },
  get xAlertsEnabled() {
    const raw = (process.env.X_ALERTS_ENABLED ?? "true").toLowerCase();
    return raw !== "0" && raw !== "false" && raw !== "off";
  },
  get explorerApiKey() {
    return process.env.EXPLORER_API_KEY ?? "";
  },
  get okxApiKey() {
    return process.env.OKX_API_KEY ?? "";
  },
  get okxSecretKey() {
    return process.env.OKX_SECRET_KEY ?? process.env.OKX_API_SECRET ?? "";
  },
  get okxPassphrase() {
    return process.env.OKX_API_PASSPHRASE ?? "";
  },
  get okxProjectId() {
    return process.env.OKX_PROJECT_ID ?? "";
  },
};
