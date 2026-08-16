import type { Metadata } from "next";
import { CompareView } from "../../components/compare-view";

export const metadata: Metadata = {
  title: "Compare - XRadar",
  description: "Compare two X Layer tokens. Unscanned addresses are scanned first.",
};

type PageProps = {
  searchParams: Promise<{ a?: string; b?: string; chain?: string }>;
};

export default async function ComparePage({ searchParams }: PageProps) {
  const query = await searchParams;
  return (
    <CompareView
      initialA={query.a}
      initialB={query.b}
      chainHint={query.chain}
    />
  );
}
