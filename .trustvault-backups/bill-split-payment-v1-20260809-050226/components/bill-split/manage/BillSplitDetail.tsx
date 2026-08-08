"use client";

import { CheckCircle2, Clock3, Copy, ReceiptText, WalletCards } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import type { BillSplit } from "@/components/bill-split/types";
import { browserBillSplitRepository } from "@/lib/bill-split/bill-repository";

export function BillSplitDetail({ billId }: { billId: string }) {
  const [bill, setBill] = useState<BillSplit | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    browserBillSplitRepository.findById(billId).then((record) => {
      if (active) {
        setBill(record);
        setLoading(false);
      }
    });

    return () => {
      active = false;
    };
  }, [billId]);

  const paidCount = useMemo(
    () => bill?.participants.filter((participant) => participant.status === "paid").length ?? 0,
    [bill],
  );

  async function copy(value: string, key: string) {
    await navigator.clipboard.writeText(value);
    setCopied(key);
    window.setTimeout(() => setCopied(null), 1200);
  }

  if (loading) {
    return (
      <section className="section-shell py-16">
        <p className="text-center text-sm text-zinc-500">Loading Bill Split…</p>
      </section>
    );
  }

  if (!bill) {
    return (
      <section className="section-shell py-16">
        <div className="mx-auto max-w-xl rounded-[2rem] border border-zinc-200 bg-white p-8 text-center">
          <h1 className="text-3xl font-semibold tracking-[-0.04em]">Bill Split not found.</h1>
          <p className="mt-3 text-sm text-zinc-600">
            This browser does not have a saved Bill Split with ID {billId}.
          </p>
          <Link
            href="/bill-split"
            className="mt-6 inline-flex min-h-11 items-center justify-center rounded-full bg-zinc-950 px-5 text-sm font-semibold text-white"
          >
            Create a Bill Split
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="section-shell py-12 sm:py-16 lg:py-20">
      <div className="mx-auto max-w-5xl">
        <div className="rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-[var(--tv-shadow-md)] sm:p-8 lg:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--tv-brand)]">
            Bill Split
          </p>

          <div className="mt-3 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-4xl font-semibold tracking-[-0.05em] text-zinc-950">
                {bill.title}
              </h1>
              <p className="mt-3 font-mono text-xs text-zinc-500">{bill.id}</p>
            </div>

            <div className="text-left lg:text-right">
              <p className="text-3xl font-semibold tracking-[-0.04em]">{bill.totalAmount} USDC</p>
              <p className="mt-1 text-xs text-zinc-500">
                {paidCount}/{bill.participants.length} paid
              </p>
            </div>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <SummaryCard
              icon={WalletCards}
              label="Organizer"
              value={bill.organizerAddress}
            />
            <SummaryCard
              icon={ReceiptText}
              label="Split method"
              value={bill.splitMethod === "equal" ? "Equal split" : "Custom split"}
            />
          </div>

          <div className="mt-8 space-y-3">
            {bill.participants.map((participant) => {
              const paymentPath =
                `/bill-split/pay/${encodeURIComponent(bill.id)}/${encodeURIComponent(participant.id)}`;

              return (
                <div
                  key={participant.id}
                  className="rounded-3xl border border-zinc-200 p-5"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-zinc-950">
                          {participant.name}
                        </p>

                        <span className={`rounded-full px-3 py-1 text-[11px] font-semibold ${
                          participant.status === "paid"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-zinc-100 text-zinc-600"
                        }`}>
                          {participant.status === "paid" ? "Paid" : "Pending"}
                        </span>
                      </div>

                      <p className="mt-2 break-all font-mono text-[11px] text-zinc-500">
                        {participant.walletAddress}
                      </p>
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                      <p className="text-lg font-semibold text-zinc-950">
                        {participant.amount} USDC
                      </p>

                      <button
                        type="button"
                        onClick={() => void copy(
                          new URL(paymentPath, window.location.origin).toString(),
                          participant.id,
                        )}
                        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-zinc-300 px-4 text-xs font-semibold"
                      >
                        <Copy className="h-4 w-4" />
                        {copied === participant.id ? "Copied" : "Copy payment link"}
                      </button>
                    </div>
                  </div>

                  <p className="mt-3 text-xs leading-5 text-zinc-500">
                    Payment execution is intentionally disabled in Foundation V1.
                    The participant route is reserved for the next build.
                  </p>
                </div>
              );
            })}
          </div>

          <div className="mt-8 rounded-3xl border border-blue-200 bg-blue-50 p-5">
            <div className="flex gap-3">
              <Clock3 className="mt-0.5 h-5 w-5 shrink-0 text-blue-700" />
              <div>
                <p className="text-sm font-semibold text-blue-950">
                  Foundation created — no funds moved
                </p>
                <p className="mt-1 text-xs leading-5 text-blue-800">
                  This screen proves deterministic split calculation, local persistence,
                  participant obligations and organizer management. Real Arc Testnet
                  participant settlement is the next package.
                </p>
              </div>
            </div>
          </div>

          {bill.status === "settled" && (
            <div className="mt-6 flex items-center gap-2 rounded-2xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">
              <CheckCircle2 className="h-5 w-5" />
              Bill settled
            </div>
          )}
        </div>
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
      <p className="mt-3 break-all text-sm font-semibold text-zinc-950">{value}</p>
    </div>
  );
}
