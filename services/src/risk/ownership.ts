import type { OwnershipStatusFinding } from "@xradar/shared";
import type { Address, Hex, PublicClient } from "viem";
import { SELECTORS, ZERO_ADDRESS, ownableAbi } from "./constants";
import { fetchVerifiedSource, type ExplorerNetwork } from "./explorer";

function bytecodeHasSelector(code: Hex | undefined, selector: string): boolean {
  if (!code || code === "0x") return false;
  return code.slice(2).toLowerCase().includes(selector.toLowerCase());
}

function sourceHasFn(source: string, names: string[]): boolean {
  const lower = source.toLowerCase();
  return names.some((name) => {
    const re = new RegExp(`function\\s+${name}\\s*\\(`, "i");
    return re.test(lower);
  });
}

export async function checkOwnershipStatus(
  client: PublicClient,
  token: Address,
  chain: ExplorerNetwork,
): Promise<OwnershipStatusFinding> {
  try {
    const [code, verified] = await Promise.all([
      client.getCode({ address: token }),
      fetchVerifiedSource(chain, token),
    ]);
    if (!code || code === "0x") {
      return {
        status: "unknown",
        hasOwnerFunction: null,
        owner: null,
        renounced: null,
        hasMint: null,
        hasBlacklist: null,
        hasPause: null,
        source: null,
        error: "no bytecode at token address",
      };
    }

    let owner: Address | null = null;
    let hasOwnerFunction = bytecodeHasSelector(code, SELECTORS.owner);
    try {
      owner = await client.readContract({
        address: token,
        abi: ownableAbi,
        functionName: "owner",
      });
      hasOwnerFunction = true;
    } catch {
      owner = null;
    }

    const source = verified?.sourceCode;
    const useSource = Boolean(source);
    const hasMint = useSource
      ? sourceHasFn(source!, ["mint", "_mint"])
      : bytecodeHasSelector(code, SELECTORS.mint);
    const hasPause = useSource
      ? sourceHasFn(source!, ["pause", "unpause"])
      : bytecodeHasSelector(code, SELECTORS.pause);
    const hasBlacklist = useSource
      ? sourceHasFn(source!, [
          "blacklist",
          "addBlackList",
          "addToBlacklist",
          "excludeFromFee",
        ])
      : bytecodeHasSelector(code, SELECTORS.blacklist) ||
        bytecodeHasSelector(code, SELECTORS.addBlackList);

    return {
      status: "ok",
      hasOwnerFunction,
      owner,
      renounced: owner ? owner.toLowerCase() === ZERO_ADDRESS : null,
      hasMint,
      hasBlacklist,
      hasPause,
      source: useSource ? "abi" : hasOwnerFunction ? "owner-call" : "bytecode",
    };
  } catch (error) {
    return {
      status: "unknown",
      hasOwnerFunction: null,
      owner: null,
      renounced: null,
      hasMint: null,
      hasBlacklist: null,
      hasPause: null,
      source: null,
      error: error instanceof Error ? error.message : "ownership check failed",
    };
  }
}
