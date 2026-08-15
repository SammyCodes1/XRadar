import type { IncomingMessage, ServerResponse } from "node:http";

export type JsonRecord = Record<string, unknown>;

export type FunctionHandler = (
  req: IncomingMessage,
  res: ServerResponse,
) => Promise<void> | void;

export function sendJson(
  res: ServerResponse,
  status: number,
  body: unknown,
): void {
  const payload = JSON.stringify(body);
  res.statusCode = status;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  res.end(payload);
}

export function sendError(
  res: ServerResponse,
  status: number,
  message: string,
): void {
  sendJson(res, status, { ok: false, error: message });
}

export async function readJsonBody(
  req: IncomingMessage,
): Promise<JsonRecord | undefined> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  if (chunks.length === 0) return undefined;
  const raw = Buffer.concat(chunks).toString("utf8").trim();
  if (!raw) return undefined;
  const parsed: unknown = JSON.parse(raw);
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("JSON body must be an object");
  }
  return parsed as JsonRecord;
}

export function setCors(res: ServerResponse): void {
  res.setHeader("access-control-allow-origin", "*");
  res.setHeader("access-control-allow-methods", "GET,POST,OPTIONS");
  res.setHeader("access-control-allow-headers", "content-type,authorization");
}
