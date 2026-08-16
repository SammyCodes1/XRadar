import type {
  DeployerHistoryFinding,
  OwnerDeployerFinding,
  OwnershipStatusFinding,
} from "@xradar/shared";
import type { PublicClient } from "viem";
import { ZERO_ADDRESS } from "./constants";

export async function checkOwnerDeployer(
  client: PublicClient,
  ownership: OwnershipStatusFinding,
  deployer: DeployerHistoryFinding,
): Promise<OwnerDeployerFinding> {
  const owner = ownership.owner;
  const creator = deployer.deployer;

  if (!owner && !creator) {
    return {
      status: "unknown",
      owner: null,
      deployer: null,
      sameWallet: null,
      ownerIsContract: null,
      error: ownership.error ?? deployer.error ?? "owner and deployer unknown",
    };
  }

  let ownerIsContract: boolean | null = null;
  if (owner && owner.toLowerCase() !== ZERO_ADDRESS) {
    try {
      const code = await client.getCode({ address: owner });
      ownerIsContract = Boolean(code && code !== "0x");
    } catch {
      ownerIsContract = null;
    }
  } else if (owner) {
    ownerIsContract = false;
  }

  const sameWallet =
    owner && creator
      ? owner.toLowerCase() === creator.toLowerCase()
      : null;

  return {
    status: owner || creator ? "ok" : "unknown",
    owner,
    deployer: creator,
    sameWallet,
    ownerIsContract,
    error:
      !owner || !creator
        ? "could not compare both sides"
        : undefined,
  };
}
