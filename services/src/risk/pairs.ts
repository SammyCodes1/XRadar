import {
  type Address,
  type PublicClient,
  zeroAddress,
} from "viem";
import {
  UNISWAP_V2_FACTORY,
  UNISWAP_V2_ROUTER,
  WOKB,
  uniswapV2FactoryAbi,
  uniswapV2PairAbi,
  uniswapV2RouterAbi,
} from "./constants";

export type PrimaryPair = {
  pair: Address;
  token0: Address;
  token1: Address;
  reserveToken: bigint;
  reserveWokb: bigint;
  router: Address;
  factory: Address;
};

export async function findPrimaryWokbPair(
  client: PublicClient,
  token: Address,
): Promise<PrimaryPair | null> {
  const factoryCode = await client.getCode({ address: UNISWAP_V2_FACTORY });
  if (!factoryCode || factoryCode === "0x") return null;

  const pair = await client.readContract({
    address: UNISWAP_V2_FACTORY,
    abi: uniswapV2FactoryAbi,
    functionName: "getPair",
    args: [token, WOKB],
  });
  if (!pair || pair.toLowerCase() === zeroAddress) return null;

  const [token0, token1, reserves] = await Promise.all([
    client.readContract({
      address: pair,
      abi: uniswapV2PairAbi,
      functionName: "token0",
    }),
    client.readContract({
      address: pair,
      abi: uniswapV2PairAbi,
      functionName: "token1",
    }),
    client.readContract({
      address: pair,
      abi: uniswapV2PairAbi,
      functionName: "getReserves",
    }),
  ]);

  const tokenIs0 = token0.toLowerCase() === token.toLowerCase();
  const reserveToken = tokenIs0 ? reserves[0] : reserves[1];
  const reserveWokb = tokenIs0 ? reserves[1] : reserves[0];
  if (reserveToken === 0n || reserveWokb === 0n) return null;

  return {
    pair,
    token0,
    token1,
    reserveToken,
    reserveWokb,
    router: UNISWAP_V2_ROUTER,
    factory: UNISWAP_V2_FACTORY,
  };
}

export async function getAmountsOut(
  client: PublicClient,
  amountIn: bigint,
  path: readonly Address[],
): Promise<bigint[] | null> {
  try {
    const amounts = await client.readContract({
      address: UNISWAP_V2_ROUTER,
      abi: uniswapV2RouterAbi,
      functionName: "getAmountsOut",
      args: [amountIn, [...path]],
    });
    return [...amounts];
  } catch {
    return null;
  }
}
