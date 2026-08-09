"use client";

import {
  CheckCircle2,
  Copy,
  ExternalLink,
  Send,
} from "lucide-react";
import { useState } from "react";

import type { SendNowResult } from "@/lib/gift-vault/send-now";

export function SendNowReceipt({
  recipientName,
  message,
  result,
  onReset,
}: {
  recipientName: string;
  message: string;
  result: SendNowResult;
  onReset: () => void;
}) {
  const [copied, setCopied] = useState(false);

  async function copyHash() {
    await navigator.clipboard.writeText(result.txHash);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  }

  return (
    <section className="section-shell py-12 sm:py-16 lg:py-20">
      <div className="mx-auto max-w-3xl rounded-[2rem] border border-emerald-200 bg-white p-7 shadow-[var(--tv-shadow-md)] sm:p-9">
        <CheckCircle2 className="h-11 w-11 text-emerald-700" />

        <p className="mt-5 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
          Send Now confirmed
        </p>

        <h2 className="mt-2 text-4xl font-semibold tracking-[-0.05em] text-zinc-950">
          {result.amount} USDC sent.
        </h2>

        <p className="mt-3 text-sm leading-6 text-zinc-600">
          The direct Arc Testnet USDC transfer to {recipientName || "the recipient"} confirmed successfully.
        </p>

        <div className="mt-7 divide-y divide-zinc-200 rounded-2xl border border-zinc-200">
          {[
            ["Mode", "Send Now"],
            ["Network", "Arc Testnet"],
            ["Recipient", result.recipient],
            ["Amount", `${result.amount} USDC`],
            ["Block", result.blockNumber],
            ["Message", message || "No message added"],
          ].map(([label, value]) => (
            <div
              key={label}
              className="grid gap-1 px-4 py-4 sm:grid-cols-[8rem_1fr]"
            >
              <p className="text-xs font-medium text-zinc-500">{label}</p>
              <p className="break-all text-sm font-semibold text-zinc-950">
                {value}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-6 rounded-2xl bg-zinc-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-400">
            Transaction hash
          </p>
          <p className="mt-2 break-all font-mono text-[11px] text-zinc-700">
            {result.txHash}
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void copyHash()}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-zinc-300 bg-white px-4 text-xs font-semibold text-zinc-950"
            >
              <Copy className="h-4 w-4" />
              {copied ? "Copied" : "Copy hash"}
            </button>

            <a
              href={result.explorerUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full bg-zinc-950 px-4 text-xs font-semibold text-white"
            >
              Open on ArcScan
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        </div>

        <button
          type="button"
          onClick={onReset}
          className="mt-7 inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[var(--tv-brand)] px-5 text-sm font-semibold text-white"
        >
          <Send className="h-4 w-4" />
          Send another gift
        </button>
      </div>
    </section>
  );
}
