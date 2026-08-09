"use client";

import { Clock3, Send, Sparkles } from "lucide-react";
import { useState } from "react";

import { GiftVaultFlow } from "@/components/gift-vault/GiftVaultFlow";
import { SendNowFlow } from "@/components/gift-vault/send-now/SendNowFlow";

type GiftMode = "send-now" | "lock-later" | null;

export function GiftExperience() {
  const [mode, setMode] = useState<GiftMode>(null);

  if (!mode) {
    return (
      <section className="section-shell py-12 sm:py-16 lg:py-20">
        <div className="mx-auto max-w-5xl">
          <div className="text-center">
            <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-2 text-xs font-semibold text-zinc-600 shadow-sm">
              <Sparkles className="h-4 w-4 text-[var(--tv-brand)]" />
              Choose your gifting experience
            </div>

            <h2 className="mt-5 text-4xl font-semibold tracking-[-0.05em] text-zinc-950 sm:text-5xl">
              How would you like to gift?
            </h2>

            <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-zinc-600 sm:text-base">
              Send USDC immediately, or use programmable timing to lock a gift
              until the moment you choose.
            </p>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-2">
            <button
              type="button"
              onClick={() => setMode("send-now")}
              className="group rounded-[2rem] border border-zinc-200 bg-white p-7 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-[var(--tv-shadow-md)] focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-4"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                <Send className="h-6 w-6" />
              </div>

              <p className="mt-6 text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">
                Immediate gifting
              </p>

              <h3 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-zinc-950">
                Send Now
              </h3>

              <p className="mt-3 text-sm leading-6 text-zinc-600">
                Send USDC directly to the recipient on Arc Testnet after wallet
                confirmation.
              </p>

              <span className="mt-6 inline-flex min-h-10 items-center justify-center rounded-full bg-zinc-950 px-4 text-xs font-semibold text-white">
                Choose Send Now
              </span>
            </button>

            <button
              type="button"
              onClick={() => setMode("lock-later")}
              className="group rounded-[2rem] border border-[var(--tv-brand)]/30 bg-white p-7 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--tv-brand)]/60 hover:shadow-[var(--tv-shadow-md)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tv-brand)] focus-visible:ring-offset-4"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
                <Clock3 className="h-6 w-6" />
              </div>

              <p className="mt-6 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--tv-brand)]">
                Programmable gifting
              </p>

              <h3 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-zinc-950">
                Lock for Later
              </h3>

              <p className="mt-3 text-sm leading-6 text-zinc-600">
                Lock USDC in the deployed TrustVault Gift Vault contract until
                an exact unlock date and time.
              </p>

              <span className="mt-6 inline-flex min-h-10 items-center justify-center rounded-full bg-[var(--tv-brand)] px-4 text-xs font-semibold text-white">
                Choose Lock for Later
              </span>
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <div>
      <div className="section-shell pt-8">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-white px-4 py-3 shadow-sm">
          <div className="flex items-center gap-2">
            {mode === "send-now" ? (
              <Send className="h-4 w-4 text-blue-700" />
            ) : (
              <Clock3 className="h-4 w-4 text-amber-700" />
            )}

            <p className="text-sm font-semibold text-zinc-950">
              {mode === "send-now" ? "Send Now" : "Lock for Later"}
            </p>

            <span className="text-xs text-zinc-400">• Arc Testnet USDC</span>
          </div>

          <button
            type="button"
            onClick={() => setMode(null)}
            className="rounded-full border border-zinc-300 px-4 py-2 text-xs font-semibold text-zinc-700 transition hover:border-zinc-400"
          >
            Change gifting mode
          </button>
        </div>
      </div>

      {mode === "send-now" ? <SendNowFlow /> : <GiftVaultFlow />}
    </div>
  );
}
