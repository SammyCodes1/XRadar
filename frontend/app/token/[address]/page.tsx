import type { Metadata } from "next";
import { isAddress } from "viem";
import { SiteHeader } from "../../../components/site-header";
import { TokenDetail } from "../../../components/token-detail";
import { shortenAddress } from "../../../lib/format";

type PageProps = {
  params: Promise<{ address: string }>;
  searchParams: Promise<{ chain?: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { address } = await params;
  const label = isAddress(address) ? shortenAddress(address) : "Invalid token";
  return {
    title: `${label} - XRadar`,
    description: "On-chain risk report from RiskRegistry on X Layer.",
  };
}

export default async function TokenPage({ params, searchParams }: PageProps) {
  const { address } = await params;
  const query = await searchParams;
  return (
    <div className="flex min-h-[100dvh] flex-col">
      <SiteHeader />
      <main className="flex-1">
        <TokenDetail address={address} chainHint={query.chain} />
      </main>
    </div>
  );
}
