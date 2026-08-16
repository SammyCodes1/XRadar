import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import type { Address } from "viem";

export type DetectionState = {
  lastScannedBlock: number;
  seenTokens: Address[];
};

export interface DetectionStore {
  load(): Promise<DetectionState>;
  save(state: DetectionState): Promise<void>;
}

const emptyState = (): DetectionState => ({
  lastScannedBlock: 0,
  seenTokens: [],
});

/**
 * File-backed store for local / single-process runs.
 *
 * Production / Vercel Cron: replace this with Vercel KV, Redis, or Postgres.
 * The serverless filesystem is ephemeral and is not shared across invocations,
 * so a file store will reset last-scanned block and lose dedup history.
 */
export class FileDetectionStore implements DetectionStore {
  constructor(private readonly filePath: string) {}

  async load(): Promise<DetectionState> {
    try {
      const raw = await readFile(this.filePath, "utf8");
      const parsed = JSON.parse(raw) as Partial<DetectionState>;
      const lastScannedBlock = Number(parsed.lastScannedBlock ?? 0);
      const seenTokens = Array.isArray(parsed.seenTokens)
        ? parsed.seenTokens.filter(
            (value): value is Address =>
              typeof value === "string" && /^0x[0-9a-fA-F]{40}$/.test(value),
          )
        : [];
      return {
        lastScannedBlock: Number.isFinite(lastScannedBlock)
          ? lastScannedBlock
          : 0,
        seenTokens,
      };
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code === "ENOENT") return emptyState();
      throw error;
    }
  }

  async save(state: DetectionState): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true });
    const tmp = `${this.filePath}.tmp`;
    const body = `${JSON.stringify(
      {
        lastScannedBlock: state.lastScannedBlock,
        seenTokens: [...new Set(state.seenTokens.map((a) => a.toLowerCase()))],
      },
      null,
      2,
    )}\n`;
    await writeFile(tmp, body, "utf8");
    try {
      await rename(tmp, this.filePath);
    } catch {
      await unlink(this.filePath).catch(() => undefined);
      await rename(tmp, this.filePath);
    }
  }
}

export function defaultStorePath(network: string): string {
  const base = process.env.VERCEL ? "/tmp" : process.cwd();
  return resolve(base, ".data", `detection-${network}.json`);
}
