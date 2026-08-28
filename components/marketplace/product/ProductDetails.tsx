"use client";

import {
  ArrowLeft,
  Check,
  CircleAlert,
  Gift,
  LoaderCircle,
  Minus,
  Package,
  Plus,
  ShieldCheck,
  ShoppingCart,
  Store,
  Truck,
} from "lucide-react";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useState,
} from "react";

import { ProductGallery } from "@/components/marketplace/product/ProductGallery";
import { WishlistButton } from "@/components/marketplace/wishlist/WishlistButton";
import type { MarketplaceProduct } from "@/lib/marketplace/product-types";
import { isProductPurchasable } from "@/lib/marketplace/product-types";
import { browserCartRepository } from "@/lib/marketplace/repository/cart-repository";
import { browserProductRepository } from "@/lib/marketplace/repository/product-repository";

type ProductDetailsProps = {
  productId: string;
};

type ProductStatus =
  | "loading"
  | "ready"
  | "not-found"
  | "error";

type CartActionStatus =
  | "idle"
  | "adding"
  | "success"
  | "error";

export function ProductDetails({
  productId,
}: ProductDetailsProps) {
  const [status, setStatus] =
    useState<ProductStatus>("loading");

  const [product, setProduct] =
    useState<MarketplaceProduct | null>(null);

  const [quantity, setQuantity] =
    useState(1);

  const [cartActionStatus, setCartActionStatus] =
    useState<CartActionStatus>("idle");

  const [actionMessage, setActionMessage] =
    useState<string | null>(null);

  const loadProduct = useCallback(async () => {
    setStatus("loading");

    try {
      const storedProduct =
        await browserProductRepository.findById(
          productId,
        );

      if (!storedProduct) {
        setStatus("not-found");
        return;
      }

      setProduct(storedProduct.product);
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }, [productId]);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => {
      loadProduct();
    }, 0);

    return () => {
      window.clearTimeout(initialLoad);
    };
  }, [loadProduct]);

  if (status === "loading") {
    return (
      <ProductPageState
        icon={LoaderCircle}
        title="Loading product"
        description="TrustVault is retrieving this Marketplace product."
        isLoading
      />
    );
  }

  if (status === "not-found") {
    return (
      <ProductPageState
        icon={Package}
        title="Product not found"
        description="This product is not available in the imported Marketplace catalog."
      />
    );
  }

  if (
    status === "error" ||
    !product
  ) {
    return (
      <ProductPageState
        icon={CircleAlert}
        title="Product unavailable"
        description="TrustVault could not load this product."
        actionLabel="Try again"
        onAction={loadProduct}
      />
    );
  }

  const activeProduct = product;

  const purchasable =
    isProductPurchasable(activeProduct);

  const availableQuantity =
    activeProduct.inventory.tracked
      ? activeProduct.inventory.quantity
      : null;

  const canIncrease =
    availableQuantity === null ||
    quantity < availableQuantity ||
    activeProduct.inventory.policy === "continue";

  const isAddingToCart =
    cartActionStatus === "adding";

  function clearActionState() {
    setCartActionStatus("idle");
    setActionMessage(null);
  }

  function decreaseQuantity() {
    setQuantity((currentQuantity) =>
      Math.max(1, currentQuantity - 1),
    );

    clearActionState();
  }

  function increaseQuantity() {
    if (!canIncrease) {
      return;
    }

    setQuantity((currentQuantity) =>
      currentQuantity + 1,
    );

    clearActionState();
  }

  async function handleAddToCart() {
    if (
      !purchasable ||
      isAddingToCart
    ) {
      return;
    }

    setCartActionStatus("adding");
    setActionMessage(null);

    try {
      const updatedCart =
        await browserCartRepository.addItem({
          product: activeProduct,
          quantity,
        });

      const itemCount =
        updatedCart.items.reduce(
          (total, item) =>
            total + item.quantity,
          0,
        );

      setCartActionStatus("success");

      setActionMessage(
        `${quantity} × ${activeProduct.title} added to your cart. Your cart now contains ${itemCount} item${itemCount === 1 ? "" : "s"}.`,
      );
    } catch (caughtError) {
      setCartActionStatus("error");

      setActionMessage(
        caughtError instanceof Error
          ? caughtError.message
          : "TrustVault could not add this product to your cart.",
      );
    }
  }

  function handleBuyPreview() {
    setCartActionStatus("idle");

    setActionMessage(
      `${activeProduct.title} is ready for TrustVault checkout and transaction review.`,
    );
  }

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
        Back to Marketplace
      </Link>

      <div className="mt-6 grid gap-10 lg:grid-cols-[minmax(0,1.16fr)_minmax(22rem,0.84fr)] lg:items-start">
        <ProductGallery
          productId={activeProduct.id}
          productTitle={activeProduct.title}
        />

        <div className="lg:sticky lg:top-28">
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-600">
              {activeProduct.category}
            </span>

            {activeProduct.subcategory && (
              <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-600">
                {activeProduct.subcategory}
              </span>
            )}

            {activeProduct.escrowEligible && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                <ShieldCheck
                  aria-hidden="true"
                  className="h-3.5 w-3.5"
                />
                Escrow eligible
              </span>
            )}
          </div>

          <h1 className="mt-5 text-5xl font-semibold tracking-[-0.055em] text-zinc-950 sm:text-6xl">
            {activeProduct.title}
          </h1>

          <div className="mt-4">
            <WishlistButton
              product={activeProduct}
              showLabel
            />
          </div>

          <p className="mt-5 text-base leading-8 text-zinc-600">
            {activeProduct.description}
          </p>

          <div className="mt-7 border-y border-zinc-200 py-6">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
              Price
            </p>

            <p className="mt-2 text-4xl font-semibold tracking-[-0.045em] text-zinc-950">
              {activeProduct.price.amount}{" "}
              <span className="text-2xl">
                {activeProduct.price.currency}
              </span>
            </p>

            <div className="mt-5 flex flex-wrap gap-3 text-xs font-semibold">
              <TrustIndicator label="Transaction review" />
              <TrustIndicator label="USDC transaction review" />
              <TrustIndicator label="On-chain receipt" />
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <DetailCard
              icon={Store}
              label="Seller"
              value={
                activeProduct.seller.storeName ??
                activeProduct.seller.displayName
              }
              secondary={
                activeProduct.seller.verified
                  ? "Verified seller"
                  : "Catalog seller"
              }
            />

            <DetailCard
              icon={Truck}
              label="Estimated delivery"
              value={
                activeProduct.productType === "digital"
                  ? "Available after settlement"
                  : "5–10 business days"
              }
              secondary={
                activeProduct.productType === "digital"
                  ? "Digital delivery"
                  : "Confirmed during checkout"
              }
            />

            <DetailCard
              icon={ShieldCheck}
              label="Settlement model"
              value={
                activeProduct.escrowEligible
                  ? "Escrow eligible"
                  : "Direct settlement"
              }
              secondary={
                activeProduct.escrowEligible
                  ? "Onchain escrow not active yet"
                  : "No onchain escrow active"
              }
            />

            <DetailCard
              icon={Gift}
              label="Gift option"
              value={
                activeProduct.giftEligible
                  ? "Available"
                  : "Not available"
              }
              secondary={
                activeProduct.giftEligible
                  ? "Recipient details added at checkout"
                  : "Standard purchase only"
              }
            />
          </div>

          <div className="mt-7 rounded-3xl border border-zinc-200 bg-white p-5">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-zinc-950">
                  Quantity
                </p>

                <p className="mt-1 text-xs text-zinc-500">
                  {availableQuantity === null
                    ? "Available"
                    : `${availableQuantity} currently available`}
                </p>
              </div>

              <div className="inline-flex w-fit items-center rounded-full border border-zinc-300 bg-white p-1">
                <button
                  type="button"
                  onClick={decreaseQuantity}
                  disabled={
                    quantity <= 1 ||
                    isAddingToCart
                  }
                  aria-label="Decrease quantity"
                  className="flex h-10 w-10 items-center justify-center rounded-full text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-35 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950"
                >
                  <Minus
                    aria-hidden="true"
                    className="h-4 w-4"
                  />
                </button>

                <span className="min-w-12 text-center text-sm font-semibold text-zinc-950">
                  {quantity}
                </span>

                <button
                  type="button"
                  onClick={increaseQuantity}
                  disabled={
                    !canIncrease ||
                    isAddingToCart
                  }
                  aria-label="Increase quantity"
                  className="flex h-10 w-10 items-center justify-center rounded-full text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-35 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950"
                >
                  <Plus
                    aria-hidden="true"
                    className="h-4 w-4"
                  />
                </button>
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={
                  !purchasable ||
                  isAddingToCart
                }
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-zinc-300 bg-white px-6 text-sm font-semibold text-zinc-950 transition hover:border-zinc-400 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950"
              >
                {isAddingToCart ? (
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

                {isAddingToCart
                  ? "Adding to cart…"
                  : "Add to Cart"}
              </button>

              <button
                type="button"
                onClick={handleBuyPreview}
                disabled={!purchasable}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[var(--tv-brand)] px-6 text-sm font-semibold text-white transition hover:bg-[var(--tv-brand-hover)] disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tv-brand)] focus-visible:ring-offset-4"
              >
                <ShieldCheck
                  aria-hidden="true"
                  className="h-4 w-4"
                />
                Buy Now
              </button>
            </div>

            {!purchasable && (
              <p className="mt-4 text-xs leading-5 text-rose-700">
                This product is currently unavailable for purchase.
              </p>
            )}

            {actionMessage && (
              <div
                role={
                  cartActionStatus === "error"
                    ? "alert"
                    : "status"
                }
                className={`mt-4 flex items-start gap-3 rounded-2xl border p-4 ${
                  cartActionStatus === "error"
                    ? "border-rose-200 bg-rose-50"
                    : "border-emerald-200 bg-emerald-50"
                }`}
              >
                {cartActionStatus === "error" ? (
                  <CircleAlert
                    aria-hidden="true"
                    className="mt-0.5 h-4 w-4 shrink-0 text-rose-700"
                  />
                ) : (
                  <Check
                    aria-hidden="true"
                    className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700"
                  />
                )}

                <div>
                  <p
                    className={`text-xs leading-5 ${
                      cartActionStatus === "error"
                        ? "text-rose-800"
                        : "text-emerald-800"
                    }`}
                  >
                    {actionMessage}
                  </p>

                  {cartActionStatus === "success" && (
                    <Link
                      href="/cart"
                      className="mt-2 inline-block text-xs font-semibold text-emerald-900 underline underline-offset-4"
                    >
                      View cart
                    </Link>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-6 text-amber-800">
            Adding products to the cart does not move funds. Payment,
            escrow creation and wallet signing begin only during checkout.
          </div>

          <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 font-mono text-xs text-zinc-400">
            <span>{activeProduct.id}</span>
            <span>SKU: {activeProduct.sku}</span>
          </div>
        </div>
      </div>
    </section>
  );
}

function TrustIndicator({
  label,
}: {
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 text-emerald-700">
      <Check
        aria-hidden="true"
        className="h-4 w-4"
      />
      {label}
    </span>
  );
}

type DetailCardProps = {
  icon: typeof Store;
  label: string;
  value: string;
  secondary: string;
};

function DetailCard({
  icon: Icon,
  label,
  value,
  secondary,
}: DetailCardProps) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4">
      <div className="flex items-center gap-2 text-zinc-500">
        <Icon
          aria-hidden="true"
          className="h-4 w-4"
        />

        <p className="text-xs font-medium">
          {label}
        </p>
      </div>

      <p className="mt-3 text-sm font-semibold text-zinc-950">
        {value}
      </p>

      <p className="mt-1 text-xs leading-5 text-zinc-500">
        {secondary}
      </p>
    </div>
  );
}

type ProductPageStateProps = {
  icon: typeof Package;
  title: string;
  description: string;
  isLoading?: boolean;
  actionLabel?: string;
  onAction?: () => void;
};

function ProductPageState({
  icon: Icon,
  title,
  description,
  isLoading = false,
  actionLabel,
  onAction,
}: ProductPageStateProps) {
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

        {!isLoading && (
          <Link
            href="/marketplace"
            className="mt-4 block text-sm font-semibold text-zinc-600 transition hover:text-zinc-950"
          >
            Return to Marketplace
          </Link>
        )}
      </div>
    </section>
  );
}





