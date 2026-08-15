import type { AbiEvent, Address, Log, PublicClient } from "viem";

const MAX_LOG_SPAN = 100n;

export async function getLogsChunked(params: {
  client: PublicClient;
  address: Address;
  event: AbiEvent;
  args?: { from?: Address; to?: Address };
  fromBlock: bigint;
  toBlock: bigint;
  maxChunks?: number;
}): Promise<Log[]> {
  const logs: Log[] = [];
  const maxChunks = params.maxChunks ?? 15;
  let end = params.toBlock;
  let chunks = 0;
  while (end >= params.fromBlock && chunks < maxChunks) {
    const start =
      end + 1n > MAX_LOG_SPAN ? end - MAX_LOG_SPAN + 1n : params.fromBlock;
    const fromBlock = start < params.fromBlock ? params.fromBlock : start;
    const page = await params.client.getLogs({
      address: params.address,
      event: params.event,
      args: params.args,
      fromBlock,
      toBlock: end,
    });
    logs.push(...page);
    if (fromBlock === params.fromBlock) break;
    end = fromBlock - 1n;
    chunks += 1;
  }
  return logs;
}
