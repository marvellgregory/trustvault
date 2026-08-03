import type { Metadata } from "next";

import { MarketplaceCatalog } from "@/components/marketplace/MarketplaceCatalog";

export const metadata: Metadata = {
  title: "Marketplace | TrustVault",
  description:
    "Discover products prepared for trusted commerce through TrustVault.",
};

export default function MarketplacePage() {
  return (
    <main className="min-h-screen bg-zinc-50">
      <MarketplaceCatalog />
    </main>
  );
}
