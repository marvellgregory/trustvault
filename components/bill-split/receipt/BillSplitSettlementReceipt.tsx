"use client";

import {
  ArrowLeft,
  CheckCircle2,
  Copy,
  Download,
  ExternalLink,
  Printer,
  ReceiptText,
  Share2,
  ShieldCheck,
  WalletCards,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import type { BillSplit } from "@/components/bill-split/types";
import { browserBillSplitRepository } from "@/lib/bill-split/bill-repository";

function shortAddress(value: string) {
  if (value.length < 15) return value;
  return `${value.slice(0, 8)}…${value.slice(-6)}`;
}

function shortHash(value: string) {
  if (value.length < 20) return value;
  return `${value.slice(0, 12)}…${value.slice(-10)}`;
}

function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export function BillSplitSettlementReceipt({
  billId,
}: {
  billId: string;
}) {
  const [bill, setBill] = useState<BillSplit | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    browserBillSplitRepository.findById(billId).then((record) => {
      if (!active) return;
      setBill(record);
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [billId]);

  const paidCount = useMemo(
    () =>
      bill?.participants.filter(
        (participant) => participant.status === "paid",
      ).length ?? 0,
    [bill],
  );

  const paymentCount = useMemo(
    () =>
      bill?.participants.filter(
        (participant) =>
          participant.settlementType === "onchain-usdc" &&
          participant.transactionHash,
      ).length ?? 0,
    [bill],
  );

  const settlementTime = useMemo(() => {
    if (!bill) return null;

    const timestamps = bill.participants
      .map((participant) => participant.paidAt)
      .filter((value): value is string => Boolean(value))
      .map((value) => new Date(value).getTime())
      .filter((value) => Number.isFinite(value));

    if (!timestamps.length) return bill.updatedAt;

    return new Date(Math.max(...timestamps)).toISOString();
  }, [bill]);

  async function copy(value: string, key: string) {
    await navigator.clipboard.writeText(value);
    setCopied(key);
    window.setTimeout(() => setCopied(null), 1200);
  }

  async function copyReceiptLink() {
    await copy(window.location.href, "link");
  }

  async function shareReceipt() {
    if (!bill) return;

    const shareData = {
      title: `TrustVault Bill Split ${bill.id}`,
      text: `${bill.title} — ${bill.totalAmount} USDC — ${paidCount}/${bill.participants.length} settled on Arc Testnet.`,
      url: window.location.href,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch {
        // User cancellation or unavailable share target: fall back to copy.
      }
    }

    await copyReceiptLink();
  }

  function printReceipt() {
    window.print();
  }

  function downloadReceiptText() {
    if (!bill) return;

    const lines = [
      "TRUSTVAULT BILL SPLIT SETTLEMENT RECEIPT",
      "",
      `Receipt ID: ${bill.id}`,
      `Bill: ${bill.title}`,
      `Total: ${bill.totalAmount} USDC`,
      `Network: ${bill.network}`,
      `Organizer: ${bill.organizerAddress}`,
      `Split method: ${bill.splitMethod}`,
      `Status: ${bill.status}`,
      `Created: ${bill.createdAt}`,
      `Settled: ${settlementTime ?? bill.updatedAt}`,
      "",
      "PARTICIPANTS",
      ...bill.participants.flatMap((participant, index) => [
        `${index + 1}. ${participant.name}`,
        `   Wallet: ${participant.walletAddress}`,
        `   Amount: ${participant.amount} USDC`,
        `   Status: ${participant.status}`,
        `   Settlement: ${participant.settlementType ?? "pending"}`,
        participant.transactionHash
          ? `   Transaction: ${participant.transactionHash}`
          : "   Transaction: Not applicable",
        participant.explorerUrl
          ? `   ArcScan: ${participant.explorerUrl}`
          : "   ArcScan: Not applicable",
      ]),
      "",
      "Arc Testnet assets have no real-world value.",
    ];

    const blob = new Blob([lines.join("\n")], {
      type: "text/plain;charset=utf-8",
    });

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${bill.id}-settlement-receipt.txt`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  if (loading) {
    return (
      <section className="section-shell py-16">
        <p className="text-center text-sm text-zinc-500">
          Loading settlement receipt…
        </p>
      </section>
    );
  }

  if (!bill) {
    return (
      <section className="section-shell py-16">
        <div className="mx-auto max-w-xl rounded-[2rem] border border-zinc-200 bg-white p-8 text-center shadow-[var(--tv-shadow-md)]">
          <h1 className="text-3xl font-semibold tracking-[-0.04em] text-zinc-950">
            Receipt not available.
          </h1>

          <p className="mt-3 text-sm leading-6 text-zinc-600">
            This Bill Split is not stored in this browser.
          </p>

          <Link
            href="/bill-split"
            className="mt-6 inline-flex min-h-11 items-center justify-center rounded-full bg-zinc-950 px-5 text-sm font-semibold text-white"
          >
            Back to Bill Split
          </Link>
        </div>
      </section>
    );
  }

  const isSettled = bill.status === "settled";

  return (
    <section className="section-shell py-10 sm:py-14 lg:py-16">
      <div className="mx-auto max-w-5xl">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <Link
            href={`/bill-split/manage/${encodeURIComponent(bill.id)}`}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-zinc-300 bg-white px-4 text-xs font-semibold text-zinc-950"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to bill
          </Link>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void shareReceipt()}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-zinc-300 bg-white px-4 text-xs font-semibold"
            >
              <Share2 className="h-4 w-4" />
              Share
            </button>

            <button
              type="button"
              onClick={() => void copyReceiptLink()}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-zinc-300 bg-white px-4 text-xs font-semibold"
            >
              <Copy className="h-4 w-4" />
              {copied === "link" ? "Copied" : "Copy link"}
            </button>

            <button
              type="button"
              onClick={downloadReceiptText}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-zinc-300 bg-white px-4 text-xs font-semibold"
            >
              <Download className="h-4 w-4" />
              Download
            </button>

            <button
              type="button"
              onClick={printReceipt}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full bg-zinc-950 px-4 text-xs font-semibold text-white"
            >
              <Printer className="h-4 w-4" />
              Print / Save PDF
            </button>
          </div>
        </div>

        <article className="overflow-hidden rounded-[2rem] border border-zinc-200 bg-white shadow-[var(--tv-shadow-md)] print:shadow-none">
          <header
            className={`border-b px-6 py-8 sm:px-8 lg:px-10 ${
              isSettled
                ? "border-emerald-200 bg-emerald-50"
                : "border-amber-200 bg-amber-50"
            }`}
          >
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  {isSettled ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-700" />
                  ) : (
                    <ReceiptText className="h-5 w-5 text-amber-700" />
                  )}

                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-600">
                    Bill Split settlement receipt
                  </p>
                </div>

                <h1 className="mt-4 text-4xl font-semibold tracking-[-0.05em] text-zinc-950 sm:text-5xl">
                  {isSettled
                    ? "Bill settled successfully."
                    : "Settlement in progress."}
                </h1>

                <p className="mt-3 text-sm leading-6 text-zinc-600">
                  {bill.title}
                </p>
              </div>

              <div className="rounded-2xl border border-white/80 bg-white/70 p-4 lg:min-w-56">
                <p className="text-xs font-medium text-zinc-500">
                  Receipt ID
                </p>
                <p className="mt-1 font-mono text-sm font-semibold text-zinc-950">
                  {bill.id}
                </p>
              </div>
            </div>
          </header>

          <div className="p-6 sm:p-8 lg:p-10">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <SummaryCard
                icon={ReceiptText}
                label="Total"
                value={`${bill.totalAmount} USDC`}
              />
              <SummaryCard
                icon={ShieldCheck}
                label="Network"
                value={bill.network}
              />
              <SummaryCard
                icon={WalletCards}
                label="Organizer"
                value={shortAddress(bill.organizerAddress)}
              />
              <SummaryCard
                icon={CheckCircle2}
                label="Settlement"
                value={`${paidCount}/${bill.participants.length} settled`}
              />
            </div>

            <div className="mt-8 rounded-3xl border border-zinc-200 bg-zinc-50 p-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <p className="text-xs text-zinc-500">Created</p>
                  <p className="mt-1 text-sm font-semibold text-zinc-950">
                    {formatDate(bill.createdAt)}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-zinc-500">Settled / updated</p>
                  <p className="mt-1 text-sm font-semibold text-zinc-950">
                    {formatDate(settlementTime ?? bill.updatedAt)}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-zinc-500">Split method</p>
                  <p className="mt-1 text-sm font-semibold text-zinc-950">
                    {bill.splitMethod === "equal"
                      ? "Equal split"
                      : "Custom split"}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-zinc-500">
                    Confirmed onchain payments
                  </p>
                  <p className="mt-1 text-sm font-semibold text-zinc-950">
                    {paymentCount}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-10">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-400">
                    Participant settlement
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-zinc-950">
                    Every share, one receipt.
                  </h2>
                </div>
              </div>

              <div className="mt-5 space-y-3">
                {bill.participants.map((participant) => (
                  <div
                    key={participant.id}
                    className="rounded-3xl border border-zinc-200 p-5"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-zinc-950">
                            {participant.name}
                          </p>

                          <span
                            className={`rounded-full px-3 py-1 text-[11px] font-semibold ${
                              participant.status === "paid"
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-zinc-100 text-zinc-600"
                            }`}
                          >
                            {participant.status === "paid"
                              ? participant.settlementType ===
                                "organizer-self-share"
                                ? "Self-settled"
                                : "Paid"
                              : "Pending"}
                          </span>
                        </div>

                        <p className="mt-2 break-all font-mono text-[11px] text-zinc-500">
                          {participant.walletAddress}
                        </p>

                        {participant.paidAt && (
                          <p className="mt-2 text-xs text-zinc-500">
                            Settled {formatDate(participant.paidAt)}
                          </p>
                        )}
                      </div>

                      <div className="lg:text-right">
                        <p className="text-lg font-semibold text-zinc-950">
                          {participant.amount} USDC
                        </p>
                      </div>
                    </div>

                    {participant.transactionHash ? (
                      <div className="mt-4 rounded-2xl bg-zinc-50 p-4">
                        <p className="text-xs text-zinc-500">
                          Transaction hash
                        </p>

                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <p className="font-mono text-[11px] text-zinc-700">
                            {shortHash(participant.transactionHash)}
                          </p>

                          <button
                            type="button"
                            onClick={() =>
                              void copy(
                                participant.transactionHash!,
                                participant.id,
                              )
                            }
                            className="inline-flex min-h-8 items-center justify-center gap-1 rounded-full border border-zinc-300 bg-white px-3 text-[11px] font-semibold print:hidden"
                          >
                            <Copy className="h-3.5 w-3.5" />
                            {copied === participant.id
                              ? "Copied"
                              : "Copy"}
                          </button>

                          {participant.explorerUrl && (
                            <a
                              href={participant.explorerUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex min-h-8 items-center justify-center gap-1 rounded-full border border-zinc-300 bg-white px-3 text-[11px] font-semibold"
                            >
                              ArcScan
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          )}
                        </div>
                      </div>
                    ) : (
                      participant.settlementType ===
                        "organizer-self-share" && (
                        <div className="mt-4 rounded-2xl bg-emerald-50 p-4">
                          <p className="text-xs leading-5 text-emerald-800">
                            Organizer self-share. No transfer was required.
                          </p>
                        </div>
                      )
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-8 rounded-3xl border border-blue-200 bg-blue-50 p-5">
              <div className="flex gap-3">
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-blue-800" />
                <div>
                  <p className="text-sm font-semibold text-blue-950">
                    Settlement verification
                  </p>
                  <p className="mt-1 text-xs leading-5 text-blue-800">
                    Onchain participant payments are individually verifiable
                    through the Arc Testnet explorer links above. Organizer
                    self-shares do not create redundant self-transfers.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-xs leading-5 text-amber-800">
                Arc Testnet assets have no real-world value. This receipt
                records testnet settlement activity only.
              </p>
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof ReceiptText;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
      <div className="flex items-center gap-2 text-zinc-500">
        <Icon className="h-4 w-4" />
        <p className="text-xs font-medium">{label}</p>
      </div>

      <p className="mt-3 break-all text-sm font-semibold text-zinc-950">
        {value}
      </p>
    </div>
  );
}
