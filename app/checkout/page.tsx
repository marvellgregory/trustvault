import type { Metadata } from "next";

import { ProtectedCheckoutPage } from "@/components/marketplace/checkout/ProtectedCheckoutPage";

export const metadata: Metadata = {
  title: "Protected Checkout | TrustVault",
  description:
    "Review Marketplace products before TrustVault protected checkout.",
};

export default function CheckoutPage() {
  return (
    <main className="min-h-screen bg-zinc-50">
      <ProtectedCheckoutPage />
    </main>
  );
}
