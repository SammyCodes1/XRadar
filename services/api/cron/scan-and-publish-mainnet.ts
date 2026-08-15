import type { VercelRequest, VercelResponse } from "@vercel/node";
import handler from "./scan-and-publish.js";

export default async function mainnetCron(
  req: VercelRequest,
  res: VercelResponse,
) {
  req.query.chain = "mainnet";
  return handler(req, res);
}
