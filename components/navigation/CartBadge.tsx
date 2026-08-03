"use client";

import { ShoppingCart } from "lucide-react";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  browserCartRepository,
  subscribeToCartUpdates,
} from "@/lib/marketplace/repository/cart-repository";
import type { MarketplaceCart } from "@/lib/marketplace/cart-types";

type CartBadgeProps = {
  compact?: boolean;
  className?: string;
};

export function CartBadge({
  compact = false,
  className = "",
}: CartBadgeProps) {
  const [itemCount, setItemCount] =
    useState(0);

  const [isReady, setIsReady] =
    useState(false);

  const updateCount = useCallback(
    (cart: MarketplaceCart) => {
      const count = cart.items.reduce(
        (total, item) =>
          total + item.quantity,
        0,
      );

      setItemCount(count);
      setIsReady(true);
    },
    [],
  );

  useEffect(() => {
    let isMounted = true;

    async function loadCartCount() {
      try {
        const cart =
          await browserCartRepository.getCart();

        if (isMounted) {
          updateCount(cart);
        }
      } catch {
        if (isMounted) {
          setIsReady(true);
        }
      }
    }

    loadCartCount();

    const unsubscribe =
      subscribeToCartUpdates(
        (cart) => {
          if (isMounted) {
            updateCount(cart);
          }
        },
      );

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [updateCount]);

  const countLabel =
    itemCount > 99
      ? "99+"
      : String(itemCount);

  return (
    <Link
      href="/cart"
      aria-label={
        itemCount === 0
          ? "Open empty shopping cart"
          : `Open shopping cart with ${itemCount} item${
              itemCount === 1
                ? ""
                : "s"
            }`
      }
      className={`relative inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-950 transition hover:border-zinc-400 hover:bg-zinc-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 ${className}`}
    >
      <ShoppingCart
        aria-hidden="true"
        className="h-4 w-4"
      />

      {!compact && (
        <span>Cart</span>
      )}

      {isReady && itemCount > 0 && (
        <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-[var(--tv-brand)] px-1.5 py-0.5 text-[0.65rem] font-bold leading-5 text-white">
          {countLabel}
        </span>
      )}
    </Link>
  );
}
