import type { Metadata } from "next";
import { GiftVaultFlow } from "@/components/gift-vault/GiftVaultFlow";

export const metadata: Metadata = {
  title: "Gift Vault",
  description:
    "Create a guided USDC gift on Arc Testnet with clear recipient, amount, unlock date and review steps.",
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
                Prepare a guided USDC gift for a trusted recipient, choose when it
                should unlock, and review every detail before anything is signed.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="rounded-full border border-zinc-200 bg-zinc-50 px-4 py-2 text-xs font-semibold text-zinc-700">
                Arc Testnet
              </span>
              <span className="rounded-full border border-zinc-200 bg-zinc-50 px-4 py-2 text-xs font-semibold text-zinc-700">
                USDC
              </span>
              <span className="rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-700">
                Programmable gifting
              </span>
            </div>
          </div>
        </div>
      </section>

      <GiftVaultFlow />
    </main>
  );
}

