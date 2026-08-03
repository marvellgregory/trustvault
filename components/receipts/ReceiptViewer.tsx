"use client";

import {
  CircleAlert,
  LoaderCircle,
  ReceiptText,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { TransactionReceipt } from "@/components/receipts/TransactionReceipt";
import type { StoredReceipt } from "@/lib/receipts/receipt-store";
import { browserReceiptStore } from "@/lib/receipts/receipt-store";

type ReceiptViewerProps = {
  receiptId: string;
};

type ViewerStatus =
  | "loading"
  | "found"
  | "not-found"
  | "error";

export function ReceiptViewer({
  receiptId,
}: ReceiptViewerProps) {
  const [status, setStatus] =
    useState<ViewerStatus>("loading");

  const [storedReceipt, setStoredReceipt] =
    useState<StoredReceipt | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadReceipt() {
      try {
        const result =
          await browserReceiptStore.findById(receiptId);

        if (!isMounted) {
          return;
        }

        if (!result) {
          setStatus("not-found");
          return;
        }

        setStoredReceipt(result);
        setStatus("found");
      } catch {
        if (isMounted) {
          setStatus("error");
        }
      }
    }

    loadReceipt();

    return () => {
      isMounted = false;
    };
  }, [receiptId]);

  if (status === "loading") {
    return (
      <ViewerState
        icon={LoaderCircle}
        title="Loading receipt"
        description="TrustVault is retrieving the saved transaction receipt."
        isLoading
      />
    );
  }

  if (status === "not-found") {
    return (
      <ViewerState
        icon={ReceiptText}
        title="Receipt not found"
        description="This receipt is not stored in this browser. It may have been created on another device, removed from local storage, or not saved yet."
      />
    );
  }

  if (status === "error" || !storedReceipt) {
    return (
      <ViewerState
        icon={CircleAlert}
        title="Receipt unavailable"
        description="TrustVault could not load this receipt. Refresh the page or return to Gift Vault."
      />
    );
  }

  return (
    <TransactionReceipt
      receipt={storedReceipt.receipt}
    />
  );
}

type ViewerStateProps = {
  icon: typeof ReceiptText;
  title: string;
  description: string;
  isLoading?: boolean;
};

function ViewerState({
  icon: Icon,
  title,
  description,
  isLoading = false,
}: ViewerStateProps) {
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

        {!isLoading && (
          <Link
            href="/gift-vault"
            className="mt-7 inline-flex min-h-11 items-center justify-center rounded-full bg-zinc-950 px-5 text-sm font-semibold text-white transition hover:bg-zinc-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-4"
          >
            Return to Gift Vault
          </Link>
        )}
      </div>
    </section>
  );
}
