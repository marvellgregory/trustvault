"use client";

import {
  Check,
  Copy,
  ExternalLink,
  Link2,
  LoaderCircle,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import type { TransactionReceiptData } from "@/components/receipts/receipt-types";
import {
  browserReceiptStore,
  createAbsoluteReceiptUrl,
  createReceiptPath,
} from "@/lib/receipts/receipt-store";

type ReceiptPermalinkProps = {
  receipt: TransactionReceiptData;
};

type SaveStatus = "saving" | "saved" | "error";

export function ReceiptPermalink({
  receipt,
}: ReceiptPermalinkProps) {
  const [status, setStatus] = useState<SaveStatus>("saving");
  const [copied, setCopied] = useState(false);

  const receiptPath = useMemo(
    () => createReceiptPath(receipt.id),
    [receipt.id],
  );

  const receiptUrl = useMemo(
    () => createAbsoluteReceiptUrl(receipt.id),
    [receipt.id],
  );

  useEffect(() => {
    let isMounted = true;

    async function saveReceipt() {
      try {
        await browserReceiptStore.save(receipt);

        if (isMounted) {
          setStatus("saved");
        }
      } catch {
        if (isMounted) {
          setStatus("error");
        }
      }
    }

    saveReceipt();

    return () => {
      isMounted = false;
    };
  }, [receipt]);

  async function handleCopyPermalink() {
    try {
      await navigator.clipboard.writeText(receiptUrl);

      setCopied(true);

      window.setTimeout(() => {
        setCopied(false);
      }, 1_500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <section
      aria-labelledby="receipt-permalink-title"
      className="mt-6 rounded-3xl border border-zinc-200 bg-white p-5"
    >
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-700">
          <Link2 aria-hidden="true" className="h-5 w-5" />
        </span>

        <div className="min-w-0 flex-1">
          <h3
            id="receipt-permalink-title"
            className="text-sm font-semibold text-zinc-950"
          >
            Receipt permalink
          </h3>

          <p className="mt-1 text-xs leading-5 text-zinc-500">
            Reopen this saved receipt from the same browser.
          </p>
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
        <p className="break-all font-mono text-xs leading-6 text-zinc-700">
          {receiptUrl}
        </p>
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <Link
          href={receiptPath}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-zinc-950 px-5 text-sm font-semibold text-white transition hover:bg-zinc-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-4"
        >
          Open receipt page
          <ExternalLink aria-hidden="true" className="h-4 w-4" />
        </Link>

        <button
          type="button"
          onClick={handleCopyPermalink}
          disabled={status !== "saved"}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-zinc-300 bg-white px-5 text-sm font-semibold text-zinc-950 transition hover:border-zinc-400 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950"
        >
          {status === "saving" ? (
            <LoaderCircle
              aria-hidden="true"
              className="h-4 w-4 animate-spin"
            />
          ) : copied ? (
            <Check aria-hidden="true" className="h-4 w-4" />
          ) : (
            <Copy aria-hidden="true" className="h-4 w-4" />
          )}

          {status === "saving"
            ? "Saving receipt…"
            : copied
              ? "Permalink copied"
              : "Copy permalink"}
        </button>
      </div>

      {status === "error" && (
        <p
          role="alert"
          className="mt-4 text-xs leading-5 text-rose-700"
        >
          TrustVault could not save this receipt in browser storage.
        </p>
      )}

      <p className="mt-4 text-xs leading-5 text-zinc-500">
        This development permalink currently uses this browser&apos;s local
        storage. Cross-device public links will be enabled when the production
        receipt database is connected.
      </p>
    </section>
  );
}
