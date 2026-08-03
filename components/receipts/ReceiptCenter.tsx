"use client";

import {
  ArrowRight,
  Clock3,
  Gift,
  LoaderCircle,
  ReceiptText,
  RefreshCw,
  ShoppingBag,
  Split,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import type { ReceiptTransactionType } from "@/components/receipts/receipt-types";
import {
  browserReceiptStore,
  createReceiptPath,
  type StoredReceipt,
} from "@/lib/receipts/receipt-store";

type CenterStatus = "loading" | "ready" | "empty" | "error";

const typeLabels: Record<ReceiptTransactionType, string> = {
  gift: "Gift",
  "bill-split": "Bill Split",
  purchase: "Purchase",
  escrow: "Escrow",
  refund: "Refund",
  bridge: "Bridge",
  swap: "Swap",
};

export function ReceiptCenter() {
  const [status, setStatus] = useState<CenterStatus>("loading");
  const [receipts, setReceipts] = useState<StoredReceipt[]>([]);
  const [isClearing, setIsClearing] = useState(false);

  const loadReceipts = useCallback(async () => {
    setStatus("loading");

    try {
      const storedReceipts = await browserReceiptStore.findAll();

      setReceipts(storedReceipts);
      setStatus(storedReceipts.length > 0 ? "ready" : "empty");
    } catch {
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    loadReceipts();
  }, [loadReceipts]);

  async function handleClearHistory() {
    const confirmed = window.confirm(
      "Remove all locally saved TrustVault receipts from this browser?",
    );

    if (!confirmed) {
      return;
    }

    setIsClearing(true);

    try {
      await browserReceiptStore.clear();
      setReceipts([]);
      setStatus("empty");
    } finally {
      setIsClearing(false);
    }
  }

  const totals = useMemo(() => {
    const totalUsdc = receipts.reduce((sum, storedReceipt) => {
      if (storedReceipt.receipt.asset !== "USDC") {
        return sum;
      }

      const amount = Number(storedReceipt.receipt.amount);

      return Number.isFinite(amount) ? sum + amount : sum;
    }, 0);

    return {
      totalTransactions: receipts.length,
      totalUsdc,
    };
  }, [receipts]);

  if (status === "loading") {
    return (
      <CenterState
        icon={LoaderCircle}
        title="Loading receipts"
        description="TrustVault is retrieving saved transaction receipts from this browser."
        isLoading
      />
    );
  }

  if (status === "error") {
    return (
      <CenterState
        icon={ReceiptText}
        title="Receipt history unavailable"
        description="TrustVault could not load the locally saved transaction history."
        actionLabel="Try again"
        onAction={loadReceipts}
      />
    );
  }

  if (status === "empty") {
    return (
      <CenterState
        icon={ReceiptText}
        title="No saved receipts yet"
        description="Completed transactions will appear here after TrustVault creates and saves their receipts."
        actionLabel="Create a Gift Vault"
        actionHref="/gift-vault"
      />
    );
  }

  return (
    <section className="section-shell py-14 sm:py-18 lg:py-24">
      <div className="flex flex-col gap-6 border-b border-zinc-200 pb-8 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--tv-brand)]">
            Receipt Center
          </p>

          <h1 className="mt-4 text-4xl font-semibold tracking-[-0.05em] text-zinc-950 sm:text-5xl lg:text-6xl">
            Every TrustVault transaction, in one place.
          </h1>

          <p className="mt-5 max-w-2xl text-base leading-8 text-zinc-600">
            Review saved Gift, Bill Split, Purchase, Escrow, Refund, Bridge and
            Swap receipts from this browser.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={loadReceipts}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-zinc-300 bg-white px-5 text-sm font-semibold text-zinc-950 transition hover:border-zinc-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950"
          >
            <RefreshCw aria-hidden="true" className="h-4 w-4" />
            Refresh
          </button>

          <button
            type="button"
            onClick={handleClearHistory}
            disabled={isClearing}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-5 text-sm font-semibold text-rose-700 transition hover:border-rose-300 disabled:cursor-wait disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-600"
          >
            {isClearing ? (
              <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 aria-hidden="true" className="h-4 w-4" />
            )}

            Clear history
          </button>
        </div>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <SummaryCard
          label="Saved transactions"
          value={String(totals.totalTransactions)}
        />

        <SummaryCard
          label="Recorded USDC"
          value={`${totals.totalUsdc.toLocaleString(undefined, {
            maximumFractionDigits: 6,
          })} USDC`}
        />
      </div>

      <div className="mt-10 grid gap-4">
        {receipts.map((storedReceipt) => (
          <ReceiptHistoryCard
            key={storedReceipt.receipt.id}
            storedReceipt={storedReceipt}
          />
        ))}
      </div>

      <p className="mt-8 text-xs leading-6 text-zinc-500">
        This development Receipt Center uses browser storage. Production
        history will move to authenticated, cross-device database persistence.
      </p>
    </section>
  );
}

type SummaryCardProps = {
  label: string;
  value: string;
};

function SummaryCard({ label, value }: SummaryCardProps) {
  return (
    <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
        {label}
      </p>

      <p className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-zinc-950">
        {value}
      </p>
    </div>
  );
}

type ReceiptHistoryCardProps = {
  storedReceipt: StoredReceipt;
};

function ReceiptHistoryCard({ storedReceipt }: ReceiptHistoryCardProps) {
  const { receipt } = storedReceipt;
  const Icon = getReceiptIcon(receipt.type);

  return (
    <article className="rounded-[2rem] border border-zinc-200 bg-white p-5 shadow-sm transition hover:border-zinc-300 hover:shadow-[var(--tv-shadow-md)] sm:p-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-800">
          <Icon aria-hidden="true" className="h-5 w-5" />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-zinc-950">
              {typeLabels[receipt.type]} receipt
            </p>

            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              {formatStatus(receipt.status)}
            </span>
          </div>

          <p className="mt-2 text-xl font-semibold tracking-[-0.03em] text-zinc-950">
            {receipt.amount} {receipt.asset}
          </p>

          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-zinc-500">
            <span>{receipt.network}</span>

            {receipt.recipientName && (
              <span>Recipient: {receipt.recipientName}</span>
            )}

            <span className="inline-flex items-center gap-1.5">
              <Clock3 aria-hidden="true" className="h-3.5 w-3.5" />
              {formatDate(receipt.confirmedAt ?? receipt.createdAt)}
            </span>
          </div>

          <p className="mt-3 break-all font-mono text-xs text-zinc-400">
            {receipt.id}
          </p>
        </div>

        <Link
          href={createReceiptPath(receipt.id)}
          className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-zinc-950 px-5 text-sm font-semibold text-white transition hover:bg-zinc-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-4"
        >
          Open receipt
          <ArrowRight aria-hidden="true" className="h-4 w-4" />
        </Link>
      </div>
    </article>
  );
}

function getReceiptIcon(type: ReceiptTransactionType) {
  switch (type) {
    case "gift":
      return Gift;
    case "bill-split":
      return Split;
    case "purchase":
      return ShoppingBag;
    default:
      return ReceiptText;
  }
}

function formatStatus(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

type CenterStateProps = {
  icon: typeof ReceiptText;
  title: string;
  description: string;
  isLoading?: boolean;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
};

function CenterState({
  icon: Icon,
  title,
  description,
  isLoading = false,
  actionLabel,
  actionHref,
  onAction,
}: CenterStateProps) {
  return (
    <section className="section-shell py-20 sm:py-24 lg:py-32">
      <div className="mx-auto max-w-xl rounded-[2rem] border border-zinc-200 bg-white p-8 text-center shadow-[var(--tv-shadow-md)] sm:p-10">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-700">
          <Icon
            aria-hidden="true"
            className={`h-6 w-6 ${isLoading ? "animate-spin" : ""}`}
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
