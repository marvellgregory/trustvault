"use client";

import {
  Check,
  LockKeyhole,
  Package,
} from "lucide-react";
import Link from "next/link";
import type {
  ComponentType,
  ReactNode,
} from "react";

type IconComponent = ComponentType<{
  "aria-hidden"?: boolean | "true" | "false";
  className?: string;
}>;

type ReviewCardProps = {
  icon: IconComponent;
  eyebrow: string;
  title: string;
  children: ReactNode;
};

export function ReviewCard({
  icon: Icon,
  eyebrow,
  title,
  children,
}: ReviewCardProps) {
  return (
    <section className="rounded-[2rem] border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-800">
          <Icon aria-hidden="true" className="h-5 w-5" />
        </span>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-400">
            {eyebrow}
          </p>
          <h2 className="mt-1 text-xl font-semibold tracking-[-0.035em] text-zinc-950">
            {title}
          </h2>
        </div>
      </div>
      {children}
    </section>
  );
}

export function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-zinc-500">{label}</dt>
      <dd className="font-semibold text-zinc-950">{value}</dd>
    </div>
  );
}

export function ProtectionRow({ label, complete }: { label: string; complete: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3">
      <span className="text-sm font-medium text-zinc-700">{label}</span>
      <span className={`flex h-7 w-7 items-center justify-center rounded-full ${
        complete ? "bg-emerald-100 text-emerald-700" : "bg-zinc-200 text-zinc-500"
      }`}>
        {complete ? <Check className="h-4 w-4" /> : <LockKeyhole className="h-3.5 w-3.5" />}
      </span>
    </div>
  );
}

type PaymentReviewStateProps = {
  icon?: IconComponent;
  title: string;
  description: string;
  isLoading?: boolean;
  actionLabel?: string;
  onAction?: () => void;
};

export function PaymentReviewState({
  icon: Icon = Package,
  title,
  description,
  isLoading = false,
  actionLabel,
  onAction,
}: PaymentReviewStateProps) {
  return (
    <section className="section-shell py-20 sm:py-24 lg:py-32">
      <div className="mx-auto max-w-xl rounded-[2rem] border border-zinc-200 bg-white p-8 text-center shadow-[var(--tv-shadow-md)] sm:p-10">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-700">
          <Icon aria-hidden="true" className={`h-6 w-6 ${isLoading ? "animate-spin" : ""}`} />
        </span>
        <h1 className="mt-6 text-3xl font-semibold tracking-[-0.04em] text-zinc-950">{title}</h1>
        <p className="mt-4 text-sm leading-7 text-zinc-600">{description}</p>
        {actionLabel && (
          <button
            type="button"
            onClick={onAction}
            className="mt-7 inline-flex min-h-11 items-center justify-center rounded-full bg-zinc-950 px-5 text-sm font-semibold text-white transition hover:bg-zinc-800"
          >
            {actionLabel}
          </button>
        )}
        {!isLoading && (
          <Link
            href="/checkout"
            className="mt-5 block text-sm font-semibold text-zinc-600 transition hover:text-zinc-950"
          >
            Return to checkout
          </Link>
        )}
      </div>
    </section>
  );
}
