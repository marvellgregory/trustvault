"use client";

import {
  ArrowLeft,
  Check,
  CircleAlert,
  LoaderCircle,
  LockKeyhole,
  MapPin,
  ReceiptText,
  ShieldCheck,
  ShoppingBag,
  Truck,
  UserRound,
  WalletCards,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  type ChangeEvent,
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
import type {
  MarketplaceOrderItem,
  OrderAddress,
} from "@/lib/marketplace/order-types";
import {
  browserCartRepository,
  subscribeToCartUpdates,
} from "@/lib/marketplace/repository/cart-repository";
import {
  validateSettlementWalletForBuyer,
} from "@/lib/marketplace/payments/settlement-config";
import {
  browserOrderRepository,
  createOrderItemFromCartSnapshot,
} from "@/lib/marketplace/repository/order-repository";

type CheckoutStatus =
  | "loading"
  | "ready"
  | "empty"
  | "error";

type CheckoutForm = {
  fullName: string;
  email: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
};

type CheckoutField = keyof CheckoutForm;

type EthereumProvider = {
  request: (input: {
    method: string;
    params?: unknown[];
  }) => Promise<unknown>;
};

const initialForm: CheckoutForm = {
  fullName: "",
  email: "",
  phone: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  postalCode: "",
  country: "India",
};

const requiredFields: CheckoutField[] = [
  "fullName",
  "email",
  "addressLine1",
  "city",
  "state",
  "postalCode",
  "country",
];

function getEthereumProvider() {
  if (typeof window === "undefined") {
    return null;
  }

  return (
    window as unknown as {
      ethereum?: EthereumProvider;
    }
  ).ethereum ?? null;
}

async function readWalletContext() {
  const provider = getEthereumProvider();

  if (!provider) {
    throw new Error(
      "MetaMask was not detected. Install or enable MetaMask before creating the order.",
    );
  }

  const accountsResult = await provider.request({
    method: "eth_accounts",
  });

  const accounts = Array.isArray(accountsResult)
    ? accountsResult.filter(
        (value): value is string =>
          typeof value === "string",
      )
    : [];

  if (!accounts[0]) {
    throw new Error(
      "Connect your wallet before continuing to payment review.",
    );
  }

  const chainResult = await provider.request({
    method: "eth_chainId",
  });

  const chainId =
    typeof chainResult === "string"
      ? Number.parseInt(chainResult, 16)
      : 0;

  if (!Number.isFinite(chainId) || chainId <= 0) {
    throw new Error(
      "TrustVault could not read the active wallet network.",
    );
  }

  return {
    walletAddress: accounts[0],
    chainId,
  };
}

function createShippingSelection(
  item: CartItem,
) {
  if (
    item.snapshot.productType === "digital" ||
    item.snapshot.productType === "service"
  ) {
    return undefined;
  }

  return {
    methodId: "standard-protected-delivery",
    methodName: "Standard delivery",
    price: {
      amount: "0",
      currency: "USDC" as const,
    },
    estimatedDelivery: "5–10 business days",
    trackingAvailable: true,
  };
}

function createOrderItems(
  cart: MarketplaceCart,
): MarketplaceOrderItem[] {
  return cart.items.map((item) =>
    createOrderItemFromCartSnapshot({
      itemId: item.id,
      productId: item.productId,
      variantId: item.variantId,
      quantity: item.quantity,
      sku: item.snapshot.sku,
      title: item.snapshot.title,
      slug: item.snapshot.slug,
      coverImageSrc:
        item.snapshot.coverImageSrc,
      selectedOptions:
        item.selectedOptions,
      unitPriceAmount:
        item.snapshot.unitPrice.amount,
      gift: item.gift,
      shipping:
        item.shipping ??
        createShippingSelection(item),
    }),
  );
}

export function ProtectedCheckoutPage() {
  const router = useRouter();

  const [status, setStatus] =
    useState<CheckoutStatus>("loading");

  const [cart, setCart] =
    useState<MarketplaceCart | null>(null);

  const [form, setForm] =
    useState<CheckoutForm>(initialForm);

  const [touched, setTouched] =
    useState<
      Partial<Record<CheckoutField, boolean>>
    >({});

  const [isPreparing, setIsPreparing] =
    useState(false);

  const [message, setMessage] =
    useState<string | null>(null);

  const [messageTone, setMessageTone] =
    useState<"success" | "error">("success");

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
      subscribeToCartUpdates((updatedCart) => {
        setCart(updatedCart);

        setStatus(
          updatedCart.items.length > 0
            ? "ready"
            : "empty",
        );
      });

    return unsubscribe;
  }, [loadCart]);

  const escrowAmount = useMemo(() => {
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

        return Number.isFinite(unitPrice)
          ? total + unitPrice * item.quantity
          : total;
      },
      0,
    );
  }, [cart]);

  function updateField(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const field =
      event.target.name as CheckoutField;

    setForm((currentForm) => ({
      ...currentForm,
      [field]: event.target.value,
    }));

    setMessage(null);
  }

  function markTouched(field: CheckoutField) {
    setTouched((currentTouched) => ({
      ...currentTouched,
      [field]: true,
    }));
  }

  function getFieldError(field: CheckoutField) {
    if (!touched[field]) {
      return null;
    }

    const value = form[field].trim();

    if (
      requiredFields.includes(field) &&
      !value
    ) {
      return "This field is required.";
    }

    if (
      field === "email" &&
      value &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
    ) {
      return "Enter a valid email address.";
    }

    return null;
  }

  function isFormValid() {
    return (
      requiredFields.every(
        (field) =>
          form[field].trim().length > 0,
      ) &&
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        form.email.trim(),
      )
    );
  }

  function createOrderAddress(): OrderAddress {
    return {
      fullName: form.fullName.trim(),
      phone: form.phone.trim() || undefined,
      email: form.email.trim(),
      addressLine1:
        form.addressLine1.trim(),
      addressLine2:
        form.addressLine2.trim() || undefined,
      city: form.city.trim(),
      state: form.state.trim() || undefined,
      postalCode: form.postalCode.trim(),
      country: form.country.trim(),
    };
  }

  async function handlePrepareOrder() {
    if (!cart || cart.items.length === 0) {
      return;
    }

    const allTouched =
      requiredFields.reduce(
        (result, field) => ({
          ...result,
          [field]: true,
        }),
        {} as Partial<
          Record<CheckoutField, boolean>
        >,
      );

    setTouched(allTouched);
    setMessage(null);

    if (!isFormValid()) {
      setMessageTone("error");
      setMessage(
        "Complete the required buyer and delivery details before continuing.",
      );
      return;
    }

    setIsPreparing(true);

    try {
      const wallet =
        await readWalletContext();

      const firstItem = cart.items[0];

      if (!firstItem) {
        throw new Error(
          "Your cart does not contain an orderable item.",
        );
      }

      const sellerId =
        firstItem.snapshot.sellerId;

      const hasMultipleSellers =
        cart.items.some(
          (item) =>
            item.snapshot.sellerId !== sellerId,
        );

      if (hasMultipleSellers) {
        throw new Error(
          "This checkout contains products from multiple sellers. Multi-seller order splitting will be added in the next commerce milestone.",
        );
      }

      const address = createOrderAddress();

      const settlementWallet =
        validateSettlementWalletForBuyer(
          wallet.walletAddress,
        );

      const order =
        await browserOrderRepository.create({
          cartId: cart.id,

          buyer: {
            walletAddress:
              wallet.walletAddress,
            displayName:
              form.fullName.trim(),
            email:
              form.email.trim(),
          },

          seller: {
            id: sellerId,
            displayName:
              firstItem.snapshot.sellerName,
            storeName:
              firstItem.snapshot.sellerName,
            walletAddress:
              settlementWallet,
            verified: false,
          },

          items: createOrderItems(cart),

          billingAddress: address,
          shippingAddress: address,

          totals: cart.totals,

          network: "Active wallet network",
          chainId: wallet.chainId,
        });

      const pendingOrder =
        await browserOrderRepository.updateStatus({
          orderId: order.id,
          status: "pending-payment",
          note:
            "Checkout details were verified. The order is ready for wallet payment review.",
          actor: {
            type: "buyer",
            id: wallet.walletAddress,
            displayName:
              form.fullName.trim(),
          },
        });

      await browserCartRepository.clear();

      setMessageTone("success");
      setMessage(
        `Order ${pendingOrder.orderNumber} created successfully.`,
      );

      router.push(
        `/payment-review?orderId=${encodeURIComponent(
          pendingOrder.id,
        )}`,
      );
    } catch (caughtError) {
      setMessageTone("error");

      setMessage(
        caughtError instanceof Error
          ? caughtError.message
          : "TrustVault could not create the Marketplace order.",
      );
    } finally {
      setIsPreparing(false);
    }
  }

  if (status === "loading") {
    return (
      <CheckoutState
        icon={LoaderCircle}
        title="Loading Marketplace checkout"
        description="TrustVault is retrieving your cart and preparing the checkout review."
        isLoading
      />
    );
  }

  if (status === "error") {
    return (
      <CheckoutState
        icon={CircleAlert}
        title="Checkout unavailable"
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
      <CheckoutState
        icon={ShoppingBag}
        title="Your cart is empty"
        description="Add products to your cart before beginning Marketplace checkout."
        actionLabel="Browse Marketplace"
        actionHref="/marketplace"
      />
    );
  }

  return (
    <section className="section-shell py-10 sm:py-14 lg:py-20">
      <Link
        href="/cart"
        className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-zinc-600 transition hover:text-zinc-950"
      >
        <ArrowLeft
          aria-hidden="true"
          className="h-4 w-4"
        />
        Return to cart
      </Link>

      <div className="mt-5 border-b border-zinc-200 pb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--tv-brand)]">
          Marketplace Checkout
        </p>

        <h1 className="mt-3 max-w-4xl text-4xl font-semibold tracking-[-0.05em] text-zinc-950 sm:text-5xl">
          Create the order before any funds move.
        </h1>

        <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-600">
          TrustVault records the buyer, products,
          seller, delivery details and order totals
          before requesting wallet approval.
        </p>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_23rem] xl:grid-cols-[minmax(0,1fr)_26rem]">
        <div className="space-y-6">
          <FormSection
            icon={UserRound}
            title="Buyer details"
            description="Used for order communication and receipt delivery."
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <CheckoutInput
                name="fullName"
                label="Full name"
                value={form.fullName}
                error={getFieldError("fullName")}
                onChange={updateField}
                onBlur={() =>
                  markTouched("fullName")
                }
                required
              />

              <CheckoutInput
                name="email"
                label="Email"
                type="email"
                value={form.email}
                error={getFieldError("email")}
                onChange={updateField}
                onBlur={() =>
                  markTouched("email")
                }
                required
              />

              <CheckoutInput
                name="phone"
                label="Phone"
                type="tel"
                value={form.phone}
                error={getFieldError("phone")}
                onChange={updateField}
                onBlur={() =>
                  markTouched("phone")
                }
              />
            </div>
          </FormSection>

          <FormSection
            icon={MapPin}
            title="Delivery address"
            description="Shipping and delivery details are recorded with the order."
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <CheckoutInput
                  name="addressLine1"
                  label="Address line 1"
                  value={form.addressLine1}
                  error={getFieldError(
                    "addressLine1",
                  )}
                  onChange={updateField}
                  onBlur={() =>
                    markTouched(
                      "addressLine1",
                    )
                  }
                  required
                />
              </div>

              <div className="sm:col-span-2">
                <CheckoutInput
                  name="addressLine2"
                  label="Address line 2"
                  value={form.addressLine2}
                  error={getFieldError(
                    "addressLine2",
                  )}
                  onChange={updateField}
                  onBlur={() =>
                    markTouched(
                      "addressLine2",
                    )
                  }
                />
              </div>

              <CheckoutInput
                name="city"
                label="City"
                value={form.city}
                error={getFieldError("city")}
                onChange={updateField}
                onBlur={() =>
                  markTouched("city")
                }
                required
              />

              <CheckoutInput
                name="state"
                label="State"
                value={form.state}
                error={getFieldError("state")}
                onChange={updateField}
                onBlur={() =>
                  markTouched("state")
                }
                required
              />

              <CheckoutInput
                name="postalCode"
                label="Postal code"
                value={form.postalCode}
                error={getFieldError(
                  "postalCode",
                )}
                onChange={updateField}
                onBlur={() =>
                  markTouched("postalCode")
                }
                required
              />

              <CheckoutInput
                name="country"
                label="Country"
                value={form.country}
                error={getFieldError("country")}
                onChange={updateField}
                onBlur={() =>
                  markTouched("country")
                }
                required
              />
            </div>
          </FormSection>

          <FormSection
            icon={ShieldCheck}
            title="Order lifecycle"
            description="The saved order becomes the source of truth for payment, escrow, delivery and receipts."
            tone="success"
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <CheckoutStage
                icon={ReceiptText}
                number="1"
                title="Order created"
                description="Products and delivery details are locked into the order."
              />

              <CheckoutStage
                icon={WalletCards}
                number="2"
                title="Wallet review"
                description="The buyer reviews the USDC request and active network."
              />

              <CheckoutStage
                icon={LockKeyhole}
                number="3"
                title="Escrow eligibility"
                description="The current order model can mark funds as escrow-eligible; onchain escrow is not active until a verified escrow contract is connected."
              />

              <CheckoutStage
                icon={Truck}
                number="4"
                title="Receipt generated"
                description="The completed transaction joins the TrustVault Receipt Center."
              />
            </div>
          </FormSection>
        </div>

        <aside className="h-fit space-y-5 lg:sticky lg:top-28">
          <section className="rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold tracking-[-0.03em] text-zinc-950">
              Order review
            </h2>

            <div className="mt-5 max-h-[24rem] space-y-4 overflow-y-auto pr-1">
              {cart.items.map((item) => (
                <CheckoutItem
                  key={item.id}
                  item={item}
                />
              ))}
            </div>

            <div className="mt-6 space-y-4 border-t border-zinc-200 pt-5 text-sm">
              <SummaryRow
                label="Subtotal"
                value={`${cart.totals.subtotal.amount} USDC`}
              />

              <SummaryRow
                label="Escrow eligible"
                value={`${formatAmount(
                  escrowAmount,
                )} USDC`}
              />

              <SummaryRow
                label="Shipping"
                value="Confirmed before payment"
              />
            </div>

            <div className="mt-6 flex items-end justify-between gap-4 border-t border-zinc-200 pt-5">
              <div>
                <p className="text-sm font-semibold text-zinc-950">
                  Estimated total
                </p>

                <p className="mt-1 text-xs text-zinc-500">
                  Before shipping and network fees
                </p>
              </div>

              <p className="text-right text-2xl font-semibold tracking-[-0.04em] text-zinc-950">
                {cart.totals.total.amount}{" "}
                <span className="text-base">
                  USDC
                </span>
              </p>
            </div>

            <button
              type="button"
              onClick={handlePrepareOrder}
              disabled={isPreparing}
              className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[var(--tv-brand)] px-6 text-sm font-semibold text-white transition hover:bg-[var(--tv-brand-hover)] disabled:cursor-wait disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tv-brand)] focus-visible:ring-offset-4"
            >
              {isPreparing ? (
                <LoaderCircle
                  aria-hidden="true"
                  className="h-4 w-4 animate-spin"
                />
              ) : (
                <ShieldCheck
                  aria-hidden="true"
                  className="h-4 w-4"
                />
              )}

              {isPreparing
                ? "Preparing payment review…"
                : "Continue to Payment Review"}
            </button>

            <p className="mt-4 text-center text-xs leading-5 text-zinc-500">
              Creating the order does not move USDC.
              Payment begins only after the saved order
              is reviewed.
            </p>
          </section>

          {message && (
            <div
              role={
                messageTone === "error"
                  ? "alert"
                  : "status"
              }
              className={`flex items-start gap-3 rounded-2xl border p-4 ${
                messageTone === "error"
                  ? "border-rose-200 bg-rose-50"
                  : "border-emerald-200 bg-emerald-50"
              }`}
            >
              {messageTone === "error" ? (
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

              <p
                className={`text-xs leading-5 ${
                  messageTone === "error"
                    ? "text-rose-800"
                    : "text-emerald-800"
                }`}
              >
                {message}
              </p>
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}

type FormSectionProps = {
  icon: typeof UserRound;
  title: string;
  description: string;
  tone?: "default" | "success";
  children: React.ReactNode;
};

function FormSection({
  icon: Icon,
  title,
  description,
  tone = "default",
  children,
}: FormSectionProps) {
  return (
    <section className="rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="flex items-start gap-3">
        <span
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
            tone === "success"
              ? "bg-emerald-50 text-emerald-700"
              : "bg-zinc-100 text-zinc-700"
          }`}
        >
          <Icon
            aria-hidden="true"
            className="h-5 w-5"
          />
        </span>

        <div>
          <h2 className="text-xl font-semibold tracking-[-0.03em] text-zinc-950">
            {title}
          </h2>

          <p className="mt-1 text-sm leading-6 text-zinc-600">
            {description}
          </p>
        </div>
      </div>

      <div className="mt-6">
        {children}
      </div>
    </section>
  );
}

type CheckoutInputProps = {
  name: CheckoutField;
  label: string;
  value: string;
  type?: string;
  error: string | null;
  required?: boolean;
  onChange: (
    event: ChangeEvent<HTMLInputElement>,
  ) => void;
  onBlur: () => void;
};

function CheckoutInput({
  name,
  label,
  value,
  type = "text",
  error,
  required = false,
  onChange,
  onBlur,
}: CheckoutInputProps) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-zinc-950">
        {label}
        {required && (
          <span className="text-rose-600">
            {" "}
            *
          </span>
        )}
      </span>

      <input
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        aria-invalid={Boolean(error)}
        className={`mt-2 min-h-12 w-full rounded-2xl border bg-white px-4 text-sm text-zinc-950 outline-none transition ${
          error
            ? "border-rose-300 focus:ring-2 focus:ring-rose-500/10"
            : "border-zinc-300 focus:border-zinc-950 focus:ring-2 focus:ring-zinc-950/10"
        }`}
      />

      {error && (
        <span className="mt-2 block text-xs text-rose-700">
          {error}
        </span>
      )}
    </label>
  );
}

function CheckoutItem({
  item,
}: {
  item: CartItem;
}) {
  const unitPrice = Number(
    item.snapshot.unitPrice.amount,
  );

  const subtotal =
    Number.isFinite(unitPrice)
      ? unitPrice * item.quantity
      : 0;

  return (
    <div className="flex gap-3">
      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-zinc-100">
        <ProductCoverImage
          productId={item.productId}
          alt={item.snapshot.title}
        />
      </div>

      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 text-sm font-semibold text-zinc-950">
          {item.snapshot.title}
        </p>

        <p className="mt-1 text-xs text-zinc-500">
          Quantity {item.quantity}
        </p>

        <p className="mt-1 text-xs font-semibold text-zinc-950">
          {formatAmount(subtotal)} USDC
        </p>
      </div>
    </div>
  );
}

function SummaryRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
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

function CheckoutStage({
  icon: Icon,
  number,
  title,
  description,
}: {
  icon: typeof ShieldCheck;
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
      <div className="flex items-center justify-between">
        <Icon
          aria-hidden="true"
          className="h-4 w-4 text-zinc-700"
        />

        <span className="text-xs font-semibold text-zinc-400">
          Step {number}
        </span>
      </div>

      <p className="mt-4 text-sm font-semibold text-zinc-950">
        {title}
      </p>

      <p className="mt-2 text-xs leading-5 text-zinc-500">
        {description}
      </p>
    </div>
  );
}

type CheckoutStateProps = {
  icon: typeof ShoppingBag;
  title: string;
  description: string;
  isLoading?: boolean;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
};

function CheckoutState({
  icon: Icon,
  title,
  description,
  isLoading = false,
  actionLabel,
  actionHref,
  onAction,
}: CheckoutStateProps) {
  return (
    <section className="section-shell py-24">
      <div className="mx-auto max-w-xl rounded-[2rem] border border-zinc-200 bg-white p-10 text-center shadow-sm">
        <Icon
          aria-hidden="true"
          className={`mx-auto h-7 w-7 ${
            isLoading
              ? "animate-spin"
              : ""
          }`}
        />

        <h1 className="mt-6 text-3xl font-semibold text-zinc-950">
          {title}
        </h1>

        <p className="mt-4 text-sm leading-7 text-zinc-600">
          {description}
        </p>

        {actionLabel &&
          (actionHref ? (
            <Link
              href={actionHref}
              className="mt-7 inline-flex min-h-11 items-center justify-center rounded-full bg-zinc-950 px-5 text-sm font-semibold text-white"
            >
              {actionLabel}
            </Link>
          ) : (
            <button
              type="button"
              onClick={onAction}
              className="mt-7 inline-flex min-h-11 items-center justify-center rounded-full bg-zinc-950 px-5 text-sm font-semibold text-white"
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









