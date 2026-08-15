import type { Hex } from "viem";

/** ERC-20 function selectors we require in deployed bytecode. */
export const ERC20_SELECTORS = {
  transfer: "a9059cbb",
  balanceOf: "70a08231",
  totalSupply: "18160ddd",
} as const;

/**
 * True when bytecode contains transfer, balanceOf, and totalSupply selectors.
 * This is a cheap prefilter, not a full ERC-20 compliance check.
 */
export function isErc20Bytecode(bytecode: Hex | undefined | null): boolean {
  if (!bytecode || bytecode === "0x") return false;
  const hex = bytecode.slice(2).toLowerCase();
  return (
    hex.includes(ERC20_SELECTORS.transfer) &&
    hex.includes(ERC20_SELECTORS.balanceOf) &&
    hex.includes(ERC20_SELECTORS.totalSupply)
  );
}
