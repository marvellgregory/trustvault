import type { Metadata } from "next";

import { BillSplitFlow } from "@/components/bill-split/BillSplitFlow";

export const metadata: Metadata = {
  title: "Bill Split | TrustVault",
  description:
    "Create a deterministic Arc Testnet USDC bill split and prepare participant payment obligations.",
};

export default function BillSplitPage() {
  return (
    <main className="bg-zinc-50">
      <section className="border-b border-zinc-200 bg-white">
        <div className="section-shell py-14 sm:py-16 lg:py-20">
          <p className="section-kicker">Bill Split</p>

          <div className="mt-4 max-w-3xl">
            <h1 className="text-balance text-4xl font-semibold tracking-[-0.055em] text-zinc-950 sm:text-6xl">
              Shared expenses without the awkward follow-up.
            </h1>

            <p className="section-copy mt-6">
              Create a precise USDC split, assign participant wallets and prepare
              payment obligations for Arc Testnet settlement.
            </p>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            <span className="rounded-full border border-zinc-200 bg-zinc-50 px-4 py-2 text-xs font-semibold text-zinc-700">
              Arc Testnet
            </span>
            <span className="rounded-full border border-zinc-200 bg-zinc-50 px-4 py-2 text-xs font-semibold text-zinc-700">
              USDC
            </span>
            <span className="rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-xs font-semibold text-blue-700">
              Foundation V1 — no funds move yet
            </span>
          </div>
        </div>
      </section>

      <BillSplitFlow />
    </main>
  );
}
