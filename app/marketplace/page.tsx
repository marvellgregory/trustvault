import type { Metadata } from "next";

import { MarketplaceCatalog } from "@/components/marketplace/MarketplaceCatalog";

export const metadata: Metadata = {
  title: "Marketplace | TrustVault",
  description:
    "Discover products available through the TrustVault Marketplace experience.",
};

export default function MarketplacePage() {
  return (
    <main className="min-h-screen bg-zinc-50">
      <MarketplaceCatalog />
    </main>
  );
}

