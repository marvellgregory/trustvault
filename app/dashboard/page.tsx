import type { Metadata } from "next";

import { TransactionActivityCenter } from "@/components/activity/TransactionActivityCenter";

export const metadata: Metadata = {
  title: "Activity | TrustVault",
  description:
    "Review TrustVault Marketplace, Gift Vault and Bill Split activity from one place.",
};

export default function DashboardPage() {
  return (
    <main className="min-h-screen bg-zinc-50">
      <TransactionActivityCenter />
    </main>
  );
}
