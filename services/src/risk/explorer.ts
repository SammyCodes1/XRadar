import { env } from "../lib/env";

export type ExplorerNetwork = "mainnet" | "testnet";

const CHAIN_SHORT: Record<ExplorerNetwork, string> = {
  mainnet: "XLAYER",
  testnet: "XLAYER_TESTNET",
};

export type JsonObject = Record<string, unknown>;

function asRecord(value: unknown): JsonObject | undefined {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as JsonObject;
  }
  return undefined;
}

export async function oklinkGet(
  path: string,
  query: Record<string, string>,
): Promise<{ ok: boolean; data: unknown; msg?: string }> {
  const key = env.explorerApiKey;
  if (!key) {
    return { ok: false, data: null, msg: "EXPLORER_API_KEY is not set" };
  }
  const url = new URL(`https://www.oklink.com/api/v5/explorer/${path}`);
  for (const [k, v] of Object.entries(query)) url.searchParams.set(k, v);
  const response = await fetch(url, {
    headers: { "Ok-Access-Key": key },
    signal: AbortSignal.timeout(15_000),
  });
  const body = (await response.json()) as JsonObject;
  if (!response.ok || String(body.code ?? "") !== "0") {
    return {
      ok: false,
      data: body.data ?? null,
      msg: String(body.msg ?? response.statusText),
    };
  }
  return { ok: true, data: body.data };
}

export function chainShortName(chain: ExplorerNetwork): string {
  return CHAIN_SHORT[chain];
}

export type VerifiedSource = {
  verified: boolean;
  sourceCode?: string;
  contractName?: string;
  compilerVersion?: string;
};

export async function fetchVerifiedSource(
  chain: ExplorerNetwork,
  address: string,
): Promise<VerifiedSource | null> {
  const result = await oklinkGet("contract/verify-contract-info", {
    chainShortName: chainShortName(chain),
    contractAddress: address,
  });
  if (!result.ok) return null;
  const row = Array.isArray(result.data)
    ? asRecord(result.data[0])
    : asRecord(result.data);
  if (!row) return { verified: false };
  const sourceCode =
    typeof row.sourceCode === "string" ? row.sourceCode : undefined;
  return {
    verified: Boolean(sourceCode && sourceCode.length > 20),
    sourceCode,
    contractName:
      typeof row.contractName === "string" ? row.contractName : undefined,
    compilerVersion:
      typeof row.compilerVersion === "string"
        ? row.compilerVersion
        : undefined,
  };
}

export type ExplorerHolder = {
  address: string;
  amount: string;
};

export async function fetchTokenHolders(
  chain: ExplorerNetwork,
  address: string,
  limit = 20,
): Promise<ExplorerHolder[] | null> {
  const paths = [
    "token/token-holder-list",
    "token/holder-list",
    "token/position-list",
    "token/token-position-list",
  ];
  const queries: Record<string, string>[] = [
    { tokenContractAddress: address, limit: String(limit) },
    { tokenAddress: address, limit: String(limit) },
    { contractAddress: address, limit: String(limit) },
  ];
  for (const path of paths) {
    for (const query of queries) {
      const result = await oklinkGet(path, {
        chainShortName: chainShortName(chain),
        ...query,
      });
      if (!result.ok) continue;
      const rows = Array.isArray(result.data)
        ? result.data
        : asRecord(result.data)?.["positionList"] ??
          asRecord(result.data)?.["holderList"] ??
          asRecord(result.data)?.["tokenHolderList"];
      if (!Array.isArray(rows)) continue;
      const holders: ExplorerHolder[] = [];
      for (const row of rows) {
        const rec = asRecord(row);
        if (!rec) continue;
        const addr = String(
          rec.holderAddress ?? rec.address ?? rec.holder ?? "",
        );
        const amount = String(
          rec.amount ?? rec.balance ?? rec.holdAmount ?? rec.value ?? "",
        );
        if (addr.startsWith("0x")) holders.push({ address: addr, amount });
      }
      if (holders.length > 0) return holders;
    }
  }
  return null;
}

export async function fetchContractCreator(
  chain: ExplorerNetwork,
  address: string,
): Promise<string | null> {
  const paths = [
    "address/contract-creation",
    "contract/creation-info",
    "address/information",
  ];
  for (const path of paths) {
    const result = await oklinkGet(path, {
      chainShortName: chainShortName(chain),
      address,
      contractAddress: address,
    });
    if (!result.ok) continue;
    const row = Array.isArray(result.data)
      ? asRecord(result.data[0])
      : asRecord(result.data);
    if (!row) continue;
    const creator = String(
      row.creator ??
        row.contractCreator ??
        row.creatorAddress ??
        row.deployer ??
        "",
    );
    if (creator.startsWith("0x") && creator.length === 42) return creator;
  }
  return null;
}

export async function fetchCreatedContracts(
  chain: ExplorerNetwork,
  deployer: string,
): Promise<string[] | null> {
  const result = await oklinkGet("address/contract-creation", {
    chainShortName: chainShortName(chain),
    address: deployer,
  });
  if (!result.ok) return null;
  const rows = Array.isArray(result.data)
    ? result.data
    : asRecord(result.data)?.["contractList"];
  if (!Array.isArray(rows)) return null;
  const addresses: string[] = [];
  for (const row of rows) {
    const rec = asRecord(row);
    const addr = String(
      rec?.contractAddress ?? rec?.address ?? (typeof row === "string" ? row : ""),
    );
    if (addr.startsWith("0x")) addresses.push(addr);
  }
  return addresses;
}
