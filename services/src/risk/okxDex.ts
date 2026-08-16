import { createHmac } from "node:crypto";
import { request as httpsRequest } from "node:https";
import type { Address } from "viem";
import { env } from "../lib/env";
import { OKX_DEX_ROUTER_XLAYER, OKX_NATIVE_TOKEN } from "./constants";

const BASES = [
  "https://web3.okx.com",
  "https://www.okx.com",
];

export type OkxQuote = {
  router: Address;
  fromTokenAmount: string;
  toTokenAmount: string;
  priceImpactPercent?: string;
};

export type OkxSwapTx = {
  to: Address;
  data: `0x${string}`;
  value: bigint;
  router: Address;
};

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return undefined;
}

function pickAddress(value: unknown, fallback: Address): Address {
  if (typeof value === "string" && /^0x[0-9a-fA-F]{40}$/.test(value)) {
    return value.toLowerCase() as Address;
  }
  return fallback;
}

function signHeaders(method: string, pathWithQuery: string): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (!env.okxApiKey || !env.okxSecretKey || !env.okxPassphrase) return headers;
  const timestamp = new Date().toISOString();
  const prehash = `${timestamp}${method.toUpperCase()}${pathWithQuery}`;
  const sign = createHmac("sha256", env.okxSecretKey)
    .update(prehash)
    .digest("base64");
  headers["OK-ACCESS-KEY"] = env.okxApiKey;
  headers["OK-ACCESS-SIGN"] = sign;
  headers["OK-ACCESS-TIMESTAMP"] = timestamp;
  headers["OK-ACCESS-PASSPHRASE"] = env.okxPassphrase;
  if (env.okxProjectId) headers["OK-ACCESS-PROJECT"] = env.okxProjectId;
  return headers;
}

const ipCache = new Map<string, string>();

async function resolveHost(hostname: string): Promise<string> {
  const cached = ipCache.get(hostname);
  if (cached) return cached;
  const url = `https://cloudflare-dns.com/dns-query?name=${hostname}&type=A`;
  const res = await fetch(url, {
    headers: { accept: "application/dns-json" },
    signal: AbortSignal.timeout(8_000),
  });
  const body = (await res.json()) as {
    Answer?: { type: number; data: string }[];
  };
  const ip = body.Answer?.find((row) => row.type === 1)?.data;
  if (!ip) throw new Error(`DoH found no A record for ${hostname}`);
  ipCache.set(hostname, ip);
  return ip;
}

function httpsGetJson(
  hostname: string,
  ip: string,
  pathWithQuery: string,
  headers: Record<string, string>,
): Promise<{ status: number; body: Record<string, unknown> }> {
  return new Promise((resolve, reject) => {
    const req = httpsRequest(
      {
        host: ip,
        servername: hostname,
        path: pathWithQuery,
        method: "GET",
        headers: { ...headers, Host: hostname },
        timeout: 15_000,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk) =>
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)),
        );
        res.on("end", () => {
          const raw = Buffer.concat(chunks).toString("utf8");
          try {
            resolve({
              status: res.statusCode ?? 0,
              body: JSON.parse(raw) as Record<string, unknown>,
            });
          } catch {
            reject(new Error(`OKX non-JSON (${res.statusCode}): ${raw.slice(0, 160)}`));
          }
        });
      },
    );
    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("OKX request timed out"));
    });
    req.end();
  });
}

async function okxGet(path: string, query: Record<string, string>): Promise<unknown> {
  const search = new URLSearchParams(query).toString();
  const pathWithQuery = `${path}?${search}`;
  const headers = signHeaders("GET", pathWithQuery);
  let lastError: unknown;
  for (const base of BASES) {
    try {
      const hostname = new URL(base).hostname;
      const ip = await resolveHost(hostname);
      const { status, body } = await httpsGetJson(
        hostname,
        ip,
        pathWithQuery,
        headers,
      );
      if (status >= 400 || String(body.code ?? "0") !== "0") {
        lastError = `${status} code=${String(body.code ?? "")} msg=${String(body.msg ?? "")}`;
        continue;
      }
      return body.data;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error(String(lastError ?? "OKX DEX request failed"));
}

export async function getOkxDexRouter(): Promise<Address> {
  try {
    const data = await okxGet("/api/v6/dex/aggregator/supported/chain", {
      chainIndex: "196",
    });
    const row = Array.isArray(data) ? asRecord(data[0]) : asRecord(data);
    return pickAddress(row?.router ?? row?.to, OKX_DEX_ROUTER_XLAYER);
  } catch {
    return OKX_DEX_ROUTER_XLAYER;
  }
}

export async function quoteOkxSwap(params: {
  fromToken: Address;
  toToken: Address;
  amount: bigint;
}): Promise<OkxQuote | null> {
  try {
    const data = await okxGet("/api/v6/dex/aggregator/quote", {
      chainIndex: "196",
      fromTokenAddress: params.fromToken,
      toTokenAddress: params.toToken,
      amount: params.amount.toString(),
    });
    const row = Array.isArray(data) ? asRecord(data[0]) : asRecord(data);
    if (!row) return null;
    const toTokenAmount = String(row.toTokenAmount ?? "");
    const fromTokenAmount = String(row.fromTokenAmount ?? params.amount.toString());
    if (!toTokenAmount) return null;
    return {
      router: pickAddress(
        asRecord(row.tx)?.to ?? row.router,
        OKX_DEX_ROUTER_XLAYER,
      ),
      fromTokenAmount,
      toTokenAmount,
      priceImpactPercent:
        typeof row.priceImpactPercentage === "string"
          ? row.priceImpactPercentage
          : typeof row.priceImpactPercent === "string"
            ? row.priceImpactPercent
            : undefined,
    };
  } catch (error) {
    console.error(
      "[okx-dex] quote failed:",
      error instanceof Error ? error.message : error,
    );
    return null;
  }
}

export async function getOkxSwapTx(params: {
  fromToken: Address;
  toToken: Address;
  amount: bigint;
  user: Address;
}): Promise<OkxSwapTx | null> {
  try {
    const data = await okxGet("/api/v6/dex/aggregator/swap", {
      chainIndex: "196",
      fromTokenAddress: params.fromToken,
      toTokenAddress: params.toToken,
      amount: params.amount.toString(),
      slippagePercent: "1",
      userWalletAddress: params.user,
    });
    const row = Array.isArray(data) ? asRecord(data[0]) : asRecord(data);
    const tx = asRecord(row?.tx) ?? row;
    if (!tx) return null;
    const to = pickAddress(tx.to, OKX_DEX_ROUTER_XLAYER);
    const dataHex = typeof tx.data === "string" ? tx.data : "";
    if (!dataHex.startsWith("0x")) return null;
    const valueRaw = String(tx.value ?? "0");
    return {
      to,
      data: dataHex as `0x${string}`,
      value: BigInt(valueRaw || "0"),
      router: to,
    };
  } catch {
    return null;
  }
}

export { OKX_NATIVE_TOKEN, OKX_DEX_ROUTER_XLAYER };
