import type { Metadata } from "next";

import { ReceiptViewer } from "@/components/receipts/ReceiptViewer";

type ReceiptPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export const metadata: Metadata = {
  title: "Transaction Receipt | TrustVault",
  description:
    "View and verify a TrustVault transaction receipt.",
};

export default async function ReceiptPage({
  params,
}: ReceiptPageProps) {
  const { id } = await params;

  return (
    <main className="min-h-screen bg-zinc-50">
      <ReceiptViewer receiptId={decodeURIComponent(id)} />
    </main>
  );
}
