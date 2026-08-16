import type { TradingLimitsFinding } from "@xradar/shared";
import {
  type Address,
  type PublicClient,
  encodeFunctionData,
  parseAbi,
} from "viem";
import {
  TRANSFER_TAX_SINK,
  ZERO_ADDRESS,
  erc20Abi,
  ownableAbi,
} from "./constants";

const MAX_TX_ABI = parseAbi([
  "function maxTxAmount() view returns (uint256)",
  "function maxTransactionAmount() view returns (uint256)",
  "function _maxTxAmount() view returns (uint256)",
  "function maxTx() view returns (uint256)",
]);

const MAX_WALLET_ABI = parseAbi([
  "function maxWallet() view returns (uint256)",
  "function maxWalletAmount() view returns (uint256)",
  "function maxWalletSize() view returns (uint256)",
  "function _maxWalletSize() view returns (uint256)",
]);

const PAUSED_ABI = parseAbi(["function paused() view returns (bool)"]);
const TRADING_OPEN_ABI = parseAbi([
  "function tradingOpen() view returns (bool)",
  "function tradingEnabled() view returns (bool)",
  "function getTradingOpen() view returns (bool)",
]);

const MINT_TO_ABI = parseAbi(["function mint(address to, uint256 amount)"]);
const MINT_AMOUNT_ABI = parseAbi(["function mint(uint256 amount)"]);
const BLACKLIST_ABI = parseAbi([
  "function blacklist(address account)",
  "function addBlackList(address account)",
  "function addToBlacklist(address account)",
]);

async function firstUint(
  client: PublicClient,
  token: Address,
  abi: typeof MAX_TX_ABI | typeof MAX_WALLET_ABI,
  names: readonly string[],
): Promise<bigint | null> {
  for (const name of names) {
    try {
      const value = await client.readContract({
        address: token,
        abi,
        functionName: name as never,
      });
      if (typeof value === "bigint") return value;
    } catch {
      // try the next getter
    }
  }
  return null;
}

async function firstBool(
  client: PublicClient,
  token: Address,
  abi: typeof TRADING_OPEN_ABI,
  names: readonly string[],
): Promise<boolean | null> {
  for (const name of names) {
    try {
      const value = await client.readContract({
        address: token,
        abi,
        functionName: name as never,
      });
      if (typeof value === "boolean") return value;
    } catch {
      // try the next getter
    }
  }
  return null;
}

async function callSucceeds(
  client: PublicClient,
  token: Address,
  account: Address,
  data: `0x${string}`,
): Promise<boolean | null> {
  try {
    await client.call({ account, to: token, data });
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (/override|not supported|unimplemented/i.test(message)) return null;
    return false;
  }
}

export async function checkTradingLimits(
  client: PublicClient,
  token: Address,
): Promise<TradingLimitsFinding> {
  try {
    const [maxTx, maxWallet, pausedRaw, tradingOpen, owner, totalSupply] =
      await Promise.all([
        firstUint(client, token, MAX_TX_ABI, [
          "maxTxAmount",
          "maxTransactionAmount",
          "_maxTxAmount",
          "maxTx",
        ]),
        firstUint(client, token, MAX_WALLET_ABI, [
          "maxWallet",
          "maxWalletAmount",
          "maxWalletSize",
          "_maxWalletSize",
        ]),
        client
          .readContract({
            address: token,
            abi: PAUSED_ABI,
            functionName: "paused",
          })
          .then((value) => value as boolean)
          .catch(() => null),
        firstBool(client, token, TRADING_OPEN_ABI, [
          "tradingOpen",
          "tradingEnabled",
          "getTradingOpen",
        ]),
        client
          .readContract({
            address: token,
            abi: ownableAbi,
            functionName: "owner",
          })
          .catch(() => null),
        client
          .readContract({
            address: token,
            abi: erc20Abi,
            functionName: "totalSupply",
          })
          .catch(() => null),
      ]);

    const actor =
      owner && owner.toLowerCase() !== ZERO_ADDRESS ? owner : ZERO_ADDRESS;
    const mintTarget = actor === ZERO_ADDRESS ? token : actor;

    const [mintTo, mintAmt, blacklistA, blacklistB, blacklistC] =
      await Promise.all([
        callSucceeds(
          client,
          token,
          actor,
          encodeFunctionData({
            abi: MINT_TO_ABI,
            functionName: "mint",
            args: [mintTarget, 1n],
          }),
        ),
        callSucceeds(
          client,
          token,
          actor,
          encodeFunctionData({
            abi: MINT_AMOUNT_ABI,
            functionName: "mint",
            args: [1n],
          }),
        ),
        callSucceeds(
          client,
          token,
          actor,
          encodeFunctionData({
            abi: BLACKLIST_ABI,
            functionName: "blacklist",
            args: [TRANSFER_TAX_SINK],
          }),
        ),
        callSucceeds(
          client,
          token,
          actor,
          encodeFunctionData({
            abi: BLACKLIST_ABI,
            functionName: "addBlackList",
            args: [TRANSFER_TAX_SINK],
          }),
        ),
        callSucceeds(
          client,
          token,
          actor,
          encodeFunctionData({
            abi: BLACKLIST_ABI,
            functionName: "addToBlacklist",
            args: [TRANSFER_TAX_SINK],
          }),
        ),
      ]);

    const mintBits = [mintTo, mintAmt].filter((value) => value != null);
    const listBits = [blacklistA, blacklistB, blacklistC].filter(
      (value) => value != null,
    );

    return {
      status: "ok",
      maxTx:
        maxTx != null && (totalSupply == null || maxTx < totalSupply)
          ? maxTx.toString()
          : maxTx != null
            ? maxTx.toString()
            : null,
      maxWallet: maxWallet != null ? maxWallet.toString() : null,
      paused: pausedRaw,
      tradingOpen,
      mintCallable: mintBits.length === 0 ? null : mintBits.some(Boolean),
      blacklistCallable: listBits.length === 0 ? null : listBits.some(Boolean),
    };
  } catch (error) {
    return {
      status: "unknown",
      maxTx: null,
      maxWallet: null,
      paused: null,
      tradingOpen: null,
      mintCallable: null,
      blacklistCallable: null,
      error: error instanceof Error ? error.message : "trading limits failed",
    };
  }
}
