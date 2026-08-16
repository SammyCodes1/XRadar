import type { Metadata } from "next";
import { WatchlistView } from "../../components/watchlist-view";

export const metadata: Metadata = {
  title: "Watchlist - XRadar",
  description: "Saved tokens with live RiskRegistry scores. Share the list link to open it on another device.",
};

type PageProps = {
  searchParams: Promise<{ w?: string; chain?: string }>;
};

export default async function WatchlistPage({ searchParams }: PageProps) {
  const query = await searchParams;
  return <WatchlistView watchParam={query.w} chainHint={query.chain} />;
}
