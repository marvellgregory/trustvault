import type { Metadata } from "next";

import { ShoppingCartPage } from "@/components/marketplace/cart/ShoppingCartPage";

export const metadata: Metadata = {
  title: "Shopping Cart | TrustVault",
  description:
    "Review Marketplace products before continuing to TrustVault checkout.",
};

export default function CartPage() {
  return (
    <main className="min-h-screen bg-zinc-50">
      <ShoppingCartPage />
    </main>
  );
}

