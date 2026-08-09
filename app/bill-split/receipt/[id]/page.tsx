"use client";

import { useParams } from "next/navigation";

import { BillSplitSettlementReceipt } from "@/components/bill-split/receipt/BillSplitSettlementReceipt";

export default function BillSplitReceiptPage() {
  const params = useParams<{ id: string }>();

  return (
    <main className="min-h-screen bg-zinc-50">
      <BillSplitSettlementReceipt billId={params.id} />
    </main>
  );
}
