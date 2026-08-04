"use client";

import {
  ArrowRight,
  CircleAlert,
  Clock3,
  Gift,
  LoaderCircle,
  Package,
  ReceiptText,
  RefreshCw,
  Search,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Users,
} from "lucide-react";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { ProductCoverImage } from "@/components/marketplace/ProductCoverImage";
import {
  browserProductRepository,
  type StoredMarketplaceProduct,
} from "@/lib/marketplace/repository/product-repository";

type CatalogStatus =
  | "loading"
  | "ready"
  | "empty"
  | "error";

const previewFeatures = [
  {
    icon: ShoppingBag,
    title: "Protected Marketplace",
    description:
      "Browse products, review sellers and prepare purchases through a trust-first checkout flow.",
  },
  {
    icon: ShieldCheck,
    title: "Escrow-ready commerce",
    description:
      "Eligible purchases are designed to remain protected until delivery conditions are confirmed.",
  },
  {
    icon: Gift,
    title: "Gift Vault",
    description:
      "Create meaningful USDC gifts with recipient details, messages and scheduled release flows.",
  },
  {
    icon: Users,
    title: "Bill Split",
    description:
      "A shared-payment experience designed for transparent group settlement.",
  },
  {
    icon: ReceiptText,
    title: "Digital receipts",
    description:
      "Download, share and verify branded transaction records from one reusable receipt system.",
  },
  {
    icon: Sparkles,
    title: "TrustPoints",
    description:
      "A planned rewards layer for completed and trusted transaction activity.",
  },
];

