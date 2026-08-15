"use client";

import {
  CheckCircle2,
  CircleAlert,
  Copy,
  ExternalLink,
  LoaderCircle,
  RefreshCw,
  ShieldCheck,
  WalletCards,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";
import { arcTestnet } from "viem/chains";
import type {
  AppKitSendEstimate,
} from "@/lib/app-kit/send-estimate";
import {
  estimateArcUsdcSend,
} from "@/lib/app-kit/send-estimate";
import {
  ReviewCard,
  SummaryRow,
} from "@/components/marketplace/payment-review/PaymentReviewPrimitives";
import { useCircleProviderBinding } from "@/components/wallet/useCircleProviderBinding";

type PaymentEstimateCardProps = {
  connectedAddress?: `0x${string}`;
  chainId?: number;
  recipientAddress?: string;
  amount: string;
  recipientName?: string;
  enabled: boolean;
  onEstimateChange?: (
    estimate: AppKitSendEstimate | null,
  ) => void;
};

type EstimateStatus =
  | "idle"
  | "loading"
  | "success"
  | "error";

function shortenAddress(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

function StatusPill({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <span className="inline-flex min-h-8 items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 text-xs font-semibold text-zinc-700">
      {children}
    </span>
  );
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

export function PaymentEstimateCard({
  connectedAddress,
  chainId,
  recipientAddress,
  amount,
  recipientName = "Marketplace seller",
  enabled,
  onEstimateChange,
}: PaymentEstimateCardProps) {
  const circleBinding = useCircleProviderBinding();
  const [status, setStatus] =
    useState<EstimateStatus>("idle");

  const [estimate, setEstimate] =
    useState<AppKitSendEstimate | null>(null);

  const [error, setError] =
    useState<string | null>(null);

  const [copied, setCopied] =
    useState(false);

  const estimatedTotal = useMemo(() => {
    if (!estimate) {
      return null;
    }

    const paymentAmount = Number(amount);
    const feeAmount = Number(
      estimate.estimatedFeeUsdc,
    );

    if (
      !Number.isFinite(paymentAmount) ||
      !Number.isFinite(feeAmount)
    ) {
      return null;
    }

    return (
      paymentAmount + feeAmount
    ).toFixed(6);
  }, [amount, estimate]);

  const recipientExplorerUrl =
    recipientAddress
      ? `${arcTestnet.blockExplorers.default.url}/address/${recipientAddress}`
      : null;

  const requestEstimate =
    useCallback(async () => {
      if (
        !enabled ||
        !connectedAddress ||
        !chainId ||
        !recipientAddress
      ) {
        setEstimate(null);
        setStatus("idle");
        setError(null);
        onEstimateChange?.(null);
        return;
      }

      setStatus("loading");
      setError(null);
      setEstimate(null);
      onEstimateChange?.(null);

      try {
        const result =
          await estimateArcUsdcSend({
            circleBinding,
            connectedAddress,
            chainId,
            recipientAddress,
            amount,
          });

        setEstimate(result);
        setStatus("success");
        onEstimateChange?.(result);
      } catch (caughtError) {
        const message =
          caughtError instanceof Error
            ? caughtError.message
            : "TrustVault could not estimate this payment.";

        setError(message);
        setStatus("error");
        onEstimateChange?.(null);
      }
    }, [
      amount,
      circleBinding,
      chainId,
      connectedAddress,
      enabled,
      onEstimateChange,
      recipientAddress,
    ]);

  useEffect(() => {
    const requestTimer = window.setTimeout(() => void requestEstimate(), 0);
    return () => window.clearTimeout(requestTimer);
  }, [
    enabled,
    requestEstimate,
    onEstimateChange,
  ]);

  async function copyRecipientWallet() {
    if (!recipientAddress) {
      return;
    }

    await navigator.clipboard.writeText(
      recipientAddress,
    );

    setCopied(true);

    window.setTimeout(
      () => setCopied(false),
      1_500,
    );
  }

  return (
    <ReviewCard
      icon={WalletCards}
      eyebrow="Transaction summary"
      title={
        status === "success"
          ? "Payment details ready"
          : "Review payment details"
      }
    >
      <div className="mt-5 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
              Settlement destination
            </p>

            <p className="mt-2 text-sm font-semibold text-zinc-950">
              {recipientName}
            </p>
          </div>

          {recipientAddress && enabled && (
            <span className="inline-flex min-h-8 items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 text-xs font-semibold text-emerald-800">
              <ShieldCheck className="h-3.5 w-3.5" />
              Wallet checks passed
            </span>
          )}
        </div>

        {recipientAddress ? (
          <>
            <p className="mt-3 font-mono text-sm text-zinc-600">
              {shortenAddress(recipientAddress)}
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={copyRecipientWallet}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-zinc-300 bg-white px-4 text-xs font-semibold text-zinc-800 transition hover:border-zinc-400"
              >
                {copied ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}

                {copied ? "Copied" : "Copy wallet"}
              </button>

              {recipientExplorerUrl && (
                <a
                  href={recipientExplorerUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-zinc-300 bg-white px-4 text-xs font-semibold text-zinc-800 transition hover:border-zinc-400"
                >
                  <ExternalLink className="h-4 w-4" />
                  Open on ArcScan
                </a>
              )}
            </div>
          </>
        ) : (
          <p className="mt-3 text-sm text-amber-800">
            A seller settlement wallet is required.
          </p>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <StatusPill>
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          Arc Testnet
        </StatusPill>
        <StatusPill>USDC settlement asset</StatusPill>
        <StatusPill>Onchain confirmation</StatusPill>
      </div>

      <dl className="mt-5 space-y-3 text-sm">
        <SummaryRow
          label="Network"
          value="Arc Testnet"
        />

        <SummaryRow
          label="Asset"
          value="USDC"
        />

        <SummaryRow
          label="Payment amount"
          value={`${formatAmount(
            amount,
          )} USDC`}
        />

        <SummaryRow
          label="Estimated network fee"
          value={
            status === "success" &&
            estimate
              ? `${formatAmount(
                  estimate.estimatedFeeUsdc,
                )} USDC`
              : status === "loading"
                ? "Estimating…"
                : "Not estimated"
          }
        />

        <div className="flex items-center justify-between gap-4 border-t border-zinc-200 pt-4">
          <dt className="font-semibold text-zinc-950">
            Estimated total
          </dt>

          <dd className="text-lg font-semibold text-zinc-950">
            {estimatedTotal
              ? `${formatAmount(
                  estimatedTotal,
                )} USDC`
              : `${formatAmount(
                  amount,
                )} USDC`}
          </dd>
        </div>
      </dl>

      {!enabled && (
        <div className="mt-5 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />

          <p className="text-xs leading-6 text-amber-900">
            Connect the buyer wallet, verify Arc Testnet and confirm
            the seller settlement wallet before requesting an estimate.
          </p>
        </div>
      )}

      {status === "loading" && (
        <div className="mt-5 flex items-center gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-4">
          <LoaderCircle className="h-4 w-4 animate-spin text-blue-700" />

          <p className="text-xs font-medium text-blue-900">
            Circle App Kit is estimating the Arc Testnet payment fee.
          </p>
        </div>
      )}

      {status === "success" &&
        estimate && (
          <div className="mt-5 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />

            <div>
              <p className="text-xs font-semibold text-emerald-950">
                Estimate completed
              </p>

              <p className="mt-1 text-xs leading-6 text-emerald-800">
                Prepared using {estimate.walletName}. No transaction
                has been sent.
              </p>
            </div>
          </div>
        )}

      {status === "error" &&
        error && (
          <div className="mt-5 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4">
            <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-rose-700" />

            <p className="text-xs leading-6 text-rose-900">
              {error}
            </p>
          </div>
        )}

      <button
        type="button"
        disabled={
          !enabled ||
          status === "loading"
        }
        onClick={() =>
          void requestEstimate()
        }
        className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-zinc-300 bg-white px-5 text-sm font-semibold text-zinc-950 transition hover:border-zinc-400 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {status === "loading" ? (
          <LoaderCircle className="h-4 w-4 animate-spin" />
        ) : (
          <RefreshCw className="h-4 w-4" />
        )}

        {status === "loading"
          ? "Estimating payment…"
          : estimate
            ? "Refresh estimate"
            : "Estimate payment"}
      </button>

      <p className="mt-4 text-xs leading-6 text-zinc-500">
        Estimation does not request approval, send USDC or move funds.
      </p>
    </ReviewCard>
  );
}
