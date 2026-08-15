import { createPublicClient, http, type Chain, type PublicClient } from "viem";
import { getNetwork, type XLayerNetwork } from "@xradar/shared";

export type DetectionNetwork = XLayerNetwork;

export function chainFor(network: DetectionNetwork): Chain {
  const config = getNetwork(network);
  return {
    id: config.chainId,
    name: config.name,
    nativeCurrency: config.nativeCurrency,
    rpcUrls: { default: { http: [config.rpcUrl] } },
  } as const satisfies Chain;
}

export function rpcFor(network: DetectionNetwork): string {
  return getNetwork(network).rpcUrl;
}

export const xLayerMainnet = chainFor("mainnet");
export const xLayerTestnet = chainFor("testnet");

export function createXLayerPublicClient(
  network: DetectionNetwork,
  rpcUrl?: string,
): PublicClient {
  const chain = chainFor(network);
  return createPublicClient({
    chain,
    transport: http(rpcUrl ?? rpcFor(network), {
      timeout: 30_000,
      retryCount: 3,
    }),
  });
}
