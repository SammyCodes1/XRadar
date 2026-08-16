import type { Metadata } from "next";
import { WatchlistView } from "../../components/watchlist-view";

export const metadata: Metadata = {
  title: "Watchlist - XRadar",
  description: "Tokens you saved on this device, with live RiskRegistry scores.",
};

export default function WatchlistPage() {
  return <WatchlistView />;
}
