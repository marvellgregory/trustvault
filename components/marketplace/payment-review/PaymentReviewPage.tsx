"use client";

import {
  ArrowLeft,
  Check,
  CheckCircle2,
  CircleAlert,
  Copy,
  LoaderCircle,
  Network,
  Package,
  ReceiptText,
  ShieldCheck,
  Sparkles,
  WalletCards,
} from "lucide-react";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { arcTestnet } from "viem/chains";
import {
  useAccount,
  useSwitchChain,
} from "wagmi";

import { ProductCoverImage } from "@/components/marketplace/ProductCoverImage";
import {
  MarketplacePaymentApprovalCard,
} from "@/components/marketplace/payment-review/MarketplacePaymentApprovalCard";
import {
  PaymentEstimateCard,
} from "@/components/marketplace/payment-review/PaymentEstimateCard";
import {
  PaymentReviewState,
  ProtectionRow,
  ReviewCard,
  SummaryRow,
} from "@/components/marketplace/payment-review/PaymentReviewPrimitives";
import type {
  AppKitSendEstimate,
} from "@/lib/app-kit/send-estimate";
import type {
  MarketplaceOrder,
} from "@/lib/marketplace/order-types";
import {
  browserOrderRepository,
} from "@/lib/marketplace/repository/order-repository";

type PaymentReviewPageProps = {
  orderId?: string;
};

type PageStatus =
  | "loading"
  | "ready"
  | "missing-order-id"
  | "not-found"
  | "error";

function shortenAddress(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

function formatAmount(value: string) {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return value;
  }

  return amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  });
}

