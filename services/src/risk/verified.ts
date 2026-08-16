import type { VerifiedContractFinding } from "@xradar/shared";
import { fetchVerifiedSource, type ExplorerNetwork } from "./explorer";

export async function checkVerifiedContract(
  token: string,
  chain: ExplorerNetwork,
): Promise<VerifiedContractFinding> {
  try {
    const info = await fetchVerifiedSource(chain, token);
    if (!info) {
      return {
        status: "unknown",
        verified: null,
        error: "explorer did not return verification info",
      };
    }
    return {
      status: "ok",
      verified: info.verified,
      contractName: info.contractName,
      compilerVersion: info.compilerVersion,
    };
  } catch (error) {
    return {
      status: "unknown",
      verified: null,
      error: error instanceof Error ? error.message : "verify check failed",
    };
  }
}
