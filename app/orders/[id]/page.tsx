import type { Metadata } from "next";

import { OrderDetailsPage } from "@/components/marketplace/orders/OrderDetailsPage";

type OrderPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export const metadata: Metadata = {
  title: "Marketplace Order | TrustVault",
  description:
    "Review a saved TrustVault Marketplace order.",
};

export default async function OrderPage({
  params,
}: OrderPageProps) {
  const { id } = await params;

  return (
    <main className="min-h-screen bg-zinc-50">
      <OrderDetailsPage
        orderId={decodeURIComponent(id)}
      />
    </main>
  );
}
