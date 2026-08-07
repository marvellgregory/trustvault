"use client";

import {
  CheckCircle2,
  CircleAlert,
  Clock3,
  Copy,
  ExternalLink,
  LoaderCircle,
  LockKeyhole,
  RefreshCw,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  useMemo,
  useState,
} from "react";
import { arcTestnet } from "viem/chains";

import {
  ReviewCard,
} from "@/components/marketplace/payment-review/PaymentReviewPrimitives";
import type {
  AppKitSendEstimate,
} from "@/lib/app-kit/send-estimate";
import {
  sendMarketplacePayment,
} from "@/lib/app-kit/send-marketplace-payment";
import type {
  MarketplaceOrder,
} from "@/lib/marketplace/order-types";
import {
  completeMarketplacePayment,
} from "@/lib/marketplace/payments/complete-marketplace-payment";
import {
  browserOrderRepository,
} from "@/lib/marketplace/repository/order-repository";

type MarketplacePaymentApprovalCardProps = {
  order: MarketplaceOrder;

  connectedAddress?: `0x${string}`;
  chainId?: number;

  confirmed: boolean;

  onConfirmedChange: (
    confirmed: boolean,
  ) => void;

  paymentEstimate:
    AppKitSendEstimate | null;

  readyForLiveApproval:
    boolean;

  onOrderChange: (
    order: MarketplaceOrder,
  ) => void;
};

type SubmissionState =
  | "idle"
  | "awaiting-signature"
  | "submitting"
  | "confirming"
  | "confirmed"
  | "confirmation-pending"
  | "error";

type PaymentErrorDetails = {
  code: string;
  message: string;
};

function getPaymentErrorDetails(
  error: unknown,
): PaymentErrorDetails {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === 4001
  ) {
    return {
      code:
        "USER_REJECTED",

      message:
        "The payment request was rejected in MetaMask. No USDC was sent.",
    };
  }

  const message =
    error instanceof Error
      ? error.message
      : "TrustVault could not complete this payment.";

  const rejected =
    /reject|denied|declined|cancelled/i.test(
      message,
    );

  return {
    code:
      rejected
        ? "USER_REJECTED"
        : "PAYMENT_FAILED",

    message:
      rejected
        ? "The payment request was rejected in MetaMask. No USDC was sent."
        : message,
  };
}

function isTransactionHash(
  value?: string,
): value is `0x${string}` {
  return Boolean(
    value &&
    /^0x[a-fA-F0-9]{64}$/.test(value),
  );
}

function shortenTransactionHash(hash: string) {
  return `${hash.slice(0, 10)}…${hash.slice(-8)}`;
}

type ProgressState = "complete" | "active" | "pending";

function PaymentProgressRow({
  label,
  state,
}: {
  label: string;
  state: ProgressState;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-zinc-200 bg-white px-3 py-2.5">
      <span className="text-xs font-medium text-zinc-700">
        {label}
      </span>

      {state === "complete" ? (
        <CheckCircle2 className="h-4 w-4 text-emerald-700" />
      ) : state === "active" ? (
        <LoaderCircle className="h-4 w-4 animate-spin text-blue-700" />
      ) : (
        <Clock3 className="h-4 w-4 text-zinc-400" />
      )}
    </div>
  );
}

