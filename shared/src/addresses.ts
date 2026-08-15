import type { XLayerNetwork } from "./types";
import { XLAYER_NETWORKS } from "./networks";

type Address = `0x${string}`;

export type DeployedNetwork = {
  RiskRegistry: Address | "";
  chainId: number;
  oracle?: Address | "";
};

export const DEPLOYED_ADDRESSES: Record<XLayerNetwork, DeployedNetwork> = {
  testnet: {
    RiskRegistry: "0x6A85d6C8609B52d8B5eb0a9FC5F5174a4BaeeCf3",
    chainId: 1952,
    oracle: "0x71642aA8c7Ce88Ed823a1DE91646eDe035Ff6Ea6",
  },
  mainnet: {
    RiskRegistry: "0x4720a706Fb1688559f7966ed50D161B275D8D87b",
    chainId: 196,
    oracle: "0xEB6654d156a0e098825989050Cac69b959579b25",
  },
};

function envRegistry(network: XLayerNetwork): string | undefined {
  if (typeof process === "undefined" || !process.env) return undefined;
  if (network === "mainnet") {
    return (
      process.env.ORACLE_CONTRACT_ADDRESS_MAINNET ||
      process.env.NEXT_PUBLIC_RISK_REGISTRY_MAINNET
    );
  }
  return (
    process.env.ORACLE_CONTRACT_ADDRESS_TESTNET ||
    process.env.NEXT_PUBLIC_RISK_REGISTRY_TESTNET ||
    process.env.ORACLE_CONTRACT_ADDRESS
  );
}

export function getRegistryAddress(network: XLayerNetwork): Address {
  const fromEnv = envRegistry(network);
  if (fromEnv && /^0x[0-9a-fA-F]{40}$/.test(fromEnv)) {
    return fromEnv as Address;
  }
  const configured = DEPLOYED_ADDRESSES[network].RiskRegistry;
  if (!configured) {
    throw new Error(`No RiskRegistry address configured for ${network}`);
  }
  return configured;
}

export function tryRegistryAddress(
  network: XLayerNetwork,
): Address | undefined {
  try {
    return getRegistryAddress(network);
  } catch {
    return undefined;
  }
}

export function registryByChainId(chainId: number): Address | undefined {
  if (chainId === XLAYER_NETWORKS.mainnet.chainId) {
    return tryRegistryAddress("mainnet");
  }
  if (chainId === XLAYER_NETWORKS.testnet.chainId) {
    return tryRegistryAddress("testnet");
  }
  return undefined;
}
