"use client";

import { useParams } from "next/navigation";

import { GiftClaimView } from "@/components/gift-vault/claim/GiftClaimView";

export default function GiftVaultClaimPage() {
  const params = useParams<{ id: string }>();

  return (
    <main className="min-h-screen bg-zinc-50">
      <GiftClaimView giftId={params.id} />
    </main>
  );
}
