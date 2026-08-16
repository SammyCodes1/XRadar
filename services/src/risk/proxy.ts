import type { ProxyFinding } from "@xradar/shared";
import {
  type Address,
  type Hex,
  type PublicClient,
  getAddress,
  isAddress,
} from "viem";
import {
  EIP1967_ADMIN_SLOT,
  EIP1967_IMPLEMENTATION_SLOT,
  ZERO_ADDRESS,
} from "./constants";

const implementationAbi = [
  {
    type: "function",
    name: "implementation",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "address" }],
  },
] as const;

function addressFromSlot(slot: Hex | undefined): Address | null {
  if (!slot || slot === "0x") return null;
  const hex = slot.toLowerCase().replace(/^0x/, "").padStart(64, "0");
  const tail = `0x${hex.slice(-40)}`;
  if (!isAddress(tail) || tail.toLowerCase() === ZERO_ADDRESS) return null;
  return getAddress(tail);
}

function parseMinimalProxy(code: Hex | undefined): Address | null {
  if (!code || code === "0x") return null;
  const hex = code.slice(2).toLowerCase();
  const prefix = "363d3d373d3d3d363d73";
  const suffix = "5af43d82803e903d91602b57fd5bf3";
  if (!hex.startsWith(prefix) || !hex.endsWith(suffix) || hex.length < 90) {
    return null;
  }
  const embedded = `0x${hex.slice(prefix.length, prefix.length + 40)}`;
  if (!isAddress(embedded) || embedded.toLowerCase() === ZERO_ADDRESS) {
    return null;
  }
  return getAddress(embedded);
}

async function hasCode(
  client: PublicClient,
  address: Address | null,
): Promise<boolean> {
  if (!address) return false;
  const code = await client.getCode({ address });
  return Boolean(code && code !== "0x");
}

export async function checkProxy(
  client: PublicClient,
  token: Address,
): Promise<ProxyFinding> {
  try {
    const code = await client.getCode({ address: token });
    if (!code || code === "0x") {
      return {
        status: "unknown",
        isProxy: null,
        kind: null,
        implementation: null,
        admin: null,
        error: "no bytecode at token address",
      };
    }

    const clone = parseMinimalProxy(code);
    const [implSlot, adminSlot] = await Promise.all([
      client.getStorageAt({
        address: token,
        slot: EIP1967_IMPLEMENTATION_SLOT,
      }),
      client.getStorageAt({
        address: token,
        slot: EIP1967_ADMIN_SLOT,
      }),
    ]);

    const eip1967Impl = addressFromSlot(implSlot);
    const admin = addressFromSlot(adminSlot);

    let implementation = clone ?? eip1967Impl;
    let kind: ProxyFinding["kind"] = clone
      ? "eip1167"
      : eip1967Impl
        ? "eip1967"
        : null;

    if (!implementation) {
      try {
        const viaFn = await client.readContract({
          address: token,
          abi: implementationAbi,
          functionName: "implementation",
        });
        if (viaFn && viaFn.toLowerCase() !== ZERO_ADDRESS) {
          implementation = getAddress(viaFn);
          kind = "implementation-fn";
        }
      } catch {
        // not every token exposes implementation()
      }
    }

    const implHasCode = await hasCode(client, implementation);
    if (!implHasCode) {
      return {
        status: "ok",
        isProxy: false,
        kind: null,
        implementation: null,
        admin,
      };
    }

    return {
      status: "ok",
      isProxy: true,
      kind,
      implementation,
      admin,
    };
  } catch (error) {
    return {
      status: "unknown",
      isProxy: null,
      kind: null,
      implementation: null,
      admin: null,
      error: error instanceof Error ? error.message : "proxy check failed",
    };
  }
}
