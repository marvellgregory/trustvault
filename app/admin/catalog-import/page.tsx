import type { Metadata } from "next";

import { CatalogImporter } from "@/components/marketplace/importer/CatalogImporter";

export const metadata: Metadata = {
  title: "Catalog Import | TrustVault",
  description:
    "Validate and import the TrustVault marketplace catalog.",
};

export default function CatalogImportPage() {
  return (
    <main className="min-h-screen bg-zinc-50">
      <CatalogImporter />
    </main>
  );
}
