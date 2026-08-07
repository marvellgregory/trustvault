/* eslint-disable @next/next/no-img-element */

import {
  CheckCircle2,
  ShieldCheck,
  Sparkles,
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
  purchase: "Marketplace Receipt",
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
    const receiptNumber = receipt.displayId || receipt.id;

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

                  <p className="mt-1 font-mono text-[12px] font-semibold text-zinc-500">
                    {receiptNumber}
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
                  Settlement confirmed
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
              <ReceiptField
                label="Amount settled"
                value={`${receipt.amount} ${receipt.asset}`}
              />

              <ReceiptField
                label="Network"
                value={receipt.network}
              />

              <ReceiptField
                label="Receipt number"
                value={receiptNumber}
              />

              {receipt.metadata?.orderNumber && (
                <ReceiptField
                  label="Order number"
                  value={String(receipt.metadata.orderNumber)}
                />
              )}
            </div>

            {(receipt.customer || receipt.seller) && (
              <div className="mt-6 grid grid-cols-2 gap-4">
                {receipt.customer && (
                  <PartyCard
                    title="Customer"
                    name={
                      receipt.customer.displayName ||
                      "Connected wallet"
                    }
                    wallet={receipt.customer.walletAddress}
                    detail={
                      receipt.customer.email ||
                      receipt.customer.address
                    }
                  />
                )}

                {receipt.seller && (
                  <PartyCard
                    title="Merchant"
                    name={
                      receipt.seller.storeName ||
                      receipt.seller.displayName ||
                      receipt.recipientName ||
                      "Marketplace seller"
                    }
                    wallet={receipt.seller.settlementWallet}
                    detail={
                      receipt.seller.settlementWalletChecked
                        ? "Settlement wallet checks passed"
                        : "Settlement destination recorded"
                    }
                  />
                )}
              </div>
            )}

            {receipt.rewards && (
              <div className="mt-6 flex items-center justify-between gap-6 rounded-3xl border border-violet-200 bg-violet-50 p-6">
                <div className="flex items-center gap-4">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-violet-700">
                    <Sparkles className="h-6 w-6" />
                  </span>

                  <div>
                    <p className="text-[13px] font-bold uppercase tracking-[0.14em] text-violet-700">
                      TrustPoints earned
                    </p>

                    <p className="mt-2 text-[26px] font-bold text-zinc-950">
                      +{receipt.rewards.pointsAwarded}
                    </p>
                  </div>
                </div>

                {typeof receipt.rewards.balanceAfterAward === "number" && (
                  <div className="text-right">
                    <p className="text-[12px] font-semibold text-zinc-500">
                      Confirmed balance
                    </p>

                    <p className="mt-1 text-[18px] font-bold text-zinc-950">
                      {receipt.rewards.balanceAfterAward}
                    </p>
                  </div>
                )}
              </div>
            )}

            {receipt.privacy.showTransactionHash &&
              receipt.transactionHash && (
                <div className="mt-6 rounded-3xl border border-zinc-200 bg-zinc-50 p-6">
                  <p className="text-[13px] font-bold uppercase tracking-[0.14em] text-zinc-500">
                    Transaction proof
                  </p>

                  <p className="mt-3 font-mono text-[15px] font-semibold leading-6 text-zinc-950">
                    {shortenReceiptValue(
                      receipt.transactionHash,
                      12,
                      10,
                    )}
                  </p>

                  <p className="mt-2 text-[12px] leading-5 text-zinc-500">
                    Full transaction hash remains available through the ArcScan QR verification link.
                  </p>
                </div>
              )}

            {receipt.timeline && receipt.timeline.length > 0 && (
              <div className="mt-6 rounded-3xl border border-zinc-200 bg-white p-6">
                <p className="text-[13px] font-bold uppercase tracking-[0.14em] text-zinc-500">
                  Payment timeline
                </p>

                <div className="mt-5 grid grid-cols-1 gap-3">
                  {receipt.timeline.map((step) => (
                    <div
                      key={step.id}
                      className="flex items-center gap-3"
                    >
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-700" />

                      <div className="flex flex-1 items-center justify-between gap-4">
                        <p className="text-[14px] font-semibold text-zinc-800">
                          {step.label}
                        </p>

                        {step.occurredAt && (
                          <p className="text-[11px] text-zinc-400">
                            {formatReceiptDate(step.occurredAt)}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
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
                    title="ArcScan transaction QR code"
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
                    Open on ArcScan
                  </p>
                </div>

                <p className="mt-3 text-[14px] leading-6 text-zinc-500">
                  Scan the QR code to open the public Arc Testnet transaction record.
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
                  Arc Testnet assets have no real-world value. This receipt records a testnet transaction for development and demonstration.
                </p>
              </div>
            )}
          </main>

          <footer className="border-t border-zinc-200 bg-zinc-950 px-10 py-6 text-white">
            <div className="flex items-end justify-between gap-8">
              <div>
                <p className="text-[14px] font-semibold">
                  TrustVault transaction receipt
                </p>

                <p className="mt-1 text-[12px] text-zinc-400">
                  {formatReceiptDate(
                    receipt.confirmedAt ?? receipt.createdAt,
                  )}
                </p>
              </div>

              <div className="text-right">
                <p className="text-[12px] font-semibold text-zinc-300">
                  Circle App Kit • Arc Testnet • USDC
                </p>

                <p className="mt-1 text-[12px] text-zinc-400">
                  Public transaction proof available on ArcScan
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

type PartyCardProps = {
  title: string;
  name: string;
  wallet?: string;
  detail?: string;
};

function PartyCard({
  title,
  name,
  wallet,
  detail,
}: PartyCardProps) {
  return (
    <div className="rounded-3xl border border-zinc-200 bg-white p-6">
      <p className="text-[13px] font-bold uppercase tracking-[0.14em] text-zinc-500">
        {title}
      </p>

      <p className="mt-3 text-[18px] font-bold text-zinc-950">
        {name}
      </p>

      {wallet && (
        <p className="mt-3 font-mono text-[12px] font-semibold text-zinc-600">
          {shortenReceiptValue(
            wallet,
            8,
            6,
          )}
        </p>
      )}

      {detail && (
        <p className="mt-2 text-[12px] leading-5 text-zinc-500">
          {detail}
        </p>
      )}
    </div>
  );
}
