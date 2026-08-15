import { http, createConfig } from "wagmi";
import { injected, metaMask } from "wagmi/connectors";
import { xLayer, xLayerTestnet } from "./chains";

export function getWagmiConfig() {
  return createConfig({
    chains: [xLayerTestnet, xLayer],
    connectors: [
      injected({ target: "okxWallet" }),
      metaMask({
        dappMetadata: {
          name: "XRadar",
          url: "https://www.okx.com/web3/explorer/xlayer",
        },
      }),
    ],
    ssr: true,
    transports: {
      [xLayer.id]: http(xLayer.rpcUrls.default.http[0]),
      [xLayerTestnet.id]: http(xLayerTestnet.rpcUrls.default.http[0]),
    },
  });
}

declare module "wagmi" {
  interface Register {
    config: ReturnType<typeof getWagmiConfig>;
  }
}
