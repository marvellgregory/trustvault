import Link from "next/link";
import {
  ArrowRight,
  PackageCheck,
  ReceiptText,
  ShoppingBag,
} from "lucide-react";

const features = [
  {
    title: "Browse the current catalog",
    description:
      "Explore the products currently loaded into the TrustVault Marketplace and open product detail pages.",
    icon: ShoppingBag,
  },
  {
    title: "Review before payment",
    description:
      "Move from cart and checkout into a wallet-aware transaction review before any supported settlement action.",
    icon: PackageCheck,
  },
  {
    title: "Keep the transaction trail",
    description:
      "Supported Marketplace settlements can produce saved receipts and activity records for later review.",
    icon: ReceiptText,
  },
];

export function FeaturedMarketplace() {
  return (
    <section className="border-y border-zinc-200 bg-zinc-50 py-18 sm:py-20 lg:py-24">
      <div className="section-shell">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="section-kicker">Marketplace</p>
            <h2 className="section-title mt-4">
              Shop through a clear path from product to transaction review.
            </h2>
            <p className="section-copy mt-6">
              TrustVault now has a working Marketplace journey with catalog
              browsing, product pages, cart, checkout, saved orders and the
              shared transaction-review experience.
            </p>
          </div>

          <Link
            href="/marketplace"
            className="inline-flex w-fit items-center gap-2 rounded-full border border-zinc-300 bg-white px-5 py-3 text-sm font-semibold text-zinc-950 shadow-sm transition hover:-translate-y-0.5 hover:border-zinc-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950"
          >
            Browse Marketplace
            <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </Link>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {features.map(({ title, description, icon: Icon }) => (
            <article key={title} className="tv-card p-6 sm:p-7">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-950 text-white">
                <Icon aria-hidden="true" className="h-5 w-5" />
              </span>
              <h3 className="mt-8 text-xl font-semibold tracking-[-0.035em] text-zinc-950">
                {title}
              </h3>
              <p className="mt-3 text-sm leading-7 text-zinc-600">{description}</p>
            </article>
          ))}
        </div>

        <p className="mt-6 text-xs leading-5 text-zinc-500">
          Marketplace availability and settlement behavior remain specific to
          this Arc Testnet build and the data loaded into the current browser session.
        </p>
      </div>
    </section>
  );
}
