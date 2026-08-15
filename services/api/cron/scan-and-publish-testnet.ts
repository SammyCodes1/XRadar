import type { VercelRequest, VercelResponse } from "@vercel/node";
import handler from "./scan-and-publish.js";

export default async function testnetCron(
  req: VercelRequest,
  res: VercelResponse,
) {
  req.query.chain = "testnet";
  return handler(req, res);
}
