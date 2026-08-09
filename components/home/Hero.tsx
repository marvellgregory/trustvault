import Link from "next/link";
import {
  ArrowRight,
  Gift,
  LockKeyhole,
  ReceiptText,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
} from "lucide-react";

const capabilities = [
  { label: "Gift", icon: Gift },
  { label: "Shop", icon: ShoppingBag },
  { label: "Split", icon: ReceiptText },
  { label: "Verify", icon: ShieldCheck },
];

export function Hero() {
  return (
    <section className="relative isolate overflow-hidden border-b border-zinc-200 bg-white">
      <div className="hero-grid absolute inset-0 -z-20 opacity-70" aria-hidden="true" />
      <div
        className="absolute left-1/2 top-[-18rem] -z-10 h-[44rem] w-[44rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(197,52,65,0.13),transparent_66%)] blur-2xl"
        aria-hidden="true"
      />

      <div className="mx-auto grid min-h-[660px] max-w-7xl items-center gap-12 px-5 py-14 sm:px-8 sm:py-18 lg:grid-cols-[1.08fr_0.92fr] lg:gap-16 lg:px-10 lg:py-20">
        <div className="min-w-0 max-w-3xl">
          <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white/90 px-3.5 py-2 text-sm font-medium text-zinc-700 shadow-sm backdrop-blur">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-950 text-white">
              <Sparkles aria-hidden="true" className="h-3.5 w-3.5" />
            </span>
            Working Arc Testnet experience
          </div>

          <h1 className="max-w-4xl text-balance text-[2.85rem] font-semibold leading-[0.98] tracking-[-0.055em] text-zinc-950 sm:text-6xl lg:text-[5.15rem]">
            One place to
            <span className="block text-[var(--brand-red)]">
              Gift. Shop. Split. Verify.
            </span>
          </h1>

          <p className="mt-7 max-w-2xl text-pretty text-lg leading-8 text-zinc-600 sm:text-xl">
            TrustVault brings programmable gifting, Marketplace checkout,
            shared payments and transaction receipts into one USDC experience
            built for Arc Testnet.
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/gift-vault"
              className="group inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-zinc-950 px-6 py-3 text-sm font-semibold text-white shadow-[0_12px_34px_rgba(24,24,27,0.18)] transition hover:-translate-y-0.5 hover:bg-zinc-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-4"
            >
              Create a gift
              <ArrowRight aria-hidden="true" className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>

            <Link
              href="/marketplace"
              className="inline-flex min-h-12 items-center justify-center rounded-full border border-zinc-300 bg-white/85 px-6 py-3 text-sm font-semibold text-zinc-900 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:border-zinc-400 hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-4"
            >
              Browse Marketplace
            </Link>
          </div>
        </div>

        <div className="relative mx-auto min-w-0 w-full max-w-xl lg:mx-0">
          <div
            className="absolute -inset-8 -z-10 rounded-[3rem] bg-[radial-gradient(circle_at_top,rgba(197,52,65,0.15),transparent_60%)] blur-2xl"
            aria-hidden="true"
          />
          <div className="overflow-hidden rounded-[2rem] border border-zinc-200/90 bg-white/90 p-4 shadow-[0_30px_90px_rgba(24,24,27,0.14)] backdrop-blur-xl sm:p-5">
            <div className="rounded-[1.55rem] border border-zinc-200 bg-zinc-950 p-5 text-white sm:p-7">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.22em] text-zinc-400">
                    TrustVault flow
                  </p>
                  <p className="mt-2 text-xl font-semibold tracking-tight">
                    Review before every money action
                  </p>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/10">
                  <LockKeyhole aria-hidden="true" className="h-5 w-5" />
                </div>
              </div>

              <div className="mt-8 rounded-3xl border border-white/10 bg-white/[0.06] p-5">
                <div className="flex items-start justify-between gap-5">
                  <div>
                    <p className="text-sm text-zinc-400">Timed Gift Vault</p>
                    <p className="mt-1 text-3xl font-semibold tracking-tight">
                      25.00 <span className="text-base text-zinc-400">USDC</span>
                    </p>
                  </div>
                  <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-medium text-emerald-300">
                    Ready to review
                  </span>
                </div>

                <div className="mt-6 space-y-3 text-sm">
                  <div className="flex items-center justify-between rounded-2xl bg-white/[0.05] px-4 py-3">
                    <span className="text-zinc-400">Recipient</span>
                    <span className="font-medium">Wallet verified</span>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl bg-white/[0.05] px-4 py-3">
                    <span className="text-zinc-400">Network</span>
                    <span className="font-medium">Arc Testnet</span>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl bg-white/[0.05] px-4 py-3">
                    <span className="text-zinc-400">Asset</span>
                    <span className="font-medium">USDC</span>
                  </div>
                </div>

                <Link
                  href="/gift-vault"
                  className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-2xl bg-white px-4 text-sm font-semibold text-zinc-950 transition hover:bg-zinc-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
                >
                  Open Gift Vault
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 p-2 pt-5 sm:grid-cols-4">
              {capabilities.map(({ label, icon: Icon }) => (
                <div
                  key={label}
                  className="group rounded-2xl border border-zinc-200 bg-white px-3 py-4 text-center transition hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-sm"
                >
                  <span className="mx-auto flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-100 text-zinc-800 transition group-hover:bg-zinc-950 group-hover:text-white">
                    <Icon aria-hidden="true" className="h-4 w-4" />
                  </span>
                  <p className="mt-2 text-xs font-semibold text-zinc-700">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
