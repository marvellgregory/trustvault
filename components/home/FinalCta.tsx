import Link from "next/link";
import { ArrowRight, Gift } from "lucide-react";

export function FinalCta() {
  return (
    <section className="border-t border-zinc-200 bg-[var(--tv-brand-soft)] py-20 sm:py-24">
      <div className="section-shell">
        <div className="mx-auto max-w-4xl text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-[var(--tv-brand)] shadow-sm ring-1 ring-rose-200">
            <Gift aria-hidden="true" className="h-5 w-5" />
          </span>
          <h2 className="mt-7 text-balance text-4xl font-semibold tracking-[-0.05em] text-zinc-950 sm:text-6xl">
            Start with one meaningful money moment.
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-pretty text-base leading-8 text-zinc-600 sm:text-lg">
            Explore the TrustVault prototype and follow the build as Gift Vault,
            Bill Split and Arc Testnet payment flows move from interface to verified
            functionality.
          </p>

          <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/gift-vault"
              className="group inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-zinc-950 px-6 text-sm font-semibold text-white shadow-[var(--tv-shadow-md)] transition hover:-translate-y-0.5 hover:bg-zinc-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-4"
            >
              Explore Gift Vault
              <ArrowRight
                aria-hidden="true"
                className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
              />
            </Link>
            <Link
              href="/roadmap"
              className="inline-flex min-h-12 items-center justify-center rounded-full border border-rose-200 bg-white px-6 text-sm font-semibold text-zinc-950 shadow-sm transition hover:-translate-y-0.5 hover:border-rose-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-4"
            >
              View roadmap
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
