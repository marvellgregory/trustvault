"use client";

import { useParams } from "next/navigation";

import { BillSplitDetail } from "@/components/bill-split/manage/BillSplitDetail";

export default function BillSplitDetailPage() {
  const params = useParams<{ id: string }>();

  return (
    <main className="min-h-screen bg-zinc-50">
      <BillSplitDetail billId={params.id} />
    </main>
  );
}
