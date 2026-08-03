"use client";

import {
  ArrowLeft,
  ArrowRight,
  CircleAlert,
  LoaderCircle,
  Minus,
  Package,
  Plus,
  ShieldCheck,
  ShoppingCart,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { ProductCoverImage } from "@/components/marketplace/ProductCoverImage";
import type {
  CartItem,
  MarketplaceCart,
} from "@/lib/marketplace/cart-types";
import {
  browserCartRepository,
  subscribeToCartUpdates,
} from "@/lib/marketplace/repository/cart-repository";

type CartPageStatus =
  | "loading"
  | "ready"
  | "empty"
  | "error";

export function ShoppingCartPage() {
  const [status, setStatus] =
    useState<CartPageStatus>("loading");

  const [cart, setCart] =
    useState<MarketplaceCart | null>(null);

  const [busyItemId, setBusyItemId] =
    useState<string | null>(null);

  const [isClearing, setIsClearing] =
    useState(false);

  const [message, setMessage] =
    useState<string | null>(null);

  const loadCart = useCallback(async () => {
    setStatus("loading");

    try {
      const currentCart =
        await browserCartRepository.getCart();

      setCart(currentCart);

      setStatus(
        currentCart.items.length > 0
          ? "ready"
          : "empty",
      );
    } catch {
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    loadCart();

    const unsubscribe =
      subscribeToCartUpdates(
        (updatedCart) => {
          setCart(updatedCart);

          setStatus(
            updatedCart.items.length > 0
              ? "ready"
              : "empty",
          );
        },
      );

    return unsubscribe;
  }, [loadCart]);

  const protectedAmount = useMemo(() => {
    if (!cart) {
      return 0;
    }

    return cart.items.reduce(
      (total, item) => {
        if (!item.snapshot.escrowEligible) {
          return total;
        }

        const unitPrice = Number(
          item.snapshot.unitPrice.amount,
        );

        if (!Number.isFinite(unitPrice)) {
          return total;
        }

        return (
          total +
          unitPrice * item.quantity
        );
      },
      0,
    );
  }, [cart]);

  async function updateQuantity(
    item: CartItem,
    nextQuantity: number,
  ) {
    if (
      nextQuantity < 1 ||
      busyItemId
    ) {
      return;
    }

    setBusyItemId(item.id);
    setMessage(null);

    try {
      const updatedCart =
        await browserCartRepository.updateItem({
          cartItemId: item.id,
          quantity: nextQuantity,
        });

      setCart(updatedCart);
      setStatus(
        updatedCart.items.length > 0
          ? "ready"
          : "empty",
      );
    } catch (caughtError) {
      setMessage(
        caughtError instanceof Error
          ? caughtError.message
          : "TrustVault could not update this cart item.",
      );
    } finally {
      setBusyItemId(null);
    }
  }

  async function removeItem(
    item: CartItem,
  ) {
    if (busyItemId) {
      return;
    }

    setBusyItemId(item.id);
    setMessage(null);

    try {
      const updatedCart =
        await browserCartRepository.removeItem(
          item.id,
        );

      setCart(updatedCart);

      setStatus(
        updatedCart.items.length > 0
          ? "ready"
          : "empty",
      );
    } catch {
      setMessage(
        "TrustVault could not remove this item.",
      );
    } finally {
      setBusyItemId(null);
    }
  }

  async function clearCart() {
    if (!cart || cart.items.length === 0) {
      return;
    }

    const confirmed = window.confirm(
      "Remove every item from your TrustVault cart?",
    );

    if (!confirmed) {
      return;
    }

    setIsClearing(true);
    setMessage(null);

    try {
      const emptyCart =
        await browserCartRepository.clear();

      setCart(emptyCart);
      setStatus("empty");
    } catch {
      setMessage(
        "TrustVault could not clear the cart.",
      );
    } finally {
      setIsClearing(false);
    }
  }

  if (status === "loading") {
    return (
      <CartState
        icon={LoaderCircle}
        title="Loading your cart"
        description="TrustVault is retrieving your saved Marketplace items."
        isLoading
      />
    );
  }

  if (status === "error") {
    return (
      <CartState
        icon={CircleAlert}
        title="Cart unavailable"
        description="TrustVault could not load your saved cart."
        actionLabel="Try again"
        onAction={loadCart}
      />
    );
  }

  if (
    status === "empty" ||
    !cart ||
    cart.items.length === 0
  ) {
    return (
      <CartState
        icon={ShoppingCart}
        title="Your cart is empty"
        description="Browse the Marketplace and add products prepared for protected TrustVault checkout."
        actionLabel="Browse Marketplace"
        actionHref="/marketplace"
      />
    );
  }

  const itemCount =
    cart.items.reduce(
      (total, item) =>
        total + item.quantity,
      0,
    );

  return (
    <section className="section-shell py-10 sm:py-14 lg:py-20">
      <Link
        href="/marketplace"
        className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-zinc-600 transition hover:text-zinc-950"
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
            Shopping Cart
          </p>

          <h1 className="mt-3 text-4xl font-semibold tracking-[-0.05em] text-zinc-950 sm:text-5xl">
            Review your protected purchase.
          </h1>

          <p className="mt-4 text-sm leading-7 text-zinc-600">
            {itemCount}{" "}
            {itemCount === 1
              ? "item"
              : "items"}{" "}
            saved in your TrustVault cart.
          </p>
        </div>

        <button
          type="button"
          onClick={clearCart}
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

          Clear cart
        </button>
      </div>

      {message && (
        <div
          role="alert"
          className="mt-6 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4"
        >
          <CircleAlert
            aria-hidden="true"
            className="mt-0.5 h-4 w-4 shrink-0 text-rose-700"
          />

          <p className="text-xs leading-5 text-rose-800">
            {message}
          </p>
        </div>
      )}

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] xl:grid-cols-[minmax(0,1fr)_25rem]">
        <div className="space-y-4">
          {cart.items.map((item) => (
            <CartItemCard
              key={item.id}
              item={item}
              isBusy={
                busyItemId === item.id
              }
              onDecrease={() =>
                updateQuantity(
                  item,
                  item.quantity - 1,
                )
              }
              onIncrease={() =>
                updateQuantity(
                  item,
                  item.quantity + 1,
                )
              }
              onRemove={() =>
                removeItem(item)
              }
            />
          ))}
        </div>

        <aside className="h-fit rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-sm lg:sticky lg:top-28">
          <h2 className="text-xl font-semibold tracking-[-0.03em] text-zinc-950">
            Order summary
          </h2>

          <div className="mt-6 space-y-4 border-b border-zinc-200 pb-6 text-sm">
            <SummaryRow
              label="Subtotal"
              value={`${cart.totals.subtotal.amount} USDC`}
            />

            <SummaryRow
              label="Shipping"
              value={
                Number(
                  cart.totals.shipping.amount,
                ) > 0
                  ? `${cart.totals.shipping.amount} USDC`
                  : "Calculated at checkout"
              }
            />

            <SummaryRow
              label="Discount"
              value={`${cart.totals.discount.amount} USDC`}
            />
          </div>

          <div className="mt-6 flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-zinc-950">
                Estimated total
              </p>

              <p className="mt-1 text-xs text-zinc-500">
                Before final network fees
              </p>
            </div>

            <p className="text-right text-2xl font-semibold tracking-[-0.04em] text-zinc-950">
              {cart.totals.total.amount}{" "}
              <span className="text-base">
                USDC
              </span>
            </p>
          </div>

          <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <div className="flex items-start gap-3">
              <ShieldCheck
                aria-hidden="true"
                className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700"
              />

              <div>
                <p className="text-sm font-semibold text-emerald-950">
                  Escrow protection
                </p>

                <p className="mt-1 text-xs leading-5 text-emerald-800">
                  Up to{" "}
                  {formatAmount(
                    protectedAmount,
                  )}{" "}
                  USDC is marked as eligible for protected settlement.
                </p>
              </div>
            </div>
          </div>

          <Link
            href="/checkout"
            className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[var(--tv-brand)] px-6 text-sm font-semibold text-white transition hover:bg-[var(--tv-brand-hover)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tv-brand)] focus-visible:ring-offset-4"
          >
            Proceed to protected checkout
            <ArrowRight
              aria-hidden="true"
              className="h-4 w-4"
            />
          </Link>

          <p className="mt-4 text-center text-xs leading-5 text-zinc-500">
            No funds move until checkout is reviewed and approved in your wallet.
          </p>
        </aside>
      </div>
    </section>
  );
}

