"use client";

import { useParams } from "next/navigation";

import { BillSplitPaymentView } from "@/components/bill-split/pay/BillSplitPaymentView";

export default function BillSplitParticipantPaymentPage() {
  const params = useParams<{
    billId: string;
    participantId: string;
  }>();

  return (
    <main className="min-h-screen bg-zinc-50">
      <BillSplitPaymentView
        billId={params.billId}
        participantId={params.participantId}
      />
    </main>
  );
}
