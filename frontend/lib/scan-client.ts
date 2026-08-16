import type { XLayerNetwork } from "@xradar/shared";

export type ScanFlag = {
  key: string;
  label: string;
  triggered: boolean;
  detail?: string;
};

export type ScanItem = {
  token: string;
  stage: string;
  score?: number;
  txHash?: string;
  error?: string;
  report?: {
    summary?: string;
    flags?: Record<string, ScanFlag>;
    score?: { overall?: number };
    checks?: unknown;
    generatedAt?: string;
    token?: {
      symbol?: string;
      name?: string;
      decimals?: number;
      poolOkb?: string;
      address?: string;
    };
  };
};

export type ScanResponse = {
  ok: boolean;
  error?: string;
  item?: ScanItem;
};

export async function requestScan(
  address: string,
  chain: XLayerNetwork,
): Promise<ScanResponse> {
  const response = await fetch("/api/scan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address, chain }),
  });
  const payload = (await response.json()) as ScanResponse;
  if (!response.ok || !payload.ok) {
    return {
      ok: false,
      error: payload.error ?? "Scan failed. Try again.",
      item: payload.item,
    };
  }
  return payload;
}
