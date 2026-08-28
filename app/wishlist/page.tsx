import type { Metadata } from "next";

import { WishlistPage } from "@/components/marketplace/wishlist/WishlistPage";

export const metadata: Metadata = {
  title: "Wishlist",
  description:
    "Save Marketplace products for later and move them into your TrustVault cart when you are ready.",
};

export default function WishlistRoute() {
  return <WishlistPage />;
}