export function MarketplaceCatalog() {
  const [status, setStatus] =
    useState<CatalogStatus>("loading");

  const [storedProducts, setStoredProducts] =
    useState<StoredMarketplaceProduct[]>([]);

  const [search, setSearch] = useState("");

  const loadProducts = useCallback(async () => {
    setStatus("loading");

    try {
      const products =
        await browserProductRepository.findAll();

      setStoredProducts(products);

      setStatus(
        products.length > 0
          ? "ready"
          : "empty",
      );
    } catch {
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const products = useMemo(() => {
    const normalizedSearch = search
      .trim()
      .toLowerCase();

    if (!normalizedSearch) {
      return storedProducts;
    }

    return storedProducts.filter(({ product }) => {
      const searchableText = [
        product.id,
        product.sku,
        product.title,
        product.category,
        product.subcategory,
        product.brand,
        product.vendor,
        ...product.tags,
      ]
        .filter(
          (value): value is string =>
            typeof value === "string",
        )
        .join(" ")
        .toLowerCase();

      return searchableText.includes(
        normalizedSearch,
      );
    });
  }, [search, storedProducts]);

  if (status === "loading") {
    return (
      <CatalogState
        icon={LoaderCircle}
        title="Loading Marketplace"
        description="TrustVault is preparing the Marketplace experience."
        isLoading
      />
    );
  }

  if (status === "error") {
    return (
      <CatalogState
        icon={CircleAlert}
        title="Marketplace temporarily unavailable"
        description="TrustVault could not load the Marketplace in this browser. Please try again."
        actionLabel="Try again"
        onAction={loadProducts}
      />
    );
  }

  if (status === "empty") {
    return <MarketplacePreview />;
  }

  return (
    <section className="section-shell py-14 sm:py-16 lg:py-24">
      <div className="border-b border-zinc-200 pb-8">
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--tv-brand)]">
            TrustVault Marketplace
          </p>

        </div>

        <h1 className="mt-4 max-w-4xl text-4xl font-semibold tracking-[-0.05em] text-zinc-950 sm:text-5xl lg:text-6xl">
          Explore products secured by transparent pricing, protected checkout,
          programmable escrow, and verifiable digital receipts—built for trusted
          commerce on Arc.
        </h1>

        <p className="mt-5 max-w-3xl text-base leading-8 text-zinc-600">
          Browse the current TrustVault catalog and explore product
          details, delivery information, escrow eligibility and
          protected checkout flows.
        </p>
      </div>

      <div className="mt-8 flex flex-col gap-4 rounded-3xl border border-zinc-200 bg-white p-5 sm:flex-row sm:items-center">
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">
            Search Marketplace
          </span>

          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
          />

          <input
            type="search"
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            placeholder="Search products, SKUs, categories or brands"
            className="min-h-12 w-full rounded-full border border-zinc-300 bg-white pl-11 pr-5 text-sm text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-zinc-950 focus:ring-2 focus:ring-zinc-950/10"
          />
        </label>

        <button
          type="button"
          onClick={loadProducts}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-zinc-300 bg-white px-5 text-sm font-semibold text-zinc-950 transition hover:border-zinc-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950"
        >
          <RefreshCw
            aria-hidden="true"
            className="h-4 w-4"
          />
          Refresh
        </button>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-semibold text-zinc-950">
          {products.length}{" "}
          {products.length === 1
            ? "product"
            : "products"}
        </p>

      </div>

      {products.length === 0 ? (
        <div className="mt-8 rounded-[2rem] border border-zinc-200 bg-white p-10 text-center">
          <p className="text-lg font-semibold text-zinc-950">
            No matching products
          </p>

          <p className="mt-2 text-sm text-zinc-500">
            Try another product name, SKU or category.
          </p>
        </div>
      ) : (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {products.map(({ product }) => (
            <Link
              key={product.id}
              href={`/marketplace/product/${encodeURIComponent(
                product.id,
              )}`}
              aria-label={`View ${product.title}`}
              className="group block overflow-hidden rounded-[2rem] border border-zinc-200 bg-white shadow-sm transition hover:-translate-y-1 hover:border-zinc-400 hover:shadow-[var(--tv-shadow-md)] focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-4"
            >
              <article>
                <div className="aspect-[4/3] overflow-hidden bg-zinc-100">
                  <ProductCoverImage
                    productId={product.id}
                    alt={product.title}
                    className="transition duration-300 group-hover:scale-[1.03]"
                  />
                </div>

                <div className="p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-600">
                      {product.category}
                    </span>

                    {product.escrowEligible && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                        <ShieldCheck
                          aria-hidden="true"
                          className="h-3.5 w-3.5"
                        />
                        Escrow eligible
                      </span>
                    )}
                  </div>

                  <h2 className="mt-4 text-xl font-semibold tracking-[-0.03em] text-zinc-950 transition group-hover:text-zinc-600">
                    {product.title}
                  </h2>

                  <p className="mt-2 line-clamp-2 text-sm leading-6 text-zinc-600">
                    {product.shortDescription ||
                      product.description}
                  </p>

                  <div className="mt-5 flex items-end justify-between gap-4 border-t border-zinc-200 pt-4">
                    <div>
                      <p className="text-xs text-zinc-500">
                        Price
                      </p>

                      <p className="mt-1 text-xl font-semibold text-zinc-950">
                        {product.price.amount}{" "}
                        {product.price.currency}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="font-mono text-xs text-zinc-400">
                        {product.id}
                      </p>

                      <p className="mt-1 text-xs text-zinc-500">
                        SKU: {product.sku}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 text-sm font-semibold text-[var(--tv-brand)]">
                    View product →
                  </div>
                </div>
              </article>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

function MarketplacePreview() {
  return (
    <section className="section-shell py-14 sm:py-16 lg:py-24">
      <div className="overflow-hidden rounded-[2.5rem] border border-zinc-200 bg-white shadow-[var(--tv-shadow-md)]">
        <div className="grid gap-10 px-7 py-12 sm:px-10 lg:grid-cols-[1.1fr_0.9fr] lg:px-14 lg:py-16">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--tv-brand)]">
                TrustVault Marketplace
              </p>

              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                <Clock3 className="h-3.5 w-3.5" />
                In active development
              </span>
            </div>

            <h1 className="mt-5 max-w-3xl text-4xl font-semibold tracking-[-0.055em] text-zinc-950 sm:text-5xl lg:text-6xl">
              Commerce deserves programmable trust.
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-8 text-zinc-600">
              TrustVault is building a Marketplace where product
              discovery, protected checkout, delivery confirmation,
              digital receipts and future rewards work through one
              connected transaction experience.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/gift-vault"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-zinc-950 px-6 text-sm font-semibold text-white transition hover:bg-zinc-800"
              >
                Explore Gift Vault
                <ArrowRight className="h-4 w-4" />
              </Link>

              <Link
                href="/receipts"
                className="inline-flex min-h-12 items-center justify-center rounded-full border border-zinc-300 px-6 text-sm font-semibold text-zinc-950 transition hover:border-zinc-400"
              >
                View Receipt Center
              </Link>
            </div>
          </div>

          <div className="rounded-[2rem] border border-zinc-200 bg-zinc-950 p-6 text-white sm:p-8">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-400">
                  Product preview
                </p>

                <p className="mt-2 text-2xl font-semibold">
                  Protected by design
                </p>
              </div>

              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
                <ShieldCheck className="h-6 w-6" />
              </span>
            </div>

            <div className="mt-8 space-y-3">
              {[
                "Product discovery",
                "Persistent shopping cart",
                "Protected checkout",
                "Order lifecycle tracking",
                "Verifiable digital receipts",
              ].map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-400/15 text-emerald-300">
                    <ShieldCheck className="h-4 w-4" />
                  </span>

                  <span className="text-sm font-medium">
                    {item}
                  </span>
                </div>
              ))}
            </div>

            <p className="mt-6 text-xs leading-6 text-zinc-400">
              Built on Arc. Production catalog and shared storage are
              currently being prepared.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {previewFeatures.map(
          ({ icon: Icon, title, description }) => (
            <article
              key={title}
              className="rounded-[2rem] border border-zinc-200 bg-white p-6"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-800">
                <Icon className="h-5 w-5" />
              </span>

              <h2 className="mt-5 text-lg font-semibold text-zinc-950">
                {title}
              </h2>

              <p className="mt-2 text-sm leading-6 text-zinc-600">
                {description}
              </p>
            </article>
          ),
        )}
      </div>

      <div className="mt-8 rounded-3xl border border-blue-200 bg-blue-50 p-5 text-sm leading-7 text-blue-950">
        This public build demonstrates the current TrustVault product
        architecture. Marketplace inventory and shared production data
        are being added progressively as development continues.
      </div>
    </section>
  );
}

type CatalogStateProps = {
  icon: typeof Package;
  title: string;
  description: string;
  isLoading?: boolean;
  actionLabel?: string;
  onAction?: () => void;
};

function CatalogState({
  icon: Icon,
  title,
  description,
  isLoading = false,
  actionLabel,
  onAction,
}: CatalogStateProps) {
  return (
    <section className="section-shell py-20 sm:py-24 lg:py-32">
      <div className="mx-auto max-w-xl rounded-[2rem] border border-zinc-200 bg-white p-8 text-center shadow-[var(--tv-shadow-md)] sm:p-10">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-700">
          <Icon
            aria-hidden="true"
            className={`h-6 w-6 ${
              isLoading ? "animate-spin" : ""
            }`}
          />
        </span>

        <h1 className="mt-6 text-3xl font-semibold tracking-[-0.04em] text-zinc-950">
          {title}
        </h1>

        <p className="mt-4 text-sm leading-7 text-zinc-600">
          {description}
        </p>

        {actionLabel && (
          <button
            type="button"
            onClick={onAction}
            className="mt-7 inline-flex min-h-11 items-center justify-center rounded-full bg-zinc-950 px-5 text-sm font-semibold text-white transition hover:bg-zinc-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-4"
          >
            {actionLabel}
          </button>
        )}
      </div>
    </section>
  );
}
