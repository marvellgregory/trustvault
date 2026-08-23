"use client";

import {
  Heart,
  LoaderCircle,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useState,
} from "react";

import type {
  MarketplaceProduct,
} from "@/lib/marketplace/product-types";
import {
  browserWishlistRepository,
  subscribeToWishlistUpdates,
} from "@/lib/marketplace/repository/wishlist-repository";

type WishlistButtonProps = {
  product: MarketplaceProduct;
  className?: string;
  showLabel?: boolean;
};

type WishlistButtonStatus =
  | "loading"
  | "ready"
  | "saving"
  | "error";

export function WishlistButton({
  product,
  className = "",
  showLabel = false,
}: WishlistButtonProps) {
  const [isSaved, setIsSaved] =
    useState(false);

  const [status, setStatus] =
    useState<WishlistButtonStatus>(
      "loading",
    );

  const loadSavedState =
    useCallback(async () => {
      try {
        const saved =
          await browserWishlistRepository.has(
            product.id,
          );

        setIsSaved(saved);
        setStatus("ready");
      }
      catch {
        setStatus("error");
      }
    }, [product.id]);

  useEffect(() => {
    let active = true;

    async function initialLoad() {
      if (!active) {
        return;
      }

      await loadSavedState();
    }

    initialLoad();

    const unsubscribe =
      subscribeToWishlistUpdates(
        (wishlist) => {
          if (!active) {
            return;
          }

          setIsSaved(
            wishlist.items.some(
              (item) =>
                item.productId ===
                product.id,
            ),
          );

          setStatus("ready");
        },
      );

    return () => {
      active = false;
      unsubscribe();
    };
  }, [
    loadSavedState,
    product.id,
  ]);

  async function toggleWishlist() {
    if (status === "saving") {
      return;
    }

    setStatus("saving");

    try {
      const updatedWishlist =
        await browserWishlistRepository.toggle(
          product,
        );

      setIsSaved(
        updatedWishlist.items.some(
          (item) =>
            item.productId ===
            product.id,
        ),
      );

      setStatus("ready");
    }
    catch {
      setStatus("error");
    }
  }

  const isBusy =
    status === "loading" ||
    status === "saving";

  const label =
    isSaved
      ? `Remove ${product.title} from Wishlist`
      : `Save ${product.title} to Wishlist`;

  return (
    <button
      type="button"
      onClick={toggleWishlist}
      disabled={isBusy}
      aria-label={label}
      aria-pressed={isSaved}
      title={label}
      className={`inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-full border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-700 shadow-sm transition hover:border-zinc-400 hover:text-zinc-950 disabled:cursor-wait disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2 ${className}`}
    >
      {isBusy ? (
        <LoaderCircle
          aria-hidden="true"
          className="h-5 w-5 animate-spin"
        />
      ) : (
        <Heart
          aria-hidden="true"
          className={`h-5 w-5 ${
            isSaved
              ? "fill-[var(--tv-brand)] text-[var(--tv-brand)]"
              : "text-zinc-600"
          }`}
        />
      )}

      {showLabel ? (
        <span>
          {isSaved
            ? "Saved"
            : "Save"}
        </span>
      ) : null}
    </button>
  );
}