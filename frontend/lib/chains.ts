import { defineChain } from "viem";
import { getNetwork } from "@xradar/shared";

const mainnet = getNetwork("mainnet");
const testnet = getNetwork("testnet");

export const xLayer = defineChain({
  id: mainnet.chainId,
  name: mainnet.name,
  nativeCurrency: mainnet.nativeCurrency,
  rpcUrls: {
    default: { http: [mainnet.rpcUrl] },
  },
  blockExplorers: {
    default: { name: "OKX Explorer", url: mainnet.explorerUrl },
  },
});

export const xLayerTestnet = defineChain({
  id: testnet.chainId,
  name: testnet.name,
  nativeCurrency: testnet.nativeCurrency,
  rpcUrls: {
    default: { http: [testnet.rpcUrl] },
  },
  blockExplorers: {
    default: { name: "OKX Explorer", url: testnet.explorerUrl },
  },
  testnet: true,
});
