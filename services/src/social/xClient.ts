import { env } from "../lib/env.js";
import { oauth1Header } from "./oauth1.js";

export type XCredentials = {
  apiKey: string;
  apiSecret: string;
  accessToken: string;
  accessTokenSecret: string;
};

export type CreatedTweet = {
  id: string;
  text: string;
  url: string;
};

const TWEETS_URL = "https://api.x.com/2/tweets";

export function readXCredentials(): XCredentials | null {
  const apiKey = env.xApiKey;
  const apiSecret = env.xApiSecret;
  const accessToken = env.xAccessToken;
  const accessTokenSecret = env.xAccessTokenSecret;
  if (!apiKey || !apiSecret || !accessToken || !accessTokenSecret) {
    return null;
  }
  return { apiKey, apiSecret, accessToken, accessTokenSecret };
}

export function tweetUrl(id: string): string {
  return `https://x.com/i/web/status/${id}`;
}

export async function postTweet(
  text: string,
  credentials: XCredentials,
): Promise<CreatedTweet> {
  const authorization = oauth1Header({
    method: "POST",
    url: TWEETS_URL,
    consumerKey: credentials.apiKey,
    consumerSecret: credentials.apiSecret,
    accessToken: credentials.accessToken,
    accessTokenSecret: credentials.accessTokenSecret,
  });

  const response = await fetch(TWEETS_URL, {
    method: "POST",
    headers: {
      authorization,
      "content-type": "application/json",
    },
    body: JSON.stringify({ text }),
  });

  const body = (await response.json().catch(() => ({}))) as {
    data?: { id?: string; text?: string };
    detail?: string;
    title?: string;
    errors?: { message?: string; detail?: string }[];
  };

  if (!response.ok || !body.data?.id) {
    const detail =
      body.detail ||
      body.errors?.[0]?.detail ||
      body.errors?.[0]?.message ||
      body.title ||
      `X API ${response.status}`;
    throw new Error(detail);
  }

  return {
    id: body.data.id,
    text: body.data.text ?? text,
    url: tweetUrl(body.data.id),
  };
}
