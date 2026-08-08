"use client";

import {
  CheckCircle2,
  CircleAlert,
  Clock3,
  ExternalLink,
  ReceiptText,
  RotateCcw,
  ShieldCheck,
  WalletCards,
} from "lucide-react";
import { useState, type ReactNode } from "react";

import { ReceiptDownload } from "@/components/receipts/ReceiptDownload";
import { ReceiptPrivacyControls } from "@/components/receipts/ReceiptPrivacyControls";
import { ReceiptQrCode } from "@/components/receipts/ReceiptQrCode";
import { ReceiptShareMenu } from "@/components/receipts/ReceiptShareMenu";
import {
  shortenReceiptValue,
  type ReceiptPrivacyOptions,
  type TransactionReceiptData,
} from "@/components/receipts/receipt-types";

type TransactionReceiptProps = {
  receipt: TransactionReceiptData;
  onReset?: () => void;
  children?: ReactNode;
};

const statusLabels = {
  pending: "Pending",
  confirmed: "Confirmed",
  failed: "Failed",
  refunded: "Refunded",
} as const;

export function TransactionReceipt({
  receipt,
  onReset,
  children,
}: TransactionReceiptProps) {
  const [privacy, setPrivacy] =
    useState<ReceiptPrivacyOptions>(
      receipt.privacy,
    );

  const visibleReceipt: TransactionReceiptData = {
    ...receipt,
    privacy,
  };

  const isConfirmed =
    receipt.status === "confirmed";
  const isFailed =
    receipt.status === "failed";
  const statusText =
    statusLabels[receipt.status];
  const isOnchainEnforced =
    receipt.metadata?.onchainEnforced ===
    true;

  return (
    <section className="section-shell py-16 sm:py-20 lg:py-24">
      <div className="mx-auto max-w-3xl overflow-hidden rounded-[2rem] border border-zinc-200 bg-white shadow-[var(--tv-shadow-lg)]">
        <div
          className={`border-b px-6 py-10 text-center sm:px-10 ${
            isConfirmed
              ? "border-emerald-100 bg-emerald-50"
              : isFailed
                ? "border-rose-100 bg-rose-50"
                : "border-amber-100 bg-amber-50"
          }`}
        >
          <span
            className={`mx-auto flex h-16 w-16 items-center justify-center rounded-[1.5rem] bg-white shadow-sm ${
              isConfirmed
                ? "text-emerald-700"
                : isFailed
                  ? "text-rose-700"
                  : "text-amber-700"
            }`}
          >
            {isConfirmed ? (
              <CheckCircle2
                aria-hidden="true"
                className="h-8 w-8"
              />
            ) : isFailed ? (
              <CircleAlert
                aria-hidden="true"
                className="h-8 w-8"
              />
            ) : (
              <Clock3
                aria-hidden="true"
                className="h-8 w-8"
              />
            )}
          </span>

          <p
            className={`mt-6 text-xs font-semibold uppercase tracking-[0.18em] ${
              isConfirmed
                ? "text-emerald-700"
                : isFailed
                  ? "text-rose-700"
                  : "text-amber-700"
            }`}
          >
            {statusText}
          </p>

          <h2 className="mt-3 text-balance text-3xl font-semibold tracking-[-0.045em] text-zinc-950 sm:text-5xl">
            {receipt.title}
          </h2>

          {receipt.description && (
            <p className="mx-auto mt-4 max-w-xl text-base leading-8 text-zinc-600">
              {receipt.description}
            </p>
          )}
        </div>

        <div className="p-6 sm:p-10">
          <div className="grid gap-3 sm:grid-cols-2">
            {privacy.showRecipientName &&
              receipt.recipientName && (
                <ReceiptItem
                  icon={WalletCards}
                  label="Recipient"
                  value={receipt.recipientName}
                />
              )}

            <ReceiptItem
              icon={ReceiptText}
              label="Amount"
              value={`${receipt.amount} ${receipt.asset}`}
            />

            <ReceiptItem
              icon={ShieldCheck}
              label="Network"
              value={receipt.network}
            />

            <ReceiptItem
              icon={CheckCircle2}
              label="Status"
              value={statusText}
            />

            {privacy.showSenderAddress &&
              receipt.senderAddress && (
                <ReceiptItem
                  icon={WalletCards}
                  label="Sender wallet"
                  value={shortenReceiptValue(
                    receipt.senderAddress,
                  )}
                />
              )}

            {privacy.showRecipientAddress &&
              receipt.recipientAddress && (
                <ReceiptItem
                  icon={WalletCards}
                  label="Recipient wallet"
                  value={shortenReceiptValue(
                    receipt.recipientAddress,
                  )}
                />
              )}

            {receipt.unlockDate && (
              <ReceiptItem
                icon={Clock3}
                label="Unlock date"
                value={receipt.unlockDate}
              />
            )}

            <ReceiptItem
              icon={ReceiptText}
              label="Receipt ID"
              value={receipt.id}
            />
          </div>

          {privacy.showTransactionHash &&
            receipt.transactionHash && (
              <div className="mt-6 rounded-3xl border border-zinc-200 bg-zinc-50 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
                  Transaction hash
                </p>

                <p className="mt-3 break-all font-mono text-sm font-semibold text-zinc-950">
                  {shortenReceiptValue(
                    receipt.transactionHash,
                    10,
                    8,
                  )}
                </p>

                {receipt.explorerUrl && (
                  <a
                    href={receipt.explorerUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-zinc-950 px-5 text-sm font-semibold text-white transition hover:bg-zinc-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-4"
                  >
                    View on explorer
                    <ExternalLink
                      aria-hidden="true"
                      className="h-4 w-4"
                    />
                  </a>
                )}
              </div>
            )}

          {privacy.showPersonalMessage &&
            receipt.personalMessage && (
              <div className="mt-6 rounded-3xl border border-zinc-200 bg-white p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
                  Personal message
                </p>

                <p className="mt-3 text-sm leading-7 text-zinc-700">
                  {receipt.personalMessage}
                </p>
              </div>
            )}

          {receipt.environment === "testnet" && (
            <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-6 text-amber-800">
              {isOnchainEnforced
                ? "Testnet assets have no real-world value. Gift Vault timing and claim state shown here are enforced by the deployed Arc Testnet smart contract."
                : "Testnet assets have no real-world value. Any programmable condition shown here should be treated as application metadata unless an onchain contract is explicitly identified."}
            </div>
          )}

          <ReceiptQrCode
            explorerUrl={receipt.explorerUrl}
            transactionHash={
              receipt.transactionHash
            }
          />

          <ReceiptPrivacyControls
            value={privacy}
            onChange={setPrivacy}
          />

          <ReceiptDownload
            receipt={visibleReceipt}
          />

          <ReceiptShareMenu
            receipt={visibleReceipt}
          />

          {children}

          {onReset && (
            <button
              type="button"
              onClick={onReset}
              className="mt-8 inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-zinc-300 bg-white px-6 text-sm font-semibold text-zinc-950 transition hover:border-zinc-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950"
            >
              <RotateCcw
                aria-hidden="true"
                className="h-4 w-4"
              />
              Continue
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

type ReceiptItemProps = {
  icon: typeof ReceiptText;
  label: string;
  value: string;
};

function ReceiptItem({
  icon: Icon,
  label,
  value,
}: ReceiptItemProps) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4">
      <div className="flex items-center gap-2 text-zinc-500">
        <Icon
          aria-hidden="true"
          className="h-4 w-4"
        />
        <p className="text-xs font-medium">
          {label}
        </p>
      </div>

      <p className="mt-3 break-words text-sm font-semibold text-zinc-950">
        {value}
      </p>
    </div>
  );
}