type CartItemCardProps = {
  item: CartItem;
  isBusy: boolean;
  onDecrease: () => void;
  onIncrease: () => void;
  onRemove: () => void;
};

function CartItemCard({
  item,
  isBusy,
  onDecrease,
  onIncrease,
  onRemove,
}: CartItemCardProps) {
  const unitPrice = Number(
    item.snapshot.unitPrice.amount,
  );

  const subtotal =
    Number.isFinite(unitPrice)
      ? unitPrice * item.quantity
      : 0;

  return (
    <article className="rounded-[2rem] border border-zinc-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-5 sm:flex-row">
        <Link
          href={`/marketplace/product/${encodeURIComponent(
            item.productId,
          )}`}
          className="block aspect-square w-full shrink-0 overflow-hidden rounded-2xl bg-zinc-100 sm:w-36"
        >
          <ProductCoverImage
            productId={item.productId}
            alt={item.snapshot.title}
          />
        </Link>

        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
                {item.snapshot.sellerName}
              </p>

              <Link
                href={`/marketplace/product/${encodeURIComponent(
                  item.productId,
                )}`}
                className="mt-2 block text-xl font-semibold tracking-[-0.03em] text-zinc-950 transition hover:text-zinc-600"
              >
                {item.snapshot.title}
              </Link>

              <p className="mt-2 font-mono text-xs text-zinc-400">
                {item.snapshot.sku}
              </p>
            </div>

            <p className="text-xl font-semibold text-zinc-950">
              {formatAmount(subtotal)}{" "}
              <span className="text-sm">
                USDC
              </span>
            </p>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {item.snapshot.escrowEligible && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                <ShieldCheck
                  aria-hidden="true"
                  className="h-3.5 w-3.5"
                />
                Escrow eligible
              </span>
            )}

            <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-600">
              {item.snapshot.unitPrice.amount} USDC each
            </span>
          </div>

          <div className="mt-5 flex flex-col gap-3 border-t border-zinc-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="inline-flex w-fit items-center rounded-full border border-zinc-300 bg-white p-1">
              <button
                type="button"
                onClick={onDecrease}
                disabled={
                  item.quantity <= 1 ||
                  isBusy
                }
                aria-label="Decrease quantity"
                className="flex h-9 w-9 items-center justify-center rounded-full text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-35 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950"
              >
                <Minus
                  aria-hidden="true"
                  className="h-4 w-4"
                />
              </button>

              <span className="min-w-11 text-center text-sm font-semibold text-zinc-950">
                {item.quantity}
              </span>

              <button
                type="button"
                onClick={onIncrease}
                disabled={isBusy}
                aria-label="Increase quantity"
                className="flex h-9 w-9 items-center justify-center rounded-full text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-35 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950"
              >
                {isBusy ? (
                  <LoaderCircle
                    aria-hidden="true"
                    className="h-4 w-4 animate-spin"
                  />
                ) : (
                  <Plus
                    aria-hidden="true"
                    className="h-4 w-4"
                  />
                )}
              </button>
            </div>

            <button
              type="button"
              onClick={onRemove}
              disabled={isBusy}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full px-4 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-600"
            >
              <Trash2
                aria-hidden="true"
                className="h-4 w-4"
              />
              Remove
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

type SummaryRowProps = {
  label: string;
  value: string;
};

function SummaryRow({
  label,
  value,
}: SummaryRowProps) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-zinc-500">
        {label}
      </span>

      <span className="text-right font-semibold text-zinc-950">
        {value}
      </span>
    </div>
  );
}

