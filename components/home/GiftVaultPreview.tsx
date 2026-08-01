import Link from "next/link";
import { ArrowRight, CheckCircle2, Gift, LockKeyhole } from "lucide-react";

const steps = [
  "Choose a recipient",
  "Enter a USDC amount",
  "Review the network and details",
];

export function GiftVaultPreview() {
  return (
    <section className="bg-white py-20 sm:py-24 lg:py-32">
      <div className="section-shell grid items-center gap-14 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
        <div>
          <p className="section-kicker">Gift Vault</p>
          <h2 className="section-title mt-4">
            Make a gift feel meaningful before it ever moves.
          </h2>
          <p className="section-copy mt-6">
            Gift Vault is being designed as a guided USDC flow with clear recipient,
            amount, network and confirmation states.
          </p>

          <ul className="mt-8 space-y-4">
            {steps.map((step) => (
              <li key={step} className="flex items-center gap-3 text-sm text-zinc-700">
                <CheckCircle2
                  aria-hidden="true"
                  className="h-5 w-5 text-emerald-600"
                />
                {step}
              </li>
            ))}
          </ul>

          <Link
            href="/gift-vault"
            className="group mt-9 inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-zinc-950 px-6 text-sm font-semibold text-white shadow-[var(--tv-shadow-md)] transition hover:-translate-y-0.5 hover:bg-zinc-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-4"
          >
            Explore Gift Vault
            <ArrowRight
              aria-hidden="true"
              className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
            />
          </Link>
        </div>

        <div className="relative">
          <div
            className="absolute -inset-8 -z-10 rounded-[3rem] bg-rose-100/80 blur-3xl"
            aria-hidden="true"
          />
          <div className="rounded-[2rem] border border-zinc-200 bg-zinc-950 p-5 text-white shadow-[var(--tv-shadow-lg)] sm:p-7">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
                  Guided preview
                </p>
                <h3 className="mt-2 text-xl font-semibold">Create a Gift Vault</h3>
              </div>
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/10">
                <Gift aria-hidden="true" className="h-5 w-5" />
              </span>
            </div>

            <div className="mt-7 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-4">
                <p className="text-xs text-zinc-400">Recipient</p>
                <p className="mt-2 text-sm font-medium">Family member</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-4">
                <p className="text-xs text-zinc-400">Asset</p>
                <p className="mt-2 text-sm font-medium">USDC</p>
              </div>
            </div>

            <div className="mt-4 rounded-3xl border border-white/10 bg-white/[0.05] p-5">
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-400">Gift amount</span>
                <LockKeyhole aria-hidden="true" className="h-4 w-4 text-zinc-400" />
              </div>
              <p className="mt-4 text-4xl font-semibold tracking-[-0.05em]">
                250.00 <span className="text-base text-zinc-400">USDC</span>
              </p>
            </div>

            <div className="mt-4 flex items-center justify-between rounded-2xl bg-white px-4 py-3 text-sm text-zinc-950">
              <span className="font-semibold">Review gift</span>
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </div>

            <p className="mt-4 text-xs leading-5 text-zinc-500">
              Interface preview only. A real transaction will not be represented
              as complete until the Arc Testnet flow is connected and verified.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
