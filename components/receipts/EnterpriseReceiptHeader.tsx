"use client";

import {
  CheckCircle2,
  Copy,
  ExternalLink,
  Network,
  ReceiptText,
  ShieldCheck,
  Sparkles,
  WalletCards,
} from "lucide-react";
import { useState } from "react";

import {
  shortenReceiptValue,
  type TransactionReceiptData,
} from "@/components/receipts/receipt-types";

type EnterpriseReceiptHeaderProps = {
  receipt: TransactionReceiptData;
};

function displayReceiptId(receipt: TransactionReceiptData) {
  return receipt.displayId || receipt.id;
}

export function EnterpriseReceiptHeader({
  receipt,
}: EnterpriseReceiptHeaderProps) {
  const [copied, setCopied] = useState(false);

  async function copyTransactionHash() {
    if (!receipt.transactionHash) {
      return;
    }

    await navigator.clipboard.writeText(
      receipt.transactionHash,
    );

    setCopied(true);

    window.setTimeout(
      () => setCopied(false),
      1_500,
    );
  }

  return (
    <section className="section-shell pt-10 sm:pt-12">
      <div className="mx-auto max-w-6xl">
        <div className="overflow-hidden rounded-[2rem] border border-zinc-200 bg-white shadow-[var(--tv-shadow-md)]">
          <div className="border-b border-zinc-200 bg-zinc-50 px-6 py-6 sm:px-8">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Settlement confirmed
                  </span>

                  <span className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700">
                    <Network className="h-3.5 w-3.5" />
                    {receipt.network}
                  </span>

                  <span className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-800">
                    {receipt.asset}
                  </span>
                </div>

                <h1 className="mt-4 text-3xl font-semibold tracking-[-0.045em] text-zinc-950 sm:text-4xl">
                  Marketplace receipt
                </h1>

                <p className="mt-2 font-mono text-sm font-semibold text-zinc-600">
                  {displayReceiptId(receipt)}
                </p>
              </div>

              <div className="rounded-2xl border border-zinc-200 bg-white px-5 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
                  Amount settled
                </p>

                <p className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-zinc-950">
                  {receipt.amount} {receipt.asset}
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 p-6 sm:p-8 lg:grid-cols-3">
            <InfoCard
              icon={WalletCards}
              label="Customer"
              title={
                receipt.customer?.displayName ||
                "Connected wallet"
              }
              description={
                receipt.customer?.walletAddress
                  ? shortenReceiptValue(
                      receipt.customer.walletAddress,
                      6,
                      4,
                    )
                  : "Saved with this receipt"
              }
            />

            <InfoCard
              icon={ShieldCheck}
              label="Merchant"
              title={
                receipt.seller?.storeName ||
                receipt.seller?.displayName ||
                receipt.recipientName ||
                "Marketplace seller"
              }
              description={
                receipt.seller?.settlementWalletChecked
                  ? "Settlement wallet checks passed"
                  : "Settlement destination recorded"
              }
            />

            <InfoCard
              icon={Sparkles}
              label="TrustPoints"
              title={
                receipt.rewards
                  ? `+${receipt.rewards.pointsAwarded}`
                  : "Recorded after settlement"
              }
              description={
                typeof receipt.rewards?.balanceAfterAward === "number"
                  ? `${receipt.rewards.balanceAfterAward} confirmed balance`
                  : "Reward details saved with eligible purchases"
              }
            />
          </div>

          {receipt.transactionHash && (
            <div className="border-t border-zinc-200 px-6 py-6 sm:px-8">
              <div className="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
                    Transaction proof
                  </p>

                  <p className="mt-2 font-mono text-sm font-semibold text-zinc-900">
                    {shortenReceiptValue(
                      receipt.transactionHash,
                      10,
                      8,
                    )}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={copyTransactionHash}
                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-zinc-300 bg-white px-4 text-xs font-semibold text-zinc-800 transition hover:border-zinc-400"
                  >
                    {copied ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                    {copied ? "Copied" : "Copy hash"}
                  </button>

                  {receipt.explorerUrl && (
                    <a
                      href={receipt.explorerUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full bg-zinc-950 px-4 text-xs font-semibold text-white transition hover:bg-zinc-800"
                    >
                      Open on ArcScan
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

type InfoCardProps = {
  icon: typeof ReceiptText;
  label: string;
  title: string;
  description: string;
};

function InfoCard({
  icon: Icon,
  label,
  title,
  description,
}: InfoCardProps) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-100 text-zinc-700">
        <Icon className="h-5 w-5" />
      </span>

      <p className="mt-4 text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
        {label}
      </p>

      <p className="mt-2 text-sm font-semibold text-zinc-950">
        {title}
      </p>

      <p className="mt-1 text-xs leading-5 text-zinc-500">
        {description}
      </p>
    </div>
  );
}
