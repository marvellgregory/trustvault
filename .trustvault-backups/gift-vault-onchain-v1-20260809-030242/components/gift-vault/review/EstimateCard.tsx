"use client";

import {
  CheckCircle2,
  CircleAlert,
  LoaderCircle,
  ReceiptText,
} from "lucide-react";
import { useEffect, useState } from "react";
import { arcTestnet } from "viem/chains";
import { useAccount } from "wagmi";
import type { GiftData } from "@/components/gift-vault/types";
import {
  estimateArcUsdcSend,
  type AppKitSendEstimate,
} from "@/lib/app-kit/send-estimate";

type EstimateCardProps = {
  data: GiftData;
};

export function EstimateCard({ data }: EstimateCardProps) {
  const { address, chainId, isConnected } = useAccount();
  const [estimate, setEstimate] = useState<AppKitSendEstimate | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isEstimating, setIsEstimating] = useState(false);

  const isArc = chainId === arcTestnet.id;
  const canEstimate = Boolean(
    isConnected &&
      address &&
      isArc &&
      data.walletAddress &&
      data.amount,
  );

  useEffect(() => {
    setEstimate(null);
    setError(null);
  }, [address, chainId, data.amount, data.walletAddress]);

  async function handleEstimate() {
    if (!address || !chainId) {
      setError("Connect your wallet before estimating the network fee.");
      return;
    }

    setIsEstimating(true);
    setError(null);
    setEstimate(null);

    try {
      const result = await estimateArcUsdcSend({
        connectedAddress: address,
        chainId,
        recipientAddress: data.walletAddress,
        amount: data.amount,
      });

      setEstimate(result);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "The network fee could not be estimated.",
      );
    } finally {
      setIsEstimating(false);
    }
  }

  return (
    <section
      aria-labelledby="gift-estimate-title"
      className="mt-6 rounded-3xl border border-zinc-200 bg-white p-5"
    >
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-700">
          <ReceiptText aria-hidden="true" className="h-5 w-5" />
        </span>

        <div className="min-w-0 flex-1">
          <p
            id="gift-estimate-title"
            className="text-sm font-semibold text-zinc-950"
          >
            App Kit network estimate
          </p>
          <p className="mt-1 text-xs leading-5 text-zinc-500">
            Verify the expected Arc network cost before any transaction is
            created.
          </p>
        </div>
      </div>

      {!estimate && (
        <button
          type="button"
          onClick={handleEstimate}
          disabled={!canEstimate || isEstimating}
          className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-zinc-950 px-5 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-4 sm:w-auto"
        >
          {isEstimating ? (
            <LoaderCircle
              aria-hidden="true"
              className="h-4 w-4 animate-spin"
            />
          ) : (
            <ReceiptText aria-hidden="true" className="h-4 w-4" />
          )}
          {isEstimating ? "Estimating…" : "Estimate network fee"}
        </button>
      )}

      {!isConnected && (
        <p className="mt-4 text-xs leading-5 text-amber-700">
          Connect your wallet to enable fee estimation.
        </p>
      )}

      {isConnected && !isArc && (
        <p className="mt-4 text-xs leading-5 text-amber-700">
          Switch your connected wallet to Arc Testnet before estimating.
        </p>
      )}

      {error && (
        <div
          role="alert"
          className="mt-5 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4"
        >
          <CircleAlert
            aria-hidden="true"
            className="mt-0.5 h-5 w-5 shrink-0 text-rose-700"
          />
          <div>
            <p className="text-sm font-semibold text-rose-950">
              Estimate unavailable
            </p>
            <p className="mt-1 text-xs leading-5 text-rose-800">{error}</p>
          </div>
        </div>
      )}

      {estimate && (
        <div className="mt-5">
          <div className="flex items-center gap-2 text-emerald-700">
            <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
            <p className="text-xs font-semibold uppercase tracking-[0.12em]">
              Estimate complete
            </p>
          </div>

          <dl className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl bg-zinc-50 p-4">
              <dt className="text-xs text-zinc-500">Estimated network fee</dt>
              <dd className="mt-2 text-lg font-semibold text-zinc-950">
                {Number(estimate.estimatedFeeUsdc).toLocaleString(undefined, {
                  maximumFractionDigits: 8,
                })}{" "}
                USDC
              </dd>
            </div>

            <div className="rounded-2xl bg-zinc-50 p-4">
              <dt className="text-xs text-zinc-500">Settlement asset</dt>
              <dd className="mt-2 text-lg font-semibold text-zinc-950">
                {estimate.token}
              </dd>
            </div>

            <div className="rounded-2xl bg-zinc-50 p-4">
              <dt className="text-xs text-zinc-500">Network</dt>
              <dd className="mt-2 text-sm font-semibold text-zinc-950">
                {estimate.network}
              </dd>
            </div>

            <div className="rounded-2xl bg-zinc-50 p-4">
              <dt className="text-xs text-zinc-500">Wallet provider</dt>
              <dd className="mt-2 text-sm font-semibold text-zinc-950">
                {estimate.walletName}
              </dd>
            </div>
          </dl>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs leading-5 text-zinc-500">
              This estimate can change before signing. No funds have moved.
            </p>

            <button
              type="button"
              onClick={handleEstimate}
              disabled={isEstimating}
              className="inline-flex min-h-10 items-center justify-center rounded-full border border-zinc-300 bg-white px-4 text-xs font-semibold text-zinc-800 transition hover:border-zinc-400 disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950"
            >
              {isEstimating ? "Refreshing…" : "Refresh estimate"}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
