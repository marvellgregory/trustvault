"use client";

import Link from "next/link";
import {
  ArrowLeft,
  CircleAlert,
  Heart,
  LoaderCircle,
  ShoppingCart,
  Trash2,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { ProductCoverImage } from "@/components/marketplace/ProductCoverImage";
import type {
  MarketplaceProduct,
  ProductId,
} from "@/lib/marketplace/product-types";
import { browserCartRepository } from "@/lib/marketplace/repository/cart-repository";
import {
  browserProductRepository,
  type StoredMarketplaceProduct,
} from "@/lib/marketplace/repository/product-repository";
import {
  browserWishlistRepository,
  subscribeToWishlistUpdates,
} from "@/lib/marketplace/repository/wishlist-repository";
import type {
  WishlistItem,
} from "@/lib/marketplace/wishlist-types";

type WishlistStatus =
  | "loading"
  | "ready"
  | "empty"
  | "error";

type ResolvedWishlistItem = {
  saved: WishlistItem;
  product: MarketplaceProduct | null;
};

export function WishlistPage() {
  const [status, setStatus] =
    useState<WishlistStatus>("loading");

  const [items, setItems] =
    useState<ResolvedWishlistItem[]>([]);

  const [busyProductId, setBusyProductId] =
    useState<ProductId | null>(null);

  const [isClearing, setIsClearing] =
    useState(false);

  const [message, setMessage] =
    useState<string | null>(null);

  const loadWishlist =
    useCallback(async () => {
      setStatus("loading");
      setMessage(null);

      try {
        const wishlist =
          await browserWishlistRepository.getWishlist();

        if (wishlist.items.length === 0) {
          setItems([]);
          setStatus("empty");
          return;
        }

        const resolved =
          await Promise.all(
            wishlist.items.map(
              async (saved): Promise<ResolvedWishlistItem> => {
                try {
                  const stored:
                    StoredMarketplaceProduct | null =
                    await browserProductRepository.findById(
                      saved.productId,
                    );

                  return {
                    saved,
                    product:
                      stored?.product ?? null,
                  };
                }
                catch {
                  return {
                    saved,
                    product: null,
                  };
                }
              },
            ),
          );

        setItems(resolved);
        setStatus("ready");
      }
      catch {
        setStatus("error");
      }
    }, []);

  useEffect(() => {
    let active = true;

    async function initialLoad() {
      if (!active) {
        return;
      }

      await loadWishlist();
    }

    initialLoad();

    const unsubscribe =
      subscribeToWishlistUpdates(
        () => {
          if (active) {
            loadWishlist();
          }
        },
      );

    return () => {
      active = false;
      unsubscribe();
    };
  }, [loadWishlist]);

  const itemCount =
    useMemo(
      () => items.length,
      [items],
    );

  async function removeItem(
    productId: ProductId,
  ) {
    setBusyProductId(productId);
    setMessage(null);

    try {
      await browserWishlistRepository.remove(
        productId,
      );

      setMessage(
        "Removed from your Wishlist.",
      );
    }
    catch {
      setMessage(
        "TrustVault could not remove this item from your Wishlist.",
      );
    }
    finally {
      setBusyProductId(null);
    }
  }

  async function addToCart(
    item: ResolvedWishlistItem,
  ) {
    if (!item.product) {
      setMessage(
        "This saved product is no longer available in the current Marketplace catalog.",
      );
      return;
    }

    setBusyProductId(
      item.saved.productId,
    );
    setMessage(null);

    try {
      await browserCartRepository.addItem({
        product: item.product,
        quantity: 1,
      });

      setMessage(
        `${item.product.title} added to your cart.`,
      );
    }
    catch (caughtError) {
      setMessage(
        caughtError instanceof Error
          ? caughtError.message
          : "TrustVault could not add this product to your cart.",
      );
    }
    finally {
      setBusyProductId(null);
    }
  }

  async function clearWishlist() {
    const confirmed =
      window.confirm(
        "Clear all saved Wishlist items?",
      );

    if (!confirmed) {
      return;
    }

    setIsClearing(true);
    setMessage(null);

    try {
      await browserWishlistRepository.clear();

      setItems([]);
      setStatus("empty");
    }
    catch {
      setMessage(
        "TrustVault could not clear your Wishlist.",
      );
    }
    finally {
      setIsClearing(false);
    }
  }

  if (status === "loading") {
    return (
      <WishlistState
        icon={LoaderCircle}
        title="Loading your Wishlist"
        description="TrustVault is retrieving your saved Marketplace items."
        isLoading
      />
    );
  }

  if (status === "error") {
    return (
      <WishlistState
        icon={CircleAlert}
        title="Wishlist unavailable"
        description="TrustVault could not load your Wishlist in this browser."
        actionLabel="Try again"
        onAction={loadWishlist}
      />
    );
  }

  if (
    status === "empty" ||
    items.length === 0
  ) {
    return (
      <WishlistState
        icon={Heart}
        title="Your Wishlist is empty"
        description="Save products from the Marketplace and they will appear here for later."
        actionLabel="Browse Marketplace"
        actionHref="/marketplace"
      />
    );
  }

  return (
    <section className="section-shell py-10 sm:py-14 lg:py-20">
      <Link
        href="/marketplace"
        className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-zinc-600 transition hover:text-zinc-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950"
      >
        <ArrowLeft
          aria-hidden="true"
          className="h-4 w-4"
        />
        Continue shopping
      </Link>

      <div className="mt-5 flex flex-col gap-5 border-b border-zinc-200 pb-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--tv-brand)]">
            Wishlist
          </p>

          <h1 className="mt-3 text-4xl font-semibold tracking-[-0.05em] text-zinc-950 sm:text-5xl">
            Products saved for later.
          </h1>

          <p className="mt-4 text-sm leading-7 text-zinc-600">
            {itemCount}{" "}
            {itemCount === 1
              ? "product"
              : "products"}{" "}
            saved in your TrustVault Wishlist.
          </p>
        </div>

        <button
          type="button"
          onClick={clearWishlist}
          disabled={isClearing}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-5 text-sm font-semibold text-rose-700 transition hover:border-rose-300 disabled:cursor-wait disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-600"
        >
          {isClearing ? (
            <LoaderCircle
              aria-hidden="true"
              className="h-4 w-4 animate-spin"
            />
          ) : (
            <Trash2
              aria-hidden="true"
              className="h-4 w-4"
            />
          )}

          Clear Wishlist
        </button>
      </div>

      {message && (
        <div
          role="status"
          className="mt-6 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-700 shadow-sm"
        >
          {message}
        </div>
      )}

      <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => {
          const snapshot =
            item.saved.snapshot;

          const product =
            item.product;

          const title =
            product?.title ??
            snapshot.title;

          const price =
            product?.price ??
            snapshot.price;

          const isBusy =
            busyProductId ===
            item.saved.productId;

          const productHref =
            `/marketplace/product/${encodeURIComponent(
              item.saved.productId,
            )}`;

          return (
            <article
              key={item.saved.productId}
              className="overflow-hidden rounded-[2rem] border border-zinc-200 bg-white shadow-sm"
            >
              <div className="aspect-[4/3] overflow-hidden bg-zinc-100">
                <ProductCoverImage
                  productId={
                    item.saved.productId
                  }
                  alt={title}
                />
              </div>

              <div className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-400">
                      {snapshot.sellerName}
                    </p>

                    <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-zinc-950">
                      {title}
                    </h2>
                  </div>

                  <Heart
                    aria-hidden="true"
                    className="h-5 w-5 shrink-0 fill-[var(--tv-brand)] text-[var(--tv-brand)]"
                  />
                </div>

                <div className="mt-5 border-t border-zinc-200 pt-4">
                  <p className="text-xs text-zinc-500">
                    Current price
                  </p>

                  <p className="mt-1 text-xl font-semibold text-zinc-950">
                    {price.amount}{" "}
                    {price.currency}
                  </p>
                </div>

                {!product && (
                  <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                    <p className="text-xs leading-5 text-amber-800">
                      This saved product is no longer available in the current Marketplace catalog. You can keep or remove it from your Wishlist.
                    </p>
                  </div>
                )}

                <div className="mt-5 grid gap-3">
                  {product ? (
                    <Link
                      href={productHref}
                      className="inline-flex min-h-11 items-center justify-center rounded-full bg-zinc-950 px-5 text-sm font-semibold text-white transition hover:bg-zinc-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2"
                    >
                      View product
                    </Link>
                  ) : null}

                  <button
                    type="button"
                    onClick={() =>
                      addToCart(item)
                    }
                    disabled={
                      isBusy ||
                      !product
                    }
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-zinc-300 px-5 text-sm font-semibold text-zinc-950 transition hover:border-zinc-400 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950"
                  >
                    {isBusy ? (
                      <LoaderCircle
                        aria-hidden="true"
                        className="h-4 w-4 animate-spin"
                      />
                    ) : (
                      <ShoppingCart
                        aria-hidden="true"
                        className="h-4 w-4"
                      />
                    )}

                    Add to cart
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      removeItem(
                        item.saved.productId,
                      )
                    }
                    disabled={isBusy}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-wait disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-600"
                  >
                    <Trash2
                      aria-hidden="true"
                      className="h-4 w-4"
                    />

                    Remove
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

type WishlistStateProps = {
  icon: typeof Heart;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  isLoading?: boolean;
};

function WishlistState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  isLoading = false,
}: WishlistStateProps) {
  const actionClasses =
    "mt-6 inline-flex min-h-11 items-center justify-center rounded-full bg-zinc-950 px-6 text-sm font-semibold text-white transition hover:bg-zinc-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2";

  return (
    <section className="section-shell py-16 sm:py-20 lg:py-28">
      <div className="mx-auto max-w-xl rounded-[2rem] border border-zinc-200 bg-white p-8 text-center shadow-sm sm:p-10">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-700">
          <Icon
            aria-hidden="true"
            className={`h-6 w-6 ${
              isLoading
                ? "animate-spin"
                : ""
            }`}
          />
        </div>

        <h1 className="mt-6 text-3xl font-semibold tracking-[-0.04em] text-zinc-950">
          {title}
        </h1>

        <p className="mt-4 text-sm leading-7 text-zinc-600">
          {description}
        </p>

        {actionLabel &&
        actionHref ? (
          <Link
            href={actionHref}
            className={actionClasses}
          >
            {actionLabel}
          </Link>
        ) : null}

        {actionLabel &&
        onAction ? (
          <button
            type="button"
            onClick={onAction}
            className={actionClasses}
          >
            {actionLabel}
          </button>
        ) : null}
      </div>
    </section>
  );
}