type CartStateProps = {
  icon: typeof Package;
  title: string;
  description: string;
  isLoading?: boolean;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
};

function CartState({
  icon: Icon,
  title,
  description,
  isLoading = false,
  actionLabel,
  actionHref,
  onAction,
}: CartStateProps) {
  return (
    <section className="section-shell py-20 sm:py-24 lg:py-32">
      <div className="mx-auto max-w-xl rounded-[2rem] border border-zinc-200 bg-white p-8 text-center shadow-[var(--tv-shadow-md)] sm:p-10">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-700">
          <Icon
            aria-hidden="true"
            className={`h-6 w-6 ${
              isLoading
                ? "animate-spin"
                : ""
            }`}
          />
        </span>

        <h1 className="mt-6 text-3xl font-semibold tracking-[-0.04em] text-zinc-950">
          {title}
        </h1>

        <p className="mt-4 text-sm leading-7 text-zinc-600">
          {description}
        </p>

        {actionLabel &&
          (actionHref ? (
            <Link
              href={actionHref}
              className="mt-7 inline-flex min-h-11 items-center justify-center rounded-full bg-zinc-950 px-5 text-sm font-semibold text-white transition hover:bg-zinc-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-4"
            >
              {actionLabel}
            </Link>
          ) : (
            <button
              type="button"
              onClick={onAction}
              className="mt-7 inline-flex min-h-11 items-center justify-center rounded-full bg-zinc-950 px-5 text-sm font-semibold text-white transition hover:bg-zinc-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-4"
            >
              {actionLabel}
            </button>
          ))}
      </div>
    </section>
  );
}

function formatAmount(value: number) {
  if (!Number.isFinite(value)) {
    return "0";
  }

  return value
    .toFixed(6)
    .replace(/\.?0+$/, "");
}
