import type { Metadata } from "next";

import { GiftVaultCenter } from "@/components/gift-vault/center/GiftVaultCenter";

export const metadata: Metadata = {
  title: "Gift Vault Center | TrustVault",
  description:
    "View sent and received timed USDC gifts backed by the TrustVault Gift Vault contract on Arc Testnet.",
};

export default function GiftVaultCenterPage() {
  return (
    <main className="min-h-screen bg-zinc-50">
      <GiftVaultCenter />
    </main>
  );
}
