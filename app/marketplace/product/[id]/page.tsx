import type { Metadata } from "next";

import { ProductDetails } from "@/components/marketplace/product/ProductDetails";

type ProductPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export const metadata: Metadata = {
  title: "Product Details | TrustVault",
  description:
    "Review product details before continuing through the TrustVault Marketplace.",
};

export default async function ProductPage({
  params,
}: ProductPageProps) {
  const { id } = await params;

  return (
    <main className="min-h-screen bg-zinc-50">
      <ProductDetails
        productId={decodeURIComponent(id)}
      />
    </main>
  );
}

