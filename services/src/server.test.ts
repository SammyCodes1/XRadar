import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { describe, it, after } from "node:test";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const port = 18787;
const root = dirname(fileURLToPath(import.meta.url));
const child = spawn(process.execPath, ["--import", "tsx", join(root, "server.ts")], {
  env: { ...process.env, PORT: String(port) },
  stdio: ["ignore", "pipe", "pipe"],
});

await once(child.stdout, "data");

after(() => {
  child.kill("SIGTERM");
});

describe("services scaffold", () => {
  it("serves health", async () => {
    const res = await fetch(`http://127.0.0.1:${port}/health`);
    assert.equal(res.status, 200);
    const body = (await res.json()) as { ok: boolean; service: string };
    assert.equal(body.ok, true);
    assert.equal(body.service, "xradar-services");
  });

  it("serves detection health", async () => {
    const res = await fetch(`http://127.0.0.1:${port}/detection`);
    assert.equal(res.status, 200);
    const body = (await res.json()) as { service: string };
    assert.equal(body.service, "detection");
  });
});
