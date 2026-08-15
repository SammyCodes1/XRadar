import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import type { Address } from "viem";
import type { XLayerNetwork } from "@xradar/shared";

export type PipelineItem = {
  token: Address;
  stage: "found" | "checked" | "synthesized" | "published" | "failed";
  score?: number;
  txHash?: string;
  error?: string;
  report?: {
    summary?: string;
    flags?: Record<
      string,
      { key: string; label: string; triggered: boolean; detail?: string }
    >;
    score?: { overall?: number };
  };
};

export type PipelineRun = {
  chain: XLayerNetwork;
  items: PipelineItem[];
};

function repoRoot(): string {
  const cwd = process.cwd();
  const candidates = [cwd, resolve(cwd, ".."), resolve(cwd, "../..")];
  for (const dir of candidates) {
    if (existsSync(resolve(dir, "services/src/orchestrator/run-local.ts"))) {
      return dir;
    }
  }
  throw new Error("Could not find services/src/orchestrator/run-local.ts");
}

function tsxCli(root: string): string {
  const candidates = [
    resolve(root, "node_modules/tsx/dist/cli.mjs"),
    resolve(root, "services/node_modules/tsx/dist/cli.mjs"),
    resolve(root, "frontend/node_modules/tsx/dist/cli.mjs"),
  ];
  for (const file of candidates) {
    if (existsSync(file)) return file;
  }
  throw new Error("tsx is not installed. Run npm install from the repo root.");
}

function extractJson(stdout: string): unknown {
  const fromNewline = stdout.lastIndexOf("\n{");
  const start = fromNewline >= 0 ? fromNewline + 1 : stdout.indexOf("{");
  if (start < 0) {
    throw new Error("Pipeline printed no JSON result");
  }
  return JSON.parse(stdout.slice(start));
}

/**
 * Trigger Prompt 7's scanAndPublish for one address via the services CLI.
 * Next/Turbopack cannot bundle the services .js TypeScript graph, so the
 * serverless route execs the same orchestrator locally.
 */
export function runScanAndPublish(
  address: Address,
  chain: XLayerNetwork,
): Promise<PipelineRun> {
  const root = repoRoot();
  const tsx = tsxCli(root);
  const script = resolve(root, "services/src/orchestrator/run-local.ts");

  return new Promise((resolvePromise, reject) => {
    const child = spawn(
      process.execPath,
      [
        tsx,
        script,
        "--chain",
        chain,
        "--force",
        address,
        "--skip-detection",
        "--max-tokens",
        "1",
      ],
      {
        cwd: resolve(root, "services"),
        env: process.env,
        windowsHide: true,
      },
    );

    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error("scanAndPublish timed out after 4 minutes"));
    }, 240_000);

    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString("utf8");
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8");
    });
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        reject(
          new Error(
            stderr.trim() ||
              stdout.trim() ||
              `scanAndPublish exited with code ${code}`,
          ),
        );
        return;
      }
      try {
        resolvePromise(extractJson(stdout) as PipelineRun);
      } catch (error) {
        reject(error);
      }
    });
  });
}
