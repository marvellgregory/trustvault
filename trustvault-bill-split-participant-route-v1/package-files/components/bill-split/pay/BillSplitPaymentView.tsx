"use client";

import {
  ArrowLeft,
  Copy,
  ReceiptText,
  ShieldCheck,
  WalletCards,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAccount } from "wagmi";

import type {
  BillSplit,
  BillSplitParticipant,
} from "@/components/bill-split/types";
import { browserBillSplitRepository } from "@/lib/bill-split/bill-repository";

function shortAddress(value: string) {
  if (value.length < 12) return value;
  return `${value.slice(0, 7)}…${value.slice(-5)}`;
}

function sameAddress(left?: string, right?: string) {
  if (!left || !right) return false;
  return left.toLowerCase() === right.toLowerCase();
}

export function BillSplitPaymentView({
  billId,
  participantId,
}: {
  billId: string;
  participantId: string;
}) {
  const { address, isConnected } = useAccount();

  const [bill, setBill] = useState<BillSplit | null>(null);
  const [participant, setParticipant] =
    useState<BillSplitParticipant | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;

    async function load() {
      const record =
        await browserBillSplitRepository.findById(billId);

      if (!active) return;

      setBill(record);

      setParticipant(
        record?.participants.find(
          (row) => row.id === participantId,
        ) ?? null,
      );

      setLoading(false);
    }

    void load();

    return () => {
      active = false;
    };
  }, [billId, participantId]);

  const walletMatches = useMemo(
    () => sameAddress(address, participant?.walletAddress),
    [address, participant?.walletAddress],
  );

  async function copyOrganizerWallet() {
    if (!bill) return;
    await navigator.clipboard.writeText(
      bill.organizerAddress,
    );
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  }

  if (loading) {
    return (
      <section className="section-shell py-16">
        <p className="text-center text-sm text-zinc-500">
          Loading payment obligation…
        </p>
      </section>
    );
  }

  if (!bill || !participant) {
    return (
      <section className="section-shell py-16">
        <div className="mx-auto max-w-xl rounded-[2rem] border border-zinc-200 bg-white p-8 text-center shadow-[var(--tv-shadow-md)]">
          <h1 className="text-3xl font-semibold tracking-[-0.04em] text-zinc-950">
            Payment link not available.
          </h1>

          <p className="mt-3 text-sm leading-6 text-zinc-600">
            This Bill Split is not stored in this browser.
            Foundation V1 uses local browser storage, so a
            participant link currently works only in the browser
            where the bill was created.
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

  return (
    <section className="section-shell py-12 sm:py-16 lg:py-20">
      <div className="mx-auto max-w-3xl">
        <div className="rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-[var(--tv-shadow-md)] sm:p-8 lg:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--tv-brand)]">
            Bill Split payment
          </p>

          <h1 className="mt-3 text-4xl font-semibold tracking-[-0.05em] text-zinc-950">
            {participant.name}, your share is{" "}
            {participant.amount} USDC.
          </h1>

          <p className="mt-4 text-sm leading-7 text-zinc-600">
            Bill: <strong>{bill.title}</strong>
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <InfoCard
              icon={ReceiptText}
              label="Bill ID"
              value={bill.id}
            />

            <InfoCard
              icon={WalletCards}
              label="Expected participant wallet"
              value={shortAddress(
                participant.walletAddress,
              )}
            />
          </div>

          <div className="mt-6 rounded-3xl border border-zinc-200 bg-zinc-50 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-400">
              Organizer settlement wallet
            </p>

            <p className="mt-3 break-all font-mono text-xs font-semibold text-zinc-800">
              {bill.organizerAddress}
            </p>

            <button
              type="button"
              onClick={() => void copyOrganizerWallet()}
              className="mt-4 inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-zinc-300 bg-white px-4 text-xs font-semibold text-zinc-950"
            >
              <Copy className="h-4 w-4" />
              {copied ? "Copied" : "Copy organizer wallet"}
            </button>
          </div>

          <div
            className={`mt-6 rounded-3xl border p-5 ${
              !isConnected
                ? "border-amber-200 bg-amber-50"
                : walletMatches
                  ? "border-emerald-200 bg-emerald-50"
                  : "border-rose-200 bg-rose-50"
            }`}
          >
            <div className="flex items-start gap-3">
              <ShieldCheck
                className={`mt-0.5 h-5 w-5 shrink-0 ${
                  !isConnected
                    ? "text-amber-700"
                    : walletMatches
                      ? "text-emerald-700"
                      : "text-rose-700"
                }`}
              />

              <div>
                <p className="text-sm font-semibold text-zinc-950">
                  {!isConnected
                    ? "Connect the participant wallet"
                    : walletMatches
                      ? "Participant wallet verified"
                      : "Different wallet connected"}
                </p>

                <p className="mt-1 text-xs leading-5 text-zinc-700">
                  {!isConnected
                    ? "Use the TrustVault wallet control in the header to connect."
                    : walletMatches
                      ? `Connected wallet ${shortAddress(address ?? "")} matches this participant obligation.`
                      : `This payment obligation belongs to ${shortAddress(participant.walletAddress)}.`}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-3xl border border-blue-200 bg-blue-50 p-5">
            <p className="text-sm font-semibold text-blue-950">
              Payment execution is not enabled yet.
            </p>

            <p className="mt-1 text-xs leading-5 text-blue-800">
              This patch fixes the 404 and gives every copied
              payment link a real participant payment page.
              The next Bill Split payment package will add the
              Arc Testnet USDC transfer, transaction recovery,
              confirmation, paid state and receipt.
            </p>
          </div>

          <div className="mt-8 border-t border-zinc-200 pt-6">
            <Link
              href={`/bill-split/manage/${encodeURIComponent(bill.id)}`}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-zinc-300 px-5 text-sm font-semibold text-zinc-950"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to bill
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function InfoCard({
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
        <p className="text-xs font-medium">
          {label}
        </p>
      </div>

      <p className="mt-3 break-all text-sm font-semibold text-zinc-950">
        {value}
      </p>
    </div>
  );
}
