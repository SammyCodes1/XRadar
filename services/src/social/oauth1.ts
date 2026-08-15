import { createHmac, randomBytes } from "node:crypto";

export function percentEncode(value: string): string {
  return encodeURIComponent(value).replace(/[!'()*]/g, (char) => {
    return `%${char.charCodeAt(0).toString(16).toUpperCase()}`;
  });
}

export function oauth1Header(input: {
  method: string;
  url: string;
  consumerKey: string;
  consumerSecret: string;
  accessToken: string;
  accessTokenSecret: string;
  nonce?: string;
  timestamp?: string;
}): string {
  const nonce = input.nonce ?? randomBytes(16).toString("hex");
  const timestamp = input.timestamp ?? String(Math.floor(Date.now() / 1000));
  const oauth: Record<string, string> = {
    oauth_consumer_key: input.consumerKey,
    oauth_nonce: nonce,
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: timestamp,
    oauth_token: input.accessToken,
    oauth_version: "1.0",
  };

  const paramString = Object.keys(oauth)
    .sort()
    .map((key) => `${percentEncode(key)}=${percentEncode(oauth[key]!)}`)
    .join("&");

  const base = [
    input.method.toUpperCase(),
    percentEncode(input.url),
    percentEncode(paramString),
  ].join("&");

  const signingKey = `${percentEncode(input.consumerSecret)}&${percentEncode(
    input.accessTokenSecret,
  )}`;
  oauth.oauth_signature = createHmac("sha1", signingKey)
    .update(base)
    .digest("base64");

  const header = Object.keys(oauth)
    .sort()
    .map((key) => `${percentEncode(key)}="${percentEncode(oauth[key]!)}"`)
    .join(", ");
  return `OAuth ${header}`;
}
