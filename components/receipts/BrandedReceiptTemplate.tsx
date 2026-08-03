/* eslint-disable @next/next/no-img-element */

import {
  CheckCircle2,
  ShieldCheck,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import {
  forwardRef,
  type ForwardedRef,
} from "react";

import {
  shortenReceiptValue,
  type TransactionReceiptData,
} from "@/components/receipts/receipt-types";

type BrandedReceiptTemplateProps = {
  receipt: TransactionReceiptData;
};

const transactionLabels: Record<
  TransactionReceiptData["type"],
  string
> = {
  gift: "Gift Receipt",
  "bill-split": "Bill Split Receipt",
  purchase: "Purchase Receipt",
  escrow: "Escrow Receipt",
  refund: "Refund Receipt",
  bridge: "Bridge Receipt",
  swap: "Swap Receipt",
};

function formatReceiptDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return `${date.toISOString().slice(0, 19).replace("T", " ")} UTC`;
}

function formatStatus(value: TransactionReceiptData["status"]) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export const BrandedReceiptTemplate = forwardRef(
  function BrandedReceiptTemplate(
    { receipt }: BrandedReceiptTemplateProps,
    ref: ForwardedRef<HTMLDivElement>,
  ) {
    const statusLabel = formatStatus(receipt.status);
    const transactionLabel = transactionLabels[receipt.type];

    return (
      <div
        ref={ref}
        className="w-[760px] bg-white p-12 text-zinc-950"
      >
        <div className="overflow-hidden rounded-[36px] border border-zinc-200 bg-white">
          <header className="border-b border-zinc-200 bg-zinc-50 px-10 py-8">
            <div className="flex items-center justify-between gap-8">
              <div className="flex items-center gap-5">
                <img
                  src="/brand/trustvault/icon.svg"
                  alt=""
                  width="88"
                  height="88"
                  className="h-[88px] w-[88px] object-contain"
                />

                <div>
                  <img
                    src="/brand/trustvault/wordmark.svg"
                    alt="TrustVault"
                    width="190"
                    height="56"
                    className="h-auto w-[190px]"
                  />

                  <p className="mt-3 text-[15px] font-semibold text-zinc-600">
                    {transactionLabel}
                  </p>
                </div>
              </div>

              <div className="rounded-full border border-emerald-200 bg-emerald-50 px-5 py-3 text-[14px] font-bold uppercase tracking-[0.12em] text-emerald-700">
                {statusLabel}
              </div>
            </div>
          </header>

          <main className="px-10 py-10">
            <div className="flex items-start gap-5">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                <CheckCircle2
                  aria-hidden="true"
                  className="h-7 w-7"
                />
              </span>

              <div>
                <p className="text-[14px] font-bold uppercase tracking-[0.16em] text-emerald-700">
                  Transaction confirmed
                </p>

                <h1 className="mt-3 text-[38px] font-bold tracking-[-0.04em] text-zinc-950">
                  {receipt.title}
                </h1>

                {receipt.description && (
                  <p className="mt-4 max-w-[560px] text-[17px] leading-7 text-zinc-600">
                    {receipt.description}
                  </p>
                )}
              </div>
            </div>

            <div className="mt-9 grid grid-cols-2 gap-4">
              {receipt.privacy.showRecipientName &&
                receipt.recipientName && (
                  <ReceiptField
                    label="Recipient"
                    value={receipt.recipientName}
                  />
                )}

              <ReceiptField
                label="Amount"
                value={`${receipt.amount} ${receipt.asset}`}
              />

              <ReceiptField
                label="Network"
                value={receipt.network}
              />

              <ReceiptField
                label="Status"
                value={statusLabel}
              />

              {receipt.privacy.showSenderAddress &&
                receipt.senderAddress && (
                  <ReceiptField
                    label="Sender wallet"
                    value={shortenReceiptValue(
                      receipt.senderAddress,
                    )}
                  />
                )}

              {receipt.privacy.showRecipientAddress &&
                receipt.recipientAddress && (
                  <ReceiptField
                    label="Recipient wallet"
                    value={shortenReceiptValue(
                      receipt.recipientAddress,
                    )}
                  />
                )}

              {receipt.unlockDate && (
                <ReceiptField
                  label="Unlock date"
                  value={receipt.unlockDate}
                />
              )}

              <ReceiptField
                label="Receipt ID"
                value={receipt.id}
              />
            </div>

            {receipt.privacy.showTransactionHash &&
              receipt.transactionHash && (
                <div className="mt-5 rounded-3xl border border-zinc-200 bg-zinc-50 p-6">
                  <p className="text-[13px] font-bold uppercase tracking-[0.14em] text-zinc-500">
                    Transaction hash
                  </p>

                  <p className="mt-3 break-all font-mono text-[15px] font-semibold leading-6 text-zinc-950">
                    {receipt.transactionHash}
                  </p>
                </div>
              )}

            {receipt.privacy.showPersonalMessage &&
              receipt.personalMessage && (
                <div className="mt-5 rounded-3xl border border-zinc-200 bg-white p-6">
                  <p className="text-[13px] font-bold uppercase tracking-[0.14em] text-zinc-500">
                    Personal message
                  </p>

                  <p className="mt-3 text-[16px] leading-7 text-zinc-700">
                    {receipt.personalMessage}
                  </p>
                </div>
              )}

            <div className="mt-8 flex items-center gap-7 rounded-3xl border border-zinc-200 bg-zinc-50 p-6">
              {receipt.explorerUrl && (
                <div className="shrink-0 rounded-2xl border border-zinc-200 bg-white p-3">
                  <QRCodeSVG
                    value={receipt.explorerUrl}
                    size={138}
                    level="M"
                    marginSize={1}
                    title="Transaction explorer QR code"
                  />
                </div>
              )}

              <div>
                <div className="flex items-center gap-2 text-zinc-700">
                  <ShieldCheck
                    aria-hidden="true"
                    className="h-5 w-5"
                  />

                  <p className="text-[15px] font-bold">
                    Verified on ArcScan
                  </p>
                </div>

                <p className="mt-3 text-[14px] leading-6 text-zinc-500">
                  Scan the QR code to view the public transaction record.
                </p>

                <p className="mt-4 text-[14px] font-semibold text-zinc-800">
                  Network: {receipt.network}
                </p>

                <p className="mt-2 text-[13px] text-zinc-500">
                  Settlement asset: {receipt.asset}
                </p>
              </div>
            </div>

            {receipt.environment === "testnet" && (
              <div className="mt-7 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
                <p className="text-[13px] leading-6 text-amber-800">
                  Arc Testnet assets have no real-world value. TrustVault uses
                  Arc Testnet infrastructure for this transaction record.
                </p>
              </div>
            )}
          </main>

          <footer className="border-t border-zinc-200 bg-zinc-950 px-10 py-6 text-white">
            <div className="flex items-end justify-between gap-8">
              <div>
                <p className="text-[14px] font-semibold">
                  Generated by TrustVault
                </p>

                <p className="mt-1 text-[12px] text-zinc-400">
                  {formatReceiptDate(
                    receipt.confirmedAt ?? receipt.createdAt,
                  )}
                </p>
              </div>

              <div className="text-right">
                <p className="text-[12px] font-semibold text-zinc-300">
                  Built with Circle App Kit
                </p>

                <p className="mt-1 text-[12px] text-zinc-400">
                  Network infrastructure: Arc Testnet
                </p>
              </div>
            </div>
          </footer>
        </div>
      </div>
    );
  },
);

type ReceiptFieldProps = {
  label: string;
  value: string;
};

function ReceiptField({
  label,
  value,
}: ReceiptFieldProps) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5">
      <p className="text-[13px] font-medium text-zinc-500">
        {label}
      </p>

      <p className="mt-3 break-words text-[16px] font-bold text-zinc-950">
        {value}
      </p>
    </div>
  );
}
