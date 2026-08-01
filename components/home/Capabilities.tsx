import Link from "next/link";
import {
  ArrowRight,
  Gift,
  ReceiptText,
  ShieldCheck,
  ShoppingBag,
} from "lucide-react";

const capabilities = [
  {
    number: "01",
    title: "Gift",
    description:
      "Prepare thoughtful USDC gifts with clear recipient, amount and review steps.",
    href: "/gift-vault",
    icon: Gift,
    label: "Explore Gift Vault",
  },
  {
    number: "02",
    title: "Shop",
    description:
      "Discover a curated commerce experience designed around trusted purchases.",
    href: "/marketplace",
    icon: ShoppingBag,
    label: "Explore Marketplace",
  },
  {
    number: "03",
    title: "Split",
    description:
      "Calculate shared expenses and make every participant’s status easy to follow.",
    href: "/bill-split",
    icon: ReceiptText,
    label: "Explore Bill Split",
  },
  {
    number: "04",
    title: "Protect",
    description:
      "Use clear confirmations, honest states and user-controlled wallet actions.",
    href: "/trust",
    icon: ShieldCheck,
    label: "View Trust Center",
  },
];

export function Capabilities() {
  return (
    <section className="bg-white py-20 sm:py-24 lg:py-32">
      <div className="section-shell">
        <div className="max-w-3xl">
          <p className="section-kicker">One connected experience</p>
          <h2 className="section-title mt-4">
            Designed around the ways families move money.
          </h2>
          <p className="section-copy mt-6">
            TrustVault brings gifting, trusted shopping and shared expenses into
            one consumer-friendly product experience.
          </p>
        </div>

        <div className="mt-12 grid gap-4 md:grid-cols-2 lg:mt-16 lg:grid-cols-4">
          {capabilities.map(
            ({ number, title, description, href, icon: Icon, label }) => (
              <article
                key={title}
                className="tv-card group flex min-h-80 flex-col p-6 sm:p-7"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold tracking-[0.18em] text-zinc-400">
                    {number}
                  </span>
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-800 transition group-hover:bg-zinc-950 group-hover:text-white">
                    <Icon aria-hidden="true" className="h-5 w-5" />
                  </span>
                </div>

                <h3 className="mt-12 text-2xl font-semibold tracking-[-0.035em]">
                  {title}
                </h3>
                <p className="mt-3 text-sm leading-7 text-zinc-600">
                  {description}
                </p>

                <Link
                  href={href}
                  className="mt-auto inline-flex items-center gap-2 pt-8 text-sm font-semibold text-zinc-950 outline-none transition hover:text-[var(--tv-brand)] focus-visible:ring-2 focus-visible:ring-zinc-950"
                >
                  {label}
                  <ArrowRight
                    aria-hidden="true"
                    className="h-4 w-4 transition-transform group-hover:translate-x-1"
                  />
                </Link>
              </article>
            ),
          )}
        </div>
      </div>
    </section>
  );
}
