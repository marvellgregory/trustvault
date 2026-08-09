import type { Metadata } from "next";

import { ProtectedCheckoutPage } from "@/components/marketplace/checkout/ProtectedCheckoutPage";

export const metadata: Metadata = {
  title: "Marketplace Checkout | TrustVault",
  description:
    "Review Marketplace products, delivery details and order totals before transaction review.",
};

export default function CheckoutPage() {
  return (
    <main className="min-h-screen bg-zinc-50">
      <ProtectedCheckoutPage />
    </main>
  );
}


