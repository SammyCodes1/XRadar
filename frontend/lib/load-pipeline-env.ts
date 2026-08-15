import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

function applyEnvFile(filePath: string): void {
  if (!existsSync(filePath)) return;
  const text = readFileSync(filePath, "utf8");
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    if (!key || process.env[key]) continue;
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!value) continue;
    process.env[key] = value;
  }
}

/** Load monorepo env files so the API route can run scanAndPublish. */
export function loadPipelineEnv(): void {
  const cwd = process.cwd();
  const files = [
    resolve(cwd, "../contracts/.env"),
    resolve(cwd, "../.env"),
    resolve(cwd, "../../contracts/.env"),
    resolve(cwd, "../../.env"),
    resolve(cwd, ".env"),
    resolve(cwd, ".env.local"),
  ];
  for (const file of files) {
    applyEnvFile(file);
  }
}
