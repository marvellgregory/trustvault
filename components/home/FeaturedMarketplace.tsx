"use client";

import Link from "next/link";
import {
  ArrowRight,
  Gift,
  Heart,
  PackageCheck,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
} from "lucide-react";
import { useMemo, useState } from "react";

type Category = "All" | "Gift-ready" | "Family" | "Cross-border";

type Product = {
  id: number;
  name: string;
  category: Exclude<Category, "All">;
  price: string;
  seller: string;
  description: string;
  accent: string;
  icon: typeof Gift;
  badge: string;
};

const categories: Category[] = ["All", "Gift-ready", "Family", "Cross-border"];

const products: Product[] = [
  {
    id: 1,
    name: "Celebration Box",
    category: "Gift-ready",
    price: "48.00 USDC",
    seller: "Curated Gifts",
    description:
      "A gift-ready product concept designed for a guided TrustVault checkout.",
    accent: "from-rose-100 via-white to-orange-50",
    icon: Gift,
    badge: "Gift-ready",
  },
  {
    id: 2,
    name: "Family Essentials",
    category: "Family",
    price: "72.00 USDC",
    seller: "Home & Family",
    description:
      "A family-focused marketplace concept for everyday trusted purchases.",
    accent: "from-emerald-100 via-white to-cyan-50",
    icon: ShoppingBag,
    badge: "Family pick",
  },
  {
    id: 3,
    name: "Regional Favourites",
    category: "Cross-border",
    price: "96.00 USDC",
    seller: "Trusted Commerce",
    description:
      "A cross-border shopping concept for products that may be difficult to access locally.",
    accent: "from-violet-100 via-white to-sky-50",
    icon: PackageCheck,
    badge: "Cross-border",
  },
];

export function FeaturedMarketplace() {
  const [activeCategory, setActiveCategory] = useState<Category>("All");
  const [saved, setSaved] = useState<number[]>([]);

  const visibleProducts = useMemo(() => {
    if (activeCategory === "All") return products;
    return products.filter((product) => product.category === activeCategory);
  }, [activeCategory]);

  function toggleSaved(id: number) {
    setSaved((current) =>
      current.includes(id)
        ? current.filter((productId) => productId !== id)
        : [...current, id],
    );
  }

  return (
    <section className="border-y border-zinc-200 bg-zinc-50 py-20 sm:py-24 lg:py-32">
      <div className="section-shell">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="section-kicker">Marketplace preview</p>
            <h2 className="section-title mt-4">
              Explore products through a calmer, more trusted experience.
            </h2>
            <p className="section-copy mt-6">
              Browse gift-ready, family and cross-border concepts while the live
              seller, inventory and checkout systems are still being built.
            </p>
          </div>

          <Link
            href="/marketplace"
            className="inline-flex w-fit items-center gap-2 rounded-full border border-zinc-300 bg-white px-5 py-3 text-sm font-semibold text-zinc-950 shadow-sm transition hover:-translate-y-0.5 hover:border-zinc-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950"
          >
            Browse marketplace
            <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </Link>
        </div>

        <div
          className="no-scrollbar mt-10 flex gap-2 overflow-x-auto pb-2"
          role="tablist"
          aria-label="Marketplace categories"
        >
          {categories.map((category) => {
            const isActive = activeCategory === category;

            return (
              <button
                key={category}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveCategory(category)}
                className={`shrink-0 rounded-full px-4 py-2.5 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 ${
                  isActive
                    ? "bg-zinc-950 text-white"
                    : "border border-zinc-300 bg-white text-zinc-700 hover:border-zinc-400 hover:text-zinc-950"
                }`}
              >
                {category}
              </button>
            );
          })}
        </div>

        <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {visibleProducts.map((product) => {
            const Icon = product.icon;
            const isSaved = saved.includes(product.id);

            return (
              <article
                key={product.id}
                className="tv-card group overflow-hidden"
              >
                <div
                  className={`relative flex min-h-64 items-center justify-center overflow-hidden bg-gradient-to-br ${product.accent} p-8`}
                >
                  <div
                    className="absolute inset-0 opacity-40"
                    style={{
                      backgroundImage:
                        "radial-gradient(circle at 20% 20%, rgba(255,255,255,.95), transparent 34%), radial-gradient(circle at 80% 80%, rgba(255,255,255,.8), transparent 30%)",
                    }}
                    aria-hidden="true"
                  />

                  <span className="relative flex h-24 w-24 items-center justify-center rounded-[2rem] border border-white/80 bg-white/75 text-zinc-950 shadow-xl backdrop-blur">
                    <Icon aria-hidden="true" className="h-10 w-10" />
                  </span>

                  <button
                    type="button"
                    onClick={() => toggleSaved(product.id)}
                    aria-label={
                      isSaved
                        ? `Remove ${product.name} from wishlist`
                        : `Save ${product.name} to wishlist`
                    }
                    aria-pressed={isSaved}
                    className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/80 bg-white/85 text-zinc-700 shadow-sm backdrop-blur transition hover:scale-105 hover:text-[var(--tv-brand)] focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950"
                  >
                    <Heart
                      aria-hidden="true"
                      className={`h-4 w-4 ${isSaved ? "fill-current text-[var(--tv-brand)]" : ""}`}
                    />
                  </button>

                  <span className="absolute bottom-4 left-4 rounded-full border border-white/80 bg-white/85 px-3 py-1.5 text-xs font-semibold text-zinc-700 shadow-sm backdrop-blur">
                    {product.badge}
                  </span>
                </div>

                <div className="p-6">
                  <div className="flex items-start justify-between gap-5">
                    <div>
                      <p className="text-xs font-medium text-zinc-500">
                        {product.seller}
                      </p>
                      <h3 className="mt-2 text-xl font-semibold tracking-[-0.035em] text-zinc-950">
                        {product.name}
                      </h3>
                    </div>
                    <p className="shrink-0 text-sm font-semibold text-zinc-950">
                      {product.price}
                    </p>
                  </div>

                  <p className="mt-4 text-sm leading-7 text-zinc-600">
                    {product.description}
                  </p>

                  <div className="mt-6 flex items-center gap-2 text-xs font-medium text-zinc-500">
                    <ShieldCheck
                      aria-hidden="true"
                      className="h-4 w-4 text-emerald-600"
                    />
                    Clear review before checkout
                  </div>

                  <div className="mt-6 grid grid-cols-2 gap-3">
                    <Link
                      href={`/marketplace?product=${product.id}`}
                      className="inline-flex min-h-11 items-center justify-center rounded-full border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-950 transition hover:border-zinc-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950"
                    >
                      View details
                    </Link>
                    <Link
                      href={`/gift-vault?product=${product.id}`}
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-zinc-950 px-4 text-sm font-semibold text-white transition hover:bg-zinc-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2"
                    >
                      <Sparkles aria-hidden="true" className="h-4 w-4" />
                      Gift this
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        <p className="mt-6 text-xs leading-5 text-zinc-500">
          Product names, prices, sellers and availability are interface previews.
          They do not represent live inventory or completed marketplace functionality.
        </p>
      </div>
    </section>
  );
}
