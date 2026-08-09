import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Gift,
  LockKeyhole,
  Send,
} from "lucide-react";

const steps = [
  "Choose Send Now or Lock for Later",
  "Add recipient and USDC amount",
  "Review wallet, network and transaction details",
];

export function GiftVaultPreview() {
  return (
    <section className="bg-white py-18 sm:py-20 lg:py-24">
      <div className="section-shell grid items-center gap-14 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
        <div>
          <p className="section-kicker">Gift Vault</p>
          <h2 className="section-title mt-4">
            Send USDC now, or lock a gift for the right moment.
          </h2>
          <p className="section-copy mt-6">
            Gift Vault supports immediate Arc Testnet USDC gifting and timed
            gifts backed by the deployed TrustVault Gift Vault contract.
          </p>

          <ul className="mt-8 space-y-4">
            {steps.map((step) => (
              <li key={step} className="flex items-center gap-3 text-sm text-zinc-700">
                <CheckCircle2 aria-hidden="true" className="h-5 w-5 text-emerald-600" />
                {step}
              </li>
            ))}
          </ul>

          <Link
            href="/gift-vault"
            className="group mt-9 inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-zinc-950 px-6 text-sm font-semibold text-white shadow-[var(--tv-shadow-md)] transition hover:-translate-y-0.5 hover:bg-zinc-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-4"
          >
            Open Gift Vault
            <ArrowRight aria-hidden="true" className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>

        <div className="relative">
          <div
            className="absolute -inset-8 -z-10 rounded-[3rem] bg-rose-100/80 blur-3xl"
            aria-hidden="true"
          />
          <div className="rounded-[2rem] border border-zinc-200 bg-zinc-950 p-5 text-white shadow-[var(--tv-shadow-lg)] sm:p-7">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
              Two gifting modes
            </p>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-3xl border border-white/10 bg-white/[0.05] p-5">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10">
                  <Send aria-hidden="true" className="h-5 w-5" />
                </span>
                <h3 className="mt-6 text-lg font-semibold">Send Now</h3>
                <p className="mt-2 text-sm leading-6 text-zinc-400">
                  Prepare an immediate Arc Testnet USDC transfer to the recipient wallet.
                </p>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/[0.05] p-5">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10">
                  <LockKeyhole aria-hidden="true" className="h-5 w-5" />
                </span>
                <h3 className="mt-6 text-lg font-semibold">Lock for Later</h3>
                <p className="mt-2 text-sm leading-6 text-zinc-400">
                  Lock USDC in the deployed timed Gift Vault until the selected unlock time.
                </p>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-3 rounded-2xl bg-white px-4 py-3 text-sm text-zinc-950">
              <Gift aria-hidden="true" className="h-4 w-4" />
              <span className="font-semibold">Review before wallet approval</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