export function PaymentReviewPage({
  orderId,
}: PaymentReviewPageProps) {
  const {
    address,
    chainId,
    isConnected,
  } = useAccount();

  const {
    switchChain,
    isPending: isSwitching,
    error: switchError,
  } = useSwitchChain();

  const [status, setStatus] =
    useState<PageStatus>("loading");

  const [order, setOrder] =
    useState<MarketplaceOrder | null>(null);

  const [confirmed, setConfirmed] =
    useState(false);

  const [copied, setCopied] =
    useState(false);

  const [
    paymentEstimate,
    setPaymentEstimate,
  ] = useState<AppKitSendEstimate | null>(
    null,
  );

  const loadOrder = useCallback(async () => {
    if (!orderId) {
      setStatus("missing-order-id");
      return;
    }

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
    const initialLoad = window.setTimeout(() => {
      loadOrder();
    }, 0);

    return () => {
      window.clearTimeout(initialLoad);
    };
  }, [loadOrder]);

  const isArc =
    chainId === arcTestnet.id;

  const escrowAmount = useMemo(() => {
    if (!order) {
      return 0;
    }

    return order.items.reduce(
      (total, item) => {
        const itemAmount =
          Number(item.subtotal.amount);

        const isEscrowEligible =
          order.escrow.required;

        return (
          total +
          (isEscrowEligible &&
          Number.isFinite(itemAmount)
            ? itemAmount
            : 0)
        );
      },
      0,
    );
  }, [order]);

  const estimatedTrustPoints =
    useMemo(() => {
      if (!order) {
        return 0;
      }

      const total = Number(
        order.totals.total.amount,
      );

      return Number.isFinite(total)
        ? Math.floor(total)
        : 0;
    }, [order]);

  const settlementWalletConfigured =
    Boolean(
      order?.payment.recipientWallet,
    );

  const readyForLiveApproval =
    Boolean(
      order &&
      isConnected &&
      address &&
      isArc &&
      settlementWalletConfigured &&
      paymentEstimate &&
      confirmed,
    );

  async function copyWallet() {
    if (!address) {
      return;
    }

    await navigator.clipboard.writeText(
      address,
    );

    setCopied(true);

    window.setTimeout(
      () => setCopied(false),
      1_500,
    );
  }

  if (status === "loading") {
    return (
      <PaymentReviewState
        icon={LoaderCircle}
        title="Loading payment review"
        description="TrustVault is retrieving the saved order and preparing its transaction summary."
        isLoading
      />
    );
  }

  if (status === "missing-order-id") {
    return (
      <PaymentReviewState
        icon={Package}
        title="No order selected"
        description="Complete Marketplace checkout first so TrustVault can prepare a payment review."
      />
    );
  }

  if (
    status === "not-found" ||
    !order
  ) {
    return (
      <PaymentReviewState
        icon={CircleAlert}
        title="Order not found"
        description="This order is not available in the current browser. Return to checkout and create a new order."
      />
    );
  }

  if (status === "error") {
    return (
      <PaymentReviewState
        icon={CircleAlert}
        title="Payment review unavailable"
        description="TrustVault could not load this order."
        actionLabel="Try again"
        onAction={loadOrder}
      />
    );
  }

  return (
    <section className="section-shell py-10 sm:py-14 lg:py-20">
      <Link
        href={`/orders/${encodeURIComponent(
          order.id,
        )}`}
        className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-zinc-600 transition hover:text-zinc-950"
      >
        <ArrowLeft
          aria-hidden="true"
          className="h-4 w-4"
        />
        Back to order
      </Link>

      <div className="mt-5 border-b border-zinc-200 pb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--tv-brand)]">
          TrustVault Payment Review
        </p>

        <h1 className="mt-3 max-w-4xl text-4xl font-semibold tracking-[-0.055em] text-zinc-950 sm:text-5xl lg:text-6xl">
          Review every detail before approving.
        </h1>

        <p className="mt-5 max-w-3xl text-base leading-8 text-zinc-600">
          Verify the order, connected wallet, Arc network,
          transaction checks and expected rewards before
          any money-moving action begins.
        </p>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(22rem,0.85fr)] lg:items-start">
        <div className="space-y-6">
          <ReviewCard
            icon={Package}
            eyebrow="Order summary"
            title={order.orderNumber}
          >
            <div className="mt-5 space-y-4">
              {order.items.map((item) => (
                <div
                  key={item.id}
                  className="flex gap-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-4"
                >
                  <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-white">
                    <ProductCoverImage
                      productId={
                        item.productId
                      }
                      alt={
                        item.snapshot.title
                      }
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-zinc-950">
                      {item.snapshot.title}
                    </p>

                    <p className="mt-1 text-xs text-zinc-500">
                      Quantity:{" "}
                      {item.quantity}
                    </p>

                    <p className="mt-3 text-sm font-semibold text-zinc-950">
                      {formatAmount(
                        item.subtotal.amount,
                      )}{" "}
                      USDC
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <dl className="mt-5 space-y-3 border-t border-zinc-200 pt-5 text-sm">
              <SummaryRow
                label="Subtotal"
                value={`${formatAmount(
                  order.totals.subtotal.amount,
                )} USDC`}
              />

              <SummaryRow
                label="Shipping"
                value={`${formatAmount(
                  order.totals.shipping.amount,
                )} USDC`}
              />

              <SummaryRow
                label="Discount"
                value={`-${formatAmount(
                  order.totals.discount.amount,
                )} USDC`}
              />

              <SummaryRow
                label="Tax"
                value={`${formatAmount(
                  order.totals.tax.amount,
                )} USDC`}
              />

              <div className="flex items-center justify-between gap-4 border-t border-zinc-200 pt-4">
                <dt className="font-semibold text-zinc-950">
                  Payment total
                </dt>

                <dd className="text-xl font-semibold text-zinc-950">
                  {formatAmount(
                    order.totals.total.amount,
                  )}{" "}
                  USDC
                </dd>
              </div>
            </dl>
          </ReviewCard>

          <ReviewCard
            icon={WalletCards}
            eyebrow="Wallet verification"
            title={
              isConnected
                ? "Wallet connected"
                : "Wallet required"
            }
          >
            {isConnected && address ? (
              <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-900">
                      <CheckCircle2 className="h-4 w-4" />
                      Connected wallet verified
                    </p>

                    <p className="mt-2 font-mono text-sm text-emerald-800">
                      {shortenAddress(
                        address,
                      )}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={copyWallet}
                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-emerald-300 bg-white px-4 text-xs font-semibold text-emerald-900 transition hover:bg-emerald-100"
                  >
                    {copied ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}

                    {copied
                      ? "Copied"
                      : "Copy address"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
                Connect your wallet from the TrustVault header before
                payment approval can be enabled.
              </div>
            )}
          </ReviewCard>

          <ReviewCard
            icon={Network}
            eyebrow="Network verification"
            title={
              isArc
                ? "Arc Testnet verified"
                : "Switch to Arc Testnet"
            }
          >
            {isArc ? (
              <div className="mt-5 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />

                <div>
                  <p className="text-sm font-semibold text-emerald-950">
                    Network ready
                  </p>

                  <p className="mt-1 text-xs leading-6 text-emerald-800">
                    The connected wallet is using Arc Testnet. USDC is
                    used for the payment and network fees.
                  </p>
                </div>
              </div>
            ) : (
              <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm font-semibold text-amber-950">
                  Arc Testnet is required
                </p>

                <p className="mt-1 text-xs leading-6 text-amber-800">
                  TrustVault will not enable payment approval on another
                  network.
                </p>

                {isConnected && (
                  <button
                    type="button"
                    disabled={isSwitching}
                    onClick={() =>
                      switchChain({
                        chainId:
                          arcTestnet.id,
                      })
                    }
                    className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-full bg-amber-900 px-4 text-xs font-semibold text-white transition hover:bg-amber-800 disabled:opacity-60"
                  >
                    {isSwitching ? (
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                    ) : (
                      <Network className="h-4 w-4" />
                    )}

                    {isSwitching
                      ? "Switching…"
                      : "Switch network"}
                  </button>
                )}

                {switchError && (
                  <p className="mt-2 text-xs text-rose-700">
                    {switchError.message}
                  </p>
                )}
              </div>
            )}
          </ReviewCard>

          <PaymentEstimateCard
            connectedAddress={address}
            chainId={chainId}
            recipientAddress={
              order.payment.recipientWallet
            }
            amount={
              order.payment.amount.amount
            }
            recipientName={
              order.seller.storeName ||
              order.seller.displayName
            }
            enabled={Boolean(
              isConnected &&
              address &&
              isArc &&
              order.payment.recipientWallet,
            )}
            onEstimateChange={
              setPaymentEstimate
            }
          />
        </div>

        <aside className="space-y-6 lg:sticky lg:top-28">
          <ReviewCard
            icon={ShieldCheck}
            eyebrow="Transaction checks"
            title="Transaction readiness"
          >
            <div className="mt-5 space-y-3">
              <ProtectionRow
                label="Wallet verification"
                complete={isConnected}
              />

              <ProtectionRow
                label="Arc network verification"
                complete={isArc}
              />

              <ProtectionRow
                label="Order snapshot saved"
                complete
              />

              <ProtectionRow
                label="Payment fee estimated"
                complete={Boolean(
                  paymentEstimate,
                )}
              />

              <ProtectionRow
                label="ArcScan verification after confirmation"
                complete={false}
              />

              <ProtectionRow
                label="Digital receipt after settlement"
                complete={false}
              />
            </div>

            <div className="mt-5 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
                Escrow-eligible amount
              </p>

              <p className="mt-2 text-2xl font-semibold text-zinc-950">
                {formatAmount(
                  escrowAmount.toString(),
                )}{" "}
                USDC
              </p>

              <p className="mt-2 text-xs leading-6 text-zinc-500">
                This amount is escrow-eligible in the current order model. Onchain escrow
                execution will be enabled only after the contract is
                connected and verified.
              </p>
            </div>
          </ReviewCard>

          <ReviewCard
            icon={Sparkles}
            eyebrow="TrustPoints preview"
            title={`+${estimatedTrustPoints} TrustPoints`}
          >
            <p className="mt-4 text-sm leading-7 text-zinc-600">
              Estimated at one point per completed USDC of eligible
              Marketplace spend. Points become available only after
              settlement. TrustPoints remain a preview and are not awarded by
              this current testnet flow.
            </p>
          </ReviewCard>

          <MarketplacePaymentApprovalCard
            order={order}
            connectedAddress={address}
            chainId={chainId}
            confirmed={confirmed}
            onConfirmedChange={
              setConfirmed
            }
            paymentEstimate={
              paymentEstimate
            }
            readyForLiveApproval={
              readyForLiveApproval
            }
            onOrderChange={
              setOrder
            }
          />

          <Link
            href={`/orders/${encodeURIComponent(
              order.id,
            )}`}
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full border border-zinc-300 bg-white px-6 text-sm font-semibold text-zinc-950 transition hover:border-zinc-400"
          >
            <ReceiptText className="h-4 w-4" />
            View saved order
          </Link>
        </aside>
      </div>
    </section>
  );
}








