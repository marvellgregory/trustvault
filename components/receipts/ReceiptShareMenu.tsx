"use client";

import {
  Check,
  Copy,
  Mail,
  MessageCircle,
  MessagesSquare,
  Share2,
} from "lucide-react";
import { useMemo, useState } from "react";

import type { TransactionReceiptData } from "@/components/receipts/receipt-types";
import { shortenReceiptValue } from "@/components/receipts/receipt-types";

type ReceiptShareMenuProps = {
  receipt: TransactionReceiptData;
};

function createShareText(receipt: TransactionReceiptData) {
  const lines = [
    "TrustVault transaction receipt",
    receipt.title,
    `${receipt.amount} ${receipt.asset}`,
    `Network: ${receipt.network}`,
    `Status: ${receipt.status}`,
  ];

  if (
    receipt.privacy.showRecipientName &&
    receipt.recipientName
  ) {
    lines.push(`Recipient: ${receipt.recipientName}`);
  }

  if (
    receipt.privacy.showTransactionHash &&
    receipt.transactionHash
  ) {
    lines.push(
      `Transaction: ${shortenReceiptValue(
        receipt.transactionHash,
        10,
        8,
      )}`,
    );
  }

  if (receipt.explorerUrl) {
    lines.push(receipt.explorerUrl);
  }

  if (receipt.environment === "testnet") {
    lines.push("Arc Testnet assets have no real-world value.");
  }

  return lines.join("\n");
}

export function ReceiptShareMenu({
  receipt,
}: ReceiptShareMenuProps) {
  const [copied, setCopied] = useState(false);
  const [shareError, setShareError] = useState<string | null>(
    null,
  );

  const shareText = useMemo(
    () => createShareText(receipt),
    [receipt],
  );

  const receiptUrl =
    typeof window !== "undefined"
      ? window.location.href
      : receipt.explorerUrl ?? "";

  const encodedText = encodeURIComponent(shareText);
  const encodedUrl = encodeURIComponent(receiptUrl);

  async function handleNativeShare() {
    setShareError(null);

    if (!navigator.share) {
      setShareError(
        "Native sharing is not available in this browser. Use one of the options below.",
      );
      return;
    }

    try {
      await navigator.share({
        title: receipt.title,
        text: shareText,
        url: receiptUrl || undefined,
      });
    } catch (error) {
      if (
        error instanceof DOMException &&
        error.name === "AbortError"
      ) {
        return;
      }

      setShareError(
        "The receipt could not be shared. Try copying the link or choosing another option.",
      );
    }
  }

  async function handleCopyLink() {
    setShareError(null);

    try {
      await navigator.clipboard.writeText(
        receipt.explorerUrl || receiptUrl || shareText,
      );

      setCopied(true);

      window.setTimeout(() => {
        setCopied(false);
      }, 1_500);
    } catch {
      setShareError("The receipt link could not be copied.");
    }
  }

  const whatsappUrl = `https://wa.me/?text=${encodedText}`;
  const telegramUrl =
    `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`;
  const emailUrl =
    `mailto:?subject=${encodeURIComponent(
      receipt.title,
    )}&body=${encodedText}`;
  const smsUrl = `sms:?&body=${encodedText}`;

  return (
    <section
      aria-labelledby="receipt-share-title"
      className="mt-6 rounded-3xl border border-zinc-200 bg-zinc-50 p-5"
    >
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-zinc-700 shadow-sm">
          <Share2 aria-hidden="true" className="h-5 w-5" />
        </span>

        <div>
          <h3
            id="receipt-share-title"
            className="text-sm font-semibold text-zinc-950"
          >
            Share this receipt
          </h3>

          <p className="mt-1 text-xs leading-5 text-zinc-500">
            Use your device share menu or choose a specific app.
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={handleNativeShare}
        className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-zinc-950 px-5 text-sm font-semibold text-white transition hover:bg-zinc-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-4 sm:w-auto"
      >
        <Share2 aria-hidden="true" className="h-4 w-4" />
        Share receipt
      </button>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <ShareLink
          href={whatsappUrl}
          label="WhatsApp"
          icon={MessageCircle}
        />

        <ShareLink
          href={telegramUrl}
          label="Telegram"
          icon={MessagesSquare}
        />

        <ShareLink
          href={emailUrl}
          label="Email or Gmail"
          icon={Mail}
        />

        <ShareLink
          href={smsUrl}
          label="SMS or Messages"
          icon={MessagesSquare}
        />

        <button
          type="button"
          onClick={handleCopyLink}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-800 transition hover:border-zinc-300 hover:text-zinc-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950"
        >
          {copied ? (
            <Check aria-hidden="true" className="h-4 w-4" />
          ) : (
            <Copy aria-hidden="true" className="h-4 w-4" />
          )}

          {copied ? "Copied" : "Copy receipt link"}
        </button>
      </div>

      {shareError && (
        <p
          role="alert"
          className="mt-4 text-xs leading-5 text-rose-700"
        >
          {shareError}
        </p>
      )}

      <p className="mt-4 text-xs leading-5 text-zinc-500">
        The apps shown by the native share menu depend on the
        applications installed on the user&apos;s device.
      </p>
    </section>
  );
}

type ShareLinkProps = {
  href: string;
  label: string;
  icon: typeof Share2;
};

function ShareLink({
  href,
  label,
  icon: Icon,
}: ShareLinkProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-800 transition hover:border-zinc-300 hover:text-zinc-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950"
    >
      <Icon aria-hidden="true" className="h-4 w-4" />
      {label}
    </a>
  );
}
