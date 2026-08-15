import { createPublicClient, http } from "viem";
import { DEPLOYED_ADDRESSES } from "../shared/src/addresses.ts";
import { getNetwork } from "../shared/src/networks.ts";

const abi = [
  {
    type: "function",
    name: "getAllScannedTokens",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "tokens", type: "address[]" }],
  },
  {
    type: "function",
    name: "getLatestScore",
    stateMutability: "view",
    inputs: [{ name: "token", type: "address" }],
    outputs: [
      { name: "score", type: "uint8" },
      { name: "reportURI", type: "string" },
      { name: "timestamp", type: "uint256" },
    ],
  },
];

for (const network of ["testnet", "mainnet"]) {
  const cfg = getNetwork(network);
  const deployed = DEPLOYED_ADDRESSES[network];
  const client = createPublicClient({
    chain: {
      id: cfg.chainId,
      name: cfg.name,
      nativeCurrency: cfg.nativeCurrency,
      rpcUrls: { default: { http: [cfg.rpcUrl] } },
    },
    transport: http(cfg.rpcUrl),
  });
  const tokens = await client.readContract({
    address: deployed.RiskRegistry,
    abi,
    functionName: "getAllScannedTokens",
  });
  console.log(network, "registry", deployed.RiskRegistry, "count", tokens.length);
  for (const token of tokens.slice(-3)) {
    const score = await client.readContract({
      address: deployed.RiskRegistry,
      abi,
      functionName: "getLatestScore",
      args: [token],
    });
    console.log(" ", token, "score", Number(score[0]));
  }
}
