import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import type { Address } from "viem";

export type PostedAlert = {
  token: Address;
  score: number;
  tweetId: string;
  postedAt: string;
  reason: "score" | "honeypot";
};

export type AlertStoreState = {
  posts: PostedAlert[];
};

export class FileAlertStore {
  constructor(private readonly filePath: string) {}

  async load(): Promise<AlertStoreState> {
    try {
      const raw = await readFile(this.filePath, "utf8");
      const parsed = JSON.parse(raw) as Partial<AlertStoreState>;
      const posts = Array.isArray(parsed.posts)
        ? parsed.posts.filter(
            (row): row is PostedAlert =>
              typeof row?.token === "string" &&
              /^0x[0-9a-fA-F]{40}$/.test(row.token) &&
              typeof row.tweetId === "string" &&
              row.tweetId.length > 0,
          )
        : [];
      return { posts };
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code === "ENOENT") return { posts: [] };
      throw error;
    }
  }

  async save(state: AlertStoreState): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true });
    const tmp = `${this.filePath}.tmp`;
    await writeFile(tmp, `${JSON.stringify(state, null, 2)}\n`, "utf8");
    try {
      await rename(tmp, this.filePath);
    } catch {
      await unlink(this.filePath).catch(() => undefined);
      await rename(tmp, this.filePath);
    }
  }

  async find(token: string): Promise<PostedAlert | undefined> {
    const state = await this.load();
    const key = token.toLowerCase();
    return state.posts.find((row) => row.token.toLowerCase() === key);
  }

}

export function alreadyPosted(posts: PostedAlert[], token: string): boolean {
  const key = token.toLowerCase();
  return posts.some((row) => row.token.toLowerCase() === key);
}

export function defaultAlertStorePath(network: string): string {
  return resolve(process.cwd(), ".data", `x-alerts-${network}.json`);
}
