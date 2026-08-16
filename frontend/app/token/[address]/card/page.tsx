import type { Metadata } from "next";
import { isAddress } from "viem";
import { ShareCardView } from "../../../../components/share-card-view";
import { shortenAddress } from "../../../../lib/format";

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
    title: `${label} card - XRadar`,
    description: "Shareable XRadar screener card from RiskRegistry.",
  };
}

export default async function TokenCardPage({
  params,
  searchParams,
}: PageProps) {
  const { address } = await params;
  const query = await searchParams;
  return <ShareCardView address={address} chainHint={query.chain} />;
}
