import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tokenId: string }>;
}): Promise<Metadata> {
  const { tokenId } = await params;
  const num = Number(tokenId);
  const valid = Number.isInteger(num) && num >= 0 && num <= 3332;
  const title = valid
    ? `BOOA #${tokenId} — MoltBooa Lab`
    : "MoltBooa Lab";
  const description = valid
    ? `A day on Moltbook with BOOA #${tokenId}. Power Score, services, alliances, future lore.`
    : "Born On-chain Owned Agents — simulate any of the 3,333 BOOA on Shape Network.";

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default function SimulateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
