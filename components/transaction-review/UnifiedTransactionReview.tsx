"use client";

import {
  CheckCircle2,
  Clock3,
  LoaderCircle,
  ShieldCheck,
} from "lucide-react";
import type { ReactNode } from "react";

export type TransactionProgressState =
  | "complete"
  | "active"
  | "pending";

export type TransactionSummaryItem = {
  label: string;
  value: string;
  mono?: boolean;
};

export type TransactionProgressItem = {
  label: string;
  state: TransactionProgressState;
};

function ProgressIcon({
  state,
}: {
  state: TransactionProgressState;
}) {
  if (state === "complete") {
    return (
      <CheckCircle2
        aria-hidden="true"
        className="h-4 w-4 text-emerald-700"
      />
    );
  }

  if (state === "active") {
    return (
      <LoaderCircle
        aria-hidden="true"
        className="h-4 w-4 animate-spin text-blue-700"
      />
    );
  }

  return (
    <Clock3
      aria-hidden="true"
      className="h-4 w-4 text-zinc-400"
    />
  );
}

export function UnifiedTransactionReview({
  eyebrow,
  title,
  description,
  summary,
  progress,
  confirmed,
  onConfirmedChange,
  confirmationText,
  confirmationDisabled = false,
  accent = "zinc",
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  summary: TransactionSummaryItem[];
  progress: TransactionProgressItem[];
  confirmed: boolean;
  onConfirmedChange: (confirmed: boolean) => void;
  confirmationText: string;
  confirmationDisabled?: boolean;
  accent?: "zinc" | "blue" | "rose";
  children?: ReactNode;
}) {
  const iconClass =
    accent === "blue"
      ? "bg-blue-50 text-blue-700"
      : accent === "rose"
        ? "bg-rose-50 text-[var(--tv-brand)]"
        : "bg-zinc-100 text-zinc-800";

  return (
    <div>
      <span
        className={`flex h-12 w-12 items-center justify-center rounded-2xl ${iconClass}`}
      >
        <ShieldCheck
          aria-hidden="true"
          className="h-5 w-5"
        />
      </span>

      <p className="mt-7 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
        {eyebrow}
      </p>

      <h2 className="mt-3 text-3xl font-semibold tracking-[-0.045em] text-zinc-950 sm:text-4xl">
        {title}
      </h2>

      <p className="mt-4 max-w-2xl text-base leading-8 text-zinc-600">
        {description}
      </p>

      <section className="mt-7 rounded-3xl border border-zinc-200 bg-zinc-50 p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-400">
          Transaction summary
        </p>

        <dl className="mt-4 divide-y divide-zinc-200 rounded-2xl border border-zinc-200 bg-white">
          {summary.map((item) => (
            <div
              key={item.label}
              className="grid gap-1 px-4 py-4 sm:grid-cols-[10rem_1fr] sm:items-center"
            >
              <dt className="text-xs font-medium text-zinc-500">
                {item.label}
              </dt>
              <dd
                className={`break-all text-sm font-semibold text-zinc-950 ${
                  item.mono ? "font-mono text-xs" : ""
                }`}
              >
                {item.value}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="mt-6 rounded-3xl border border-zinc-200 bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-400">
              Live transaction progress
            </p>
            <p className="mt-1 text-xs leading-5 text-zinc-500">
              TrustVault updates each stage from wallet and Arc-verifiable state.
            </p>
          </div>

          <span className="inline-flex min-h-8 items-center rounded-full border border-zinc-200 bg-zinc-50 px-3 text-xs font-semibold text-zinc-700">
            Arc Testnet
          </span>
        </div>

        <div className="mt-4 grid gap-2">
          {progress.map((item) => (
            <div
              key={item.label}
              className="flex items-center justify-between gap-4 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5"
            >
              <span className="text-xs font-medium text-zinc-700">
                {item.label}
              </span>
              <ProgressIcon state={item.state} />
            </div>
          ))}
        </div>
      </section>

      <label
        className={`mt-6 flex items-start gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 ${
          confirmationDisabled
            ? "cursor-not-allowed opacity-60"
            : "cursor-pointer"
        }`}
      >
        <input
          type="checkbox"
          checked={confirmed}
          disabled={confirmationDisabled}
          onChange={(event) =>
            onConfirmedChange(event.target.checked)
          }
          className="mt-1 h-4 w-4 rounded border-zinc-300 accent-zinc-950"
        />
        <span className="text-sm leading-6 text-zinc-700">
          {confirmationText}
        </span>
      </label>

      {children}
    </div>
  );
}
