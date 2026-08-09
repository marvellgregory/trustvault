import type { Metadata } from "next";
import Link from "next/link";
import { Inbox } from "lucide-react";

import { GiftExperience } from "@/components/gift-vault/GiftExperience";

export const metadata: Metadata = {
  title: "Gift Vault",
  description:
    "Create a timed USDC gift on Arc Testnet with an exact unlock date, time and timezone enforced by the TrustVault Gift Vault contract.",
};

export default function GiftVaultPage() {
  return (
    <main className="bg-zinc-50">
      <section className="border-b border-zinc-200 bg-white">
        <div className="section-shell py-14 sm:py-16 lg:py-20">
          <p className="section-kicker">Gift Vault</p>

          <div className="mt-4 grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
            <div className="max-w-3xl">
              <h1 className="text-balance text-4xl font-semibold tracking-[-0.055em] text-zinc-950 sm:text-6xl">
                Create a gift with a little more meaning.
              </h1>

              <p className="section-copy mt-6">
                Lock Arc Testnet USDC for a trusted recipient and choose the
                exact date, time and timezone when the deployed Gift Vault
                contract should permit claim.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="rounded-full border border-zinc-200 bg-zinc-50 px-4 py-2 text-xs font-semibold text-zinc-700">
                Arc Testnet
              </span>

              <span className="rounded-full border border-zinc-200 bg-zinc-50 px-4 py-2 text-xs font-semibold text-zinc-700">
                USDC
              </span>

              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-700">
                Contract-enforced timing
              </span>

              <Link
                href="/gift-vault/manage"
                className="inline-flex items-center gap-2 rounded-full bg-zinc-950 px-4 py-2 text-xs font-semibold text-white"
              >
                <Inbox className="h-4 w-4" />
                Manage Your Gifts
              </Link>
            </div>
          </div>
        </div>
      </section>

      <GiftExperience />
    </main>
  );
}
