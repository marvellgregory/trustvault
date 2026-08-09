"use client";

import { useParams } from "next/navigation";

import { GiftVaultLifecycleView } from "@/components/gift-vault/manage/GiftVaultLifecycleView";

export default function GiftVaultLifecyclePage() {
  const params = useParams<{ id: string }>();

  return (
    <main className="min-h-screen bg-zinc-50">
      <GiftVaultLifecycleView giftId={params.id} />
    </main>
  );
}