export function MarketplacePaymentApprovalCard({
  order,
  connectedAddress,
  chainId,
  confirmed,
  onConfirmedChange,
  paymentEstimate,
  readyForLiveApproval,
  onOrderChange,
}: MarketplacePaymentApprovalCardProps) {
  const router =
    useRouter();

  const transactionHash =
    order.payment.transactionHash;

  const transactionSubmitted =
    Boolean(transactionHash) ||
    order.payment.status ===
      "submitted" ||
    order.payment.status ===
      "confirmed";

  const paymentConfirmed =
    order.payment.status ===
      "confirmed" ||
    order.status ===
      "paid";

  const initialState:
    SubmissionState =
      paymentConfirmed
        ? "confirmed"
        : transactionSubmitted
          ? "confirmation-pending"
          : "idle";

  const [
    submissionState,
    setSubmissionState,
  ] = useState<SubmissionState>(
    initialState,
  );

  const [
    error,
    setError,
  ] = useState<string | null>(
    null,
  );

  const [
    copiedHash,
    setCopiedHash,
  ] = useState(false);

  const busy =
    submissionState ===
      "awaiting-signature" ||
    submissionState ===
      "submitting" ||
    submissionState ===
      "confirming";

  const canSubmitNewPayment =
    Boolean(
      readyForLiveApproval &&
      connectedAddress &&
      chainId &&
      order.payment.recipientWallet &&
      paymentEstimate &&
      !transactionSubmitted &&
      !busy,
    );

  const canResumeConfirmation =
    Boolean(
      isTransactionHash(
        transactionHash,
      ) &&
      !paymentConfirmed &&
      !busy,
    );

  const walletReady =
    Boolean(connectedAddress);

  const networkReady =
    chainId === arcTestnet.id;

  const destinationReady =
    Boolean(order.payment.recipientWallet);

  const estimateReady =
    Boolean(paymentEstimate) ||
    transactionSubmitted;

  const approvalActive =
    submissionState === "awaiting-signature";

  const broadcastActive =
    submissionState === "submitting";

  const confirmationActive =
    submissionState === "confirming" ||
    submissionState === "confirmation-pending";

  function progressState(
    complete: boolean,
    active = false,
  ): ProgressState {
    if (complete) {
      return "complete";
    }

    return active ? "active" : "pending";
  }

  async function copyTransactionHash() {
    if (!transactionHash) {
      return;
    }

    await navigator.clipboard.writeText(
      transactionHash,
    );

    setCopiedHash(true);

    window.setTimeout(
      () => setCopiedHash(false),
      1_500,
    );
  }

  const buttonLabel =
    useMemo(() => {
      switch (
        submissionState
      ) {
        case "awaiting-signature":
          return "Confirm in MetaMask";

        case "submitting":
          return "Submitting payment…";

        case "confirming":
          return "Confirming on Arc…";

        case "confirmed":
          return "Payment confirmed";

        case "confirmation-pending":
          return "Complete confirmation";

        case "error":
          return transactionSubmitted
            ? "Retry confirmation"
            : "Try payment again";

        default:
          return "Review & Approve Payment";
      }
    }, [
      submissionState,
      transactionSubmitted,
    ]);

  async function confirmAndCreateReceipt(
    activeOrder:
      MarketplaceOrder,

    hash:
      `0x${string}`,
  ) {
    setSubmissionState(
      "confirming",
    );

    setError(null);

    try {
      const completion =
        await completeMarketplacePayment({
          order:
            activeOrder,

          transactionHash:
            hash,
        });

      onOrderChange(
        completion.order,
      );

      setSubmissionState(
        "confirmed",
      );

      onConfirmedChange(
        false,
      );

      router.push(
        completion.receiptPath,
      );
    } catch (caughtError) {
      const details =
        getPaymentErrorDetails(
          caughtError,
        );

      setError(
        `The USDC transaction was submitted, but TrustVault could not finish confirmation yet. ${details.message}`,
      );

      setSubmissionState(
        "confirmation-pending",
      );
    }
  }

  async function resumeConfirmation() {
    if (
      !isTransactionHash(
        transactionHash,
      ) ||
      busy
    ) {
      return;
    }

    await confirmAndCreateReceipt(
      order,
      transactionHash,
    );
  }

  async function submitPayment() {
    if (
      !canSubmitNewPayment ||
      !connectedAddress ||
      !chainId ||
      !order.payment.recipientWallet ||
      !paymentEstimate
    ) {
      return;
    }

    setError(null);

    setSubmissionState(
      "awaiting-signature",
    );

    let submittedHash:
      `0x${string}` | null =
        null;

    let latestOrder =
      order;

    try {
      latestOrder =
        await browserOrderRepository.updatePayment({
          orderId:
            order.id,

          payment: {
            status:
              "awaiting-signature",

            estimatedFee: {
              amount:
                paymentEstimate.estimatedFeeUsdc,

              currency:
                "USDC",
            },

            errorCode:
              undefined,

            errorMessage:
              undefined,
          },

          timelineEvent: {
            type:
              "payment-started",

            title:
              "Payment approval requested",

            description:
              `The buyer started a ${order.payment.amount.amount} USDC Marketplace payment on Arc Testnet.`,

            actor: {
              type:
                "buyer",

              id:
                connectedAddress,

              displayName:
                order.buyer.displayName ||
                connectedAddress,
            },
          },
        });

      onOrderChange(
        latestOrder,
      );

      setSubmissionState(
        "submitting",
      );

      const result =
        await sendMarketplacePayment({
          connectedAddress,
          chainId,

          recipientAddress:
            order.payment.recipientWallet,

          amount:
            order.payment.amount.amount,

          orderId:
            order.id,

          orderNumber:
            order.orderNumber,
        });

      if (
        !isTransactionHash(
          result.transactionHash,
        )
      ) {
        throw new Error(
          "Circle App Kit returned an invalid transaction hash.",
        );
      }

      submittedHash =
        result.transactionHash;

      const submittedOrder =
        await browserOrderRepository.updatePayment({
          orderId:
            order.id,

          payment: {
            status:
              "submitted",

            transactionHash:
              result.transactionHash,

            explorerUrl:
              result.explorerUrl,

            submittedAt:
              result.submittedAt,

            errorCode:
              undefined,

            errorMessage:
              undefined,
          },

          timelineEvent: {
            type:
              "payment-submitted",

            title:
              "Payment submitted",

            description:
              `${result.amount} USDC was submitted on Arc Testnet. Transaction: ${result.transactionHash}`,

            actor: {
              type:
                "buyer",

              id:
                connectedAddress,

              displayName:
                order.buyer.displayName ||
                connectedAddress,
            },
          },
        });

      const processingOrder =
        await browserOrderRepository.updateStatus({
          orderId:
            order.id,

          status:
            "payment-processing",

          note:
            "The USDC transaction was submitted and is awaiting onchain confirmation.",

          actor: {
            type:
              "system",

            displayName:
              "TrustVault",
          },
        });

      latestOrder = {
        ...processingOrder,

        payment:
          submittedOrder.payment,

        timeline:
          submittedOrder.timeline,
      };

      onOrderChange(
        latestOrder,
      );

      await confirmAndCreateReceipt(
        latestOrder,
        result.transactionHash,
      );
    } catch (caughtError) {
      const details =
        getPaymentErrorDetails(
          caughtError,
        );

      if (submittedHash) {
        setError(
          `The transaction was submitted, but confirmation is still pending. ${details.message}`,
        );

        setSubmissionState(
          "confirmation-pending",
        );

        return;
      }

      setError(
        details.message,
      );

      setSubmissionState(
        "error",
      );

      try {
        const failedOrder =
          await browserOrderRepository.updatePayment({
            orderId:
              order.id,

            payment: {
              status:
                "failed",

              errorCode:
                details.code,

              errorMessage:
                details.message,
            },
          });

        onOrderChange(
          failedOrder,
        );
      } catch {
        // Preserve the original wallet or
        // transaction error if persistence fails.
      }
    }
  }

  return (
    <ReviewCard
      icon={LockKeyhole}
      eyebrow="Final approval"
      title={
        paymentConfirmed
          ? "Payment confirmed"
          : transactionSubmitted
            ? "Transaction submitted"
            : "Your confirmation is required"
      }
    >
      <div className="mt-5 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
              Live payment progress
            </p>
            <p className="mt-1 text-xs leading-5 text-zinc-500">
              TrustVault updates each stage as the wallet and Arc return verifiable state.
            </p>
          </div>

          <span className="inline-flex min-h-8 items-center rounded-full border border-zinc-200 bg-white px-3 text-xs font-semibold text-zinc-700">
            Arc Testnet
          </span>
        </div>

        <div className="mt-4 grid gap-2">
          <PaymentProgressRow
            label="Wallet connected"
            state={progressState(walletReady)}
          />
          <PaymentProgressRow
            label="Arc network verified"
            state={progressState(networkReady)}
          />
          <PaymentProgressRow
            label="Settlement wallet checked"
            state={progressState(destinationReady)}
          />
          <PaymentProgressRow
            label="Network fee estimated"
            state={progressState(estimateReady)}
          />
          <PaymentProgressRow
            label="Wallet approval"
            state={progressState(
              transactionSubmitted,
              approvalActive,
            )}
          />
          <PaymentProgressRow
            label="Transaction broadcast"
            state={progressState(
              transactionSubmitted,
              broadcastActive,
            )}
          />
          <PaymentProgressRow
            label="Arc confirmation, receipt & rewards"
            state={progressState(
              paymentConfirmed,
              confirmationActive,
            )}
          />
        </div>
      </div>

      {!transactionSubmitted && (
        <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
          <input
            type="checkbox"
            checked={
              confirmed
            }
            disabled={
              busy
            }
            onChange={(
              event,
            ) =>
              onConfirmedChange(
                event.target.checked,
              )
            }
            className="mt-1 h-4 w-4 rounded border-zinc-300 accent-zinc-950"
          />

          <span className="text-sm leading-6 text-zinc-700">
            I have reviewed the order total, buyer wallet,
            seller settlement wallet, Arc network and estimated fee.
          </span>
        </label>
      )}

      {!transactionSubmitted && (
        <button
          type="button"
          disabled={
            !canSubmitNewPayment
          }
          onClick={() =>
            void submitPayment()
          }
          className="mt-5 inline-flex min-h-13 w-full items-center justify-center gap-2 rounded-full bg-zinc-950 px-6 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy ? (
            <LoaderCircle className="h-4 w-4 animate-spin" />
          ) : (
            <LockKeyhole className="h-4 w-4" />
          )}

          {buttonLabel}
        </button>
      )}

      {transactionSubmitted &&
        !paymentConfirmed && (
          <button
            type="button"
            disabled={
              !canResumeConfirmation
            }
            onClick={() =>
              void resumeConfirmation()
            }
            className="mt-5 inline-flex min-h-13 w-full items-center justify-center gap-2 rounded-full bg-zinc-950 px-6 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {submissionState ===
            "confirming" ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}

            {buttonLabel}
          </button>
        )}

      {paymentConfirmed && (
        <div className="mt-5 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />

          <div>
            <p className="text-xs font-semibold text-emerald-950">
              Payment confirmed on Arc
            </p>

            <p className="mt-1 text-xs leading-6 text-emerald-800">
              The Marketplace order is paid and its TrustVault
              receipt is ready.
            </p>
          </div>
        </div>
      )}

      {busy && (
        <div className="mt-4 flex items-start gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-4">
          <LoaderCircle className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-blue-700" />

          <p className="text-xs leading-6 text-blue-900">
            {submissionState ===
            "confirming"
              ? "The transaction was submitted. TrustVault is waiting for Arc confirmation and preparing your receipt."
              : "Review the transaction in MetaMask. TrustVault saves the transaction proof only after the wallet returns a transaction hash."}
          </p>
        </div>
      )}

      {error && (
        <div className="mt-4 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4">
          <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-rose-700" />

          <div>
            <p className="text-xs font-semibold text-rose-950">
              Payment needs attention
            </p>

            <p className="mt-1 text-xs leading-6 text-rose-900">
              {error}
            </p>
          </div>
        </div>
      )}

      {transactionSubmitted &&
        transactionHash && (
          <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />

              <div className="min-w-0">
                <p className="text-xs font-semibold text-emerald-950">
                  Transaction proof saved
                </p>

                <p
                  className="mt-2 font-mono text-xs leading-6 text-emerald-800"
                  title={transactionHash}
                >
                  {shortenTransactionHash(transactionHash)}
                </p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() =>
                  void copyTransactionHash()
                }
                className="inline-flex min-h-10 items-center gap-2 rounded-full border border-emerald-300 bg-white px-4 text-xs font-semibold text-emerald-950 transition hover:bg-emerald-100"
              >
                {copiedHash ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
                {copiedHash ? "Copied" : "Copy hash"}
              </button>

              {order.payment.explorerUrl && (
                <a
                  href={
                    order.payment.explorerUrl
                  }
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex min-h-10 items-center gap-2 rounded-full border border-emerald-300 bg-white px-4 text-xs font-semibold text-emerald-950 transition hover:bg-emerald-100"
                >
                  <ExternalLink className="h-4 w-4" />
                  Open on ArcScan
                </a>
              )}
            </div>
          </div>
        )}

      {!paymentEstimate &&
        !transactionSubmitted && (
          <p className="mt-4 text-xs leading-6 text-zinc-500">
            A successful Circle App Kit estimate is required before
            payment approval can be enabled.
          </p>
        )}

      {paymentEstimate &&
        !transactionSubmitted && (
          <p className="mt-4 text-xs leading-6 text-zinc-500">
            MetaMask opens only after you click the approval button.
            Rejecting the request does not move USDC.
          </p>
        )}
    </ReviewCard>
  );
}
