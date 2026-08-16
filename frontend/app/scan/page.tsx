import type { Metadata } from "next";
import { LiveFeed } from "../../components/live-feed";
import { SiteHeader } from "../../components/site-header";
import { TokenSearch } from "../../components/token-search";

export const metadata: Metadata = {
  title: "Scanner - XRadar",
  description:
    "Scan an X Layer token or wait for auto-discovery. Scores publish to RiskRegistry.",
};

export default function ScanPage() {
  return (
    <div className="flex min-h-[100dvh] flex-col">
      <a
        href="#token-address"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-accent focus:px-3 focus:py-2 focus:text-sm focus:text-on-accent"
      >
        Skip to scan form
      </a>
      <SiteHeader />
      <main className="flex flex-1 flex-col">
        <TokenSearch />
        <LiveFeed />
      </main>
    </div>
  );
}
