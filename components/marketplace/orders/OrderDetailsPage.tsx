"use client";

import {
  ArrowLeft,
  CheckCircle2,
  CircleAlert,
  Clock3,
  LoaderCircle,
  Package,
  ReceiptText,
  ShieldCheck,
  Truck,
  WalletCards,
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
  MarketplaceOrder,
  OrderTimelineEvent,
} from "@/lib/marketplace/order-types";
import {
  browserOrderRepository,
  subscribeToOrderUpdates,
} from "@/lib/marketplace/repository/order-repository";

type OrderDetailsPageProps = {
  orderId: string;
};

type PageStatus =
  | "loading"
  | "ready"
  | "not-found"
  | "error";

export function OrderDetailsPage({
  orderId,
}: OrderDetailsPageProps) {
  const [status, setStatus] =
    useState<PageStatus>("loading");

  const [order, setOrder] =
    useState<MarketplaceOrder | null>(null);

  const loadOrder = useCallback(async () => {
    setStatus("loading");

    try {
      const foundOrder =
        await browserOrderRepository.findById(
          orderId,
        );

      if (!foundOrder) {
        setStatus("not-found");
        return;
      }

      setOrder(foundOrder);
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }, [orderId]);

  useEffect(() => {
    loadOrder();

    const unsubscribe =
      subscribeToOrderUpdates(
        (updatedOrder) => {
          if (updatedOrder.id === orderId) {
            setOrder(updatedOrder);
            setStatus("ready");
          }
        },
      );

    return unsubscribe;
  }, [loadOrder, orderId]);

  const estimatedTrustPoints = useMemo(() => {
    if (!order) {
      return 0;
    }

    const amount = Number(
      order.totals.total.amount,
    );

    return Number.isFinite(amount)
      ? Math.floor(amount)
      : 0;
  }, [order]);

  if (status === "loading") {
    return (
      <OrderState
        icon={LoaderCircle}
        title="Loading order"
        description="TrustVault is retrieving the saved Marketplace order."
        isLoading
      />
    );
  }

  if (
    status === "not-found" ||
    !order
  ) {
    return (
      <OrderState
        icon={Package}
        title="Order not found"
        description="This Marketplace order is not available in this browser."
      />
    );
  }

  if (status === "error") {
    return (
      <OrderState
        icon={CircleAlert}
        title="Order unavailable"
        description="TrustVault could not load this order."
        actionLabel="Try again"
        onAction={loadOrder}
      />
    );
  }

  return (
    <section className="section-shell py-10 sm:py-14 lg:py-20">
      <Link
        href="/marketplace"
        className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-zinc-600 hover:text-zinc-950"
      >
        <ArrowLeft
          aria-hidden="true"
          className="h-4 w-4"
        />
        Back to Marketplace
      </Link>

      <div className="mt-5 flex flex-col gap-5 border-b border-zinc-200 pb-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--tv-brand)]">
            Marketplace Order
          </p>

          <h1 className="mt-3 text-4xl font-semibold tracking-[-0.05em] text-zinc-950 sm:text-5xl">
            {order.orderNumber}
          </h1>

          <p className="mt-4 text-sm text-zinc-600">
            Created{" "}
            {new Intl.DateTimeFormat("en", {
              dateStyle: "medium",
              timeStyle: "short",
            }).format(
              new Date(order.createdAt),
            )}
          </p>
        </div>

        <StatusBadge status={order.status} />
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_23rem]">
        <div className="space-y-6">
          <section className="rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-zinc-950">
              Products
            </h2>

            <div className="mt-5 divide-y divide-zinc-200">
              {order.items.map((item) => (
                <div
                  key={item.id}
                  className="flex gap-4 py-5 first:pt-0 last:pb-0"
                >
                  <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-zinc-100">
                    <ProductCoverImage
                      productId={item.productId}
                      alt={item.snapshot.title}
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-zinc-950">
                      {item.snapshot.title}
                    </p>

                    <p className="mt-1 text-xs text-zinc-500">
                      Quantity {item.quantity}
                    </p>

                    <p className="mt-2 text-sm font-semibold text-zinc-950">
                      {item.subtotal.amount} USDC
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-zinc-950">
              Order timeline
            </h2>

            <div className="mt-6 space-y-5">
              {order.timeline.map((event) => (
                <TimelineEvent
                  key={event.id}
                  event={event}
                />
              ))}
            </div>
          </section>
        </div>

        <aside className="h-fit space-y-5 lg:sticky lg:top-28">
          <InfoCard
            icon={WalletCards}
            title="Payment"
            value={formatStatus(
              order.payment.status,
            )}
            description={`${order.payment.amount.amount} USDC on ${order.payment.network}`}
          />

          <InfoCard
            icon={ShieldCheck}
            title="Escrow"
            value={formatStatus(
              order.escrow.status,
            )}
            description={
              order.escrow.required
                ? "This order is marked escrow-eligible; onchain escrow is not active."
                : "Escrow is not required."
            }
          />

          <InfoCard
            icon={Truck}
            title="Fulfillment"
            value={formatStatus(
              order.fulfillment.status,
            )}
            description={
              order.fulfillment
                .estimatedDeliveryAt ??
              "Delivery timing will be confirmed."
            }
          />

          <section className="rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-zinc-950">
              Order total
            </h2>

            <p className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-zinc-950">
              {order.totals.total.amount}{" "}
              <span className="text-base">
                USDC
              </span>
            </p>

            <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-sm font-semibold text-emerald-950">
                Estimated TrustPoints
              </p>

              <p className="mt-2 text-2xl font-semibold text-emerald-900">
                {estimatedTrustPoints}
              </p>

              <p className="mt-1 text-xs leading-5 text-emerald-800">
                Points are granted only after the
                order is completed.
              </p>
            </div>

            <button
              type="button"
              disabled
              className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[var(--tv-brand)] px-5 text-sm font-semibold text-white opacity-60"
            >
              <WalletCards
                aria-hidden="true"
                className="h-4 w-4"
              />
              Open Payment Review
            </button>
          </section>

          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-6 text-amber-800">
            The order is saved, but no USDC has moved.
            Continue to Payment Review for fee estimation, wallet approval and
            supported Arc Testnet settlement.
          </div>
        </aside>
      </div>
    </section>
  );
}

function TimelineEvent({
  event,
}: {
  event: OrderTimelineEvent;
}) {
  return (
    <div className="flex gap-4">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
        <CheckCircle2
          aria-hidden="true"
          className="h-5 w-5"
        />
      </span>

      <div>
        <p className="text-sm font-semibold text-zinc-950">
          {event.title}
        </p>

        {event.description && (
          <p className="mt-1 text-xs leading-5 text-zinc-500">
            {event.description}
          </p>
        )}

        <p className="mt-2 text-xs text-zinc-400">
          {new Intl.DateTimeFormat("en", {
            dateStyle: "medium",
            timeStyle: "short",
          }).format(
            new Date(event.occurredAt),
          )}
        </p>
      </div>
    </div>
  );
}

function InfoCard({
  icon: Icon,
  title,
  value,
  description,
}: {
  icon: typeof ReceiptText;
  title: string;
  value: string;
  description: string;
}) {
  return (
    <section className="rounded-[2rem] border border-zinc-200 bg-white p-5 shadow-sm">
      <Icon
        aria-hidden="true"
        className="h-5 w-5 text-zinc-600"
      />

      <p className="mt-4 text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
        {title}
      </p>

      <p className="mt-2 text-lg font-semibold text-zinc-950">
        {value}
      </p>

      <p className="mt-2 text-xs leading-5 text-zinc-500">
        {description}
      </p>
    </section>
  );
}

function StatusBadge({
  status,
}: {
  status: MarketplaceOrder["status"];
}) {
  return (
    <span className="inline-flex w-fit items-center gap-2 rounded-full bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-800">
      <Clock3
        aria-hidden="true"
        className="h-4 w-4"
      />
      {formatStatus(status)}
    </span>
  );
}

type OrderStateProps = {
  icon: typeof Package;
  title: string;
  description: string;
  isLoading?: boolean;
  actionLabel?: string;
  onAction?: () => void;
};

function OrderState({
  icon: Icon,
  title,
  description,
  isLoading = false,
  actionLabel,
  onAction,
}: OrderStateProps) {
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

        {actionLabel && (
          <button
            type="button"
            onClick={onAction}
            className="mt-7 rounded-full bg-zinc-950 px-5 py-3 text-sm font-semibold text-white"
          >
            {actionLabel}
          </button>
        )}
      </div>
    </section>
  );
}

function formatStatus(value: string) {
  return value
    .split("-")
    .map(
      (word) =>
        word.charAt(0).toUpperCase() +
        word.slice(1),
    )
    .join(" ");
}




