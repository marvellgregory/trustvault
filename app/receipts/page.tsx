import type { Metadata } from "next";

import { ReceiptCenter } from "@/components/receipts/ReceiptCenter";

export const metadata: Metadata = {
  title: "Receipt Center | TrustVault",
  description:
    "Review saved TrustVault transaction receipts.",
};

export default function ReceiptsPage() {
  return (
    <main className="min-h-screen bg-zinc-50">
      <ReceiptCenter />
    </main>
  );
}
