import type { Address } from "viem";
import type { RiskReport, XLayerNetwork } from "@xradar/shared";
import { env } from "../lib/env";
import {
  composeAlertTweet,
  shouldAnnounceAlert,
} from "./composeAlert";
import {
  FileAlertStore,
  alreadyPosted,
  defaultAlertStorePath,
  type PostedAlert,
} from "./store";
import { postTweet, readXCredentials } from "./xClient";

export type AnnounceResult = {
  status: "posted" | "skipped" | "failed";
  reason?: string;
  tweetId?: string;
  tweetUrl?: string;
  text?: string;
};

export type AnnounceInput = {
  token: Address;
  chain: XLayerNetwork;
  score: number;
  report?: RiskReport;
  store?: FileAlertStore;
  dryRun?: boolean;
};

function alertReason(score: number, report?: RiskReport): PostedAlert["reason"] {
  if (report?.flags?.honeypot?.triggered) return "honeypot";
  return "score";
}

/**
 * After a successful publishScore, maybe post to the project X account.
 * Never throws: a tweet failure must not roll back the on-chain publish.
 */
export async function announcePublishedToken(
  input: AnnounceInput,
): Promise<AnnounceResult> {
  if (env.xAlertsEnabled === false) {
    return { status: "skipped", reason: "disabled" };
  }
  if (!env.xAlertsEnabledFor(input.chain)) {
    return { status: "skipped", reason: "network-disabled" };
  }
  if (
    !shouldAnnounceAlert({
      score: input.score,
      report: input.report,
      minScore: env.xAlertMinScore,
    })
  ) {
    return { status: "skipped", reason: "below-threshold" };
  }

  const store = input.store ?? new FileAlertStore(defaultAlertStorePath(input.chain));
  const state = await store.load();
  if (alreadyPosted(state.posts, input.token)) {
    return { status: "skipped", reason: "already-posted" };
  }

  const text = composeAlertTweet({
    token: input.token,
    score: input.score,
    chain: input.chain,
    report: input.report,
    frontendBaseUrl: env.frontendUrl,
  });

  if (input.dryRun) {
    return { status: "skipped", reason: "dry-run", text };
  }

  const credentials = readXCredentials();
  if (!credentials) {
    return { status: "skipped", reason: "missing-credentials", text };
  }

  try {
    const tweet = await postTweet(text, credentials);
    state.posts.push({
      token: input.token.toLowerCase() as Address,
      score: input.score,
      tweetId: tweet.id,
      postedAt: new Date().toISOString(),
      reason: alertReason(input.score, input.report),
    });
    await store.save(state);
    return {
      status: "posted",
      tweetId: tweet.id,
      tweetUrl: tweet.url,
      text,
    };
  } catch (error) {
    return {
      status: "failed",
      reason: error instanceof Error ? error.message : "x-post-failed",
      text,
    };
  }
}
