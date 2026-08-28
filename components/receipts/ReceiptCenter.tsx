"use client";

import {
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  Clock3,
  Copy,
  ExternalLink,
  Gift,
  LoaderCircle,
  MoreHorizontal,
  ReceiptText,
  RefreshCw,
  Search,
  ShoppingBag,
  SlidersHorizontal,
  Split,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type {
  ReceiptTransactionStatus,
  ReceiptTransactionType,
  TransactionReceiptData,
} from "@/components/receipts/receipt-types";
import {
  browserReceiptStore,
  createReceiptPath,
  type StoredReceipt,
} from "@/lib/receipts/receipt-store";

type CenterStatus = "loading" | "ready" | "empty" | "error";
type TypeFilter = "all" | "purchase" | "gift" | "bill-split";
type StatusFilter = "all" | ReceiptTransactionStatus;
type DateFilter = "all" | "7" | "30" | "90";

const typeLabels: Partial<Record<ReceiptTransactionType, string>> = {
  purchase: "Marketplace",
  gift: "Gift Vault",
  "bill-split": "Bill Split",
};

const statusLabels: Record<ReceiptTransactionStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  failed: "Failed",
  refunded: "Refunded",
};

export function ReceiptCenter() {
  const [status, setStatus] = useState<CenterStatus>("loading");
  const [receipts, setReceipts] = useState<StoredReceipt[]>([]);
  const [isClearing, setIsClearing] = useState(false);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");

  const loadReceipts = useCallback(async () => {
    setStatus("loading");
    try {
      const storedReceipts = await browserReceiptStore.findAll();
      setReceipts(storedReceipts);
      setStatus(storedReceipts.length > 0 ? "ready" : "empty");
    } catch {
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => {
      loadReceipts();
    }, 0);

    return () => {
      window.clearTimeout(initialLoad);
    };
  }, [loadReceipts]);

  function resetFilters() {
    setQuery("");
    setTypeFilter("all");
    setStatusFilter("all");
    setDateFilter("all");
  }

  async function handleClearHistory() {
    const confirmed = window.confirm(
      "Remove all locally saved TrustVault receipts from this browser? This does not affect any underlying transaction.",
    );
    if (!confirmed) return;

    setIsClearing(true);
    try {
      await browserReceiptStore.clear();
      setReceipts([]);
      setStatus("empty");
      resetFilters();
    } finally {
      setIsClearing(false);
    }
  }

  const filteredReceipts = useMemo(
    () =>
      receipts.filter((storedReceipt) => {
        const receipt = storedReceipt.receipt;

        if (typeFilter !== "all" && receipt.type !== typeFilter) return false;
        if (statusFilter !== "all" && receipt.status !== statusFilter) return false;

        if (
          dateFilter !== "all" &&
          !isWithinDays(receipt.confirmedAt ?? receipt.createdAt, Number(dateFilter))
        ) {
          return false;
        }

        const normalizedQuery = query.trim().toLowerCase();
        return !normalizedQuery || createSearchText(receipt).includes(normalizedQuery);
      }),
    [receipts, query, typeFilter, statusFilter, dateFilter],
  );

  const activeFilterCount = [
    typeFilter !== "all",
    statusFilter !== "all",
    dateFilter !== "all",
  ].filter(Boolean).length;

  if (status === "loading") {
    return (
      <CenterState
        icon={LoaderCircle}
        title="Loading receipts"
        description="TrustVault is retrieving saved transaction receipts from this browser."
        isLoading
      />
    );
  }

  if (status === "error") {
    return (
      <CenterState
        icon={CircleAlert}
        title="Receipt history unavailable"
        description="TrustVault could not load the locally saved transaction history."
        actionLabel="Try again"
        onAction={loadReceipts}
      />
    );
  }

  if (status === "empty") {
    return (
      <CenterState
        icon={ReceiptText}
        eyebrow="Receipt Center"
        title="No receipts yet"
        description="Supported TrustVault transaction records will appear here after a receipt is created and saved in this browser."
        actionLabel="Explore Marketplace"
        actionHref="/marketplace"
      />
    );
  }

  return (
    <section className="section-shell py-12 sm:py-16 lg:py-20">
      <div className="mx-auto max-w-7xl">
        <div className="border-b border-zinc-200 pb-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--tv-brand)]">
                Receipt Center
              </p>
              <h1 className="mt-3 text-4xl font-semibold tracking-[-0.05em] text-zinc-950 sm:text-5xl">
                Your transaction records, in one place.
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-8 text-zinc-600">
                Search and review locally saved TrustVault receipts, then open the full
                Enterprise Receipt for transaction details and available verification information.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex min-h-10 items-center rounded-full border border-zinc-200 bg-white px-4 text-xs font-semibold text-zinc-700">
                {receipts.length} saved {receipts.length === 1 ? "receipt" : "receipts"}
              </span>
              <button
                type="button"
                onClick={loadReceipts}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-zinc-300 bg-white px-4 text-xs font-semibold text-zinc-800 transition hover:border-zinc-400 hover:bg-zinc-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>
            </div>
          </div>
        </div>

        <div className="mt-8 rounded-[2rem] border border-zinc-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto_auto_auto]">
            <label className="relative block">
              <span className="sr-only">Search receipts</span>
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
              />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search receipt ID, merchant, transaction hash or order reference"
                className="min-h-12 w-full rounded-2xl border border-zinc-200 bg-zinc-50 pl-11 pr-10 text-sm text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-zinc-400 focus:bg-white focus:ring-2 focus:ring-zinc-950/5"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  aria-label="Clear receipt search"
                  className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-zinc-500 transition hover:bg-zinc-200 hover:text-zinc-950"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </label>

            <FilterSelect
              label="Type"
              value={typeFilter}
              onChange={(value) => setTypeFilter(value as TypeFilter)}
              options={[
                ["all", "All types"],
                ["purchase", "Marketplace"],
                ["gift", "Gift Vault"],
                ["bill-split", "Bill Split"],
              ]}
            />
            <FilterSelect
              label="Status"
              value={statusFilter}
              onChange={(value) => setStatusFilter(value as StatusFilter)}
              options={[
                ["all", "All statuses"],
                ["confirmed", "Confirmed"],
                ["pending", "Pending"],
                ["failed", "Failed"],
                ["refunded", "Refunded"],
              ]}
            />
            <FilterSelect
              label="Date"
              value={dateFilter}
              onChange={(value) => setDateFilter(value as DateFilter)}
              options={[
                ["all", "All dates"],
                ["7", "Last 7 days"],
                ["30", "Last 30 days"],
                ["90", "Last 90 days"],
              ]}
            />
          </div>

          <div className="mt-4 flex flex-col gap-3 border-t border-zinc-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
              <SlidersHorizontal className="h-4 w-4" />
              <span className="font-semibold text-zinc-800">{filteredReceipts.length}</span>
              <span>{filteredReceipts.length === 1 ? "receipt" : "receipts"} shown</span>
              {activeFilterCount > 0 && (
                <span className="rounded-full bg-zinc-100 px-2.5 py-1 font-semibold text-zinc-700">
                  {activeFilterCount} active {activeFilterCount === 1 ? "filter" : "filters"}
                </span>
              )}
            </div>

            {(query || activeFilterCount > 0) && (
              <button
                type="button"
                onClick={resetFilters}
                className="self-start text-xs font-semibold text-zinc-700 underline decoration-zinc-300 underline-offset-4 transition hover:text-zinc-950 sm:self-auto"
              >
                Reset filters
              </button>
            )}
          </div>
        </div>

        <div className="mt-8">
          {filteredReceipts.length === 0 ? (
            <NoResultsState query={query} onReset={resetFilters} />
          ) : (
            <>
              <div className="hidden border-b border-zinc-200 px-4 pb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500 lg:grid lg:grid-cols-[minmax(0,1.7fr)_minmax(190px,1fr)_140px_130px_minmax(160px,0.9fr)_120px] lg:gap-5">
                <span>Type & merchant</span>
                <span>Receipt</span>
                <span>Network</span>
                <span>Status</span>
                <span className="text-right">Amount</span>
                <span className="text-right">Action</span>
              </div>

              <div className="divide-y divide-zinc-200 overflow-hidden rounded-[1.75rem] border border-zinc-200 bg-white shadow-sm">
                {filteredReceipts.map((storedReceipt) => (
                  <ReceiptLedgerRow
                    key={storedReceipt.receipt.id}
                    storedReceipt={storedReceipt}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        <div className="mt-8 flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-xs leading-6 text-zinc-600 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-3xl">
            This Receipt Center currently reads receipts saved in this browser.
            It does not claim cross-device account synchronization.
          </p>
          <button
            type="button"
            onClick={handleClearHistory}
            disabled={isClearing}
            className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 self-start rounded-full border border-rose-200 bg-white px-4 font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-wait disabled:opacity-60 sm:self-auto"
          >
            {isClearing ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            Clear local history
          </button>
        </div>
      </div>
    </section>
  );
}

function ReceiptLedgerRow({ storedReceipt }: { storedReceipt: StoredReceipt }) {
  const { receipt } = storedReceipt;
  const [menuOpen, setMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!menuOpen) return;

    function closeMenu(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", closeMenu);
    return () => document.removeEventListener("mousedown", closeMenu);
  }, [menuOpen]);

  const merchant = getReceiptCounterparty(receipt);
  const displayId = receipt.displayId || receipt.id;

  async function copyReceiptId() {
    await navigator.clipboard.writeText(displayId);
    setCopied(true);
    setMenuOpen(false);
    window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <article className="group relative transition hover:bg-zinc-50">
      <div className="p-4 sm:p-5 lg:grid lg:grid-cols-[minmax(0,1.7fr)_minmax(190px,1fr)_140px_130px_minmax(160px,0.9fr)_120px] lg:items-center lg:gap-5">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-zinc-700">
            {renderReceiptIcon(receipt.type)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-zinc-950">
              {merchant}
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              {getTypeLabel(receipt.type)}
            </p>
            <p className="mt-2 text-xs text-zinc-400 lg:hidden">
              {formatDate(receipt.confirmedAt ?? receipt.createdAt)}
            </p>
          </div>
        </div>

        <div className="mt-4 min-w-0 lg:mt-0">
          <p className="truncate font-mono text-xs font-semibold text-zinc-700">
            {displayId}
          </p>
          <p className="mt-1 hidden text-xs text-zinc-400 lg:block">
            {formatDate(receipt.confirmedAt ?? receipt.createdAt)}
          </p>
          {receipt.transactionHash && (
            <p className="mt-1 truncate font-mono text-[11px] text-zinc-400">
              {shortHash(receipt.transactionHash)}
            </p>
          )}
        </div>

        <div className="mt-4 flex items-center justify-between gap-4 lg:mt-0 lg:block">
          <span className="text-xs font-semibold text-zinc-700">{receipt.network}</span>
          <div className="lg:hidden">
            <ReceiptStatusBadge status={receipt.status} />
          </div>
        </div>

        <div className="hidden lg:block">
          <ReceiptStatusBadge status={receipt.status} />
        </div>

        <div className="mt-4 flex items-end justify-between gap-4 border-t border-zinc-100 pt-4 lg:mt-0 lg:block lg:border-0 lg:pt-0 lg:text-right">
          <div>
            <p className="text-base font-semibold tracking-[-0.02em] text-zinc-950">
              {formatAmount(receipt.amount)} {receipt.asset}
            </p>
            {receipt.rewards && receipt.rewards.pointsAwarded > 0 && (
              <p className="mt-1 text-xs font-semibold text-emerald-700">
                +{receipt.rewards.pointsAwarded} TrustPoints
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 lg:hidden">
            <Link
              href={createReceiptPath(receipt.id)}
              className="inline-flex min-h-10 items-center justify-center rounded-full bg-zinc-950 px-4 text-xs font-semibold text-white transition hover:bg-zinc-800"
            >
              View receipt
            </Link>
            <ReceiptMenu
              receipt={receipt}
              displayId={displayId}
              menuOpen={menuOpen}
              copied={copied}
              menuRef={menuRef}
              onToggle={() => setMenuOpen((value) => !value)}
              onCopy={copyReceiptId}
            />
          </div>
        </div>

        <div className="relative mt-4 hidden items-center justify-end gap-2 lg:flex">
          <Link
            href={createReceiptPath(receipt.id)}
            className="inline-flex min-h-10 items-center justify-center rounded-full bg-zinc-950 px-4 text-xs font-semibold text-white transition hover:bg-zinc-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2"
          >
            View
          </Link>
          <ReceiptMenu
            receipt={receipt}
            displayId={displayId}
            menuOpen={menuOpen}
            copied={copied}
            menuRef={menuRef}
            onToggle={() => setMenuOpen((value) => !value)}
            onCopy={copyReceiptId}
          />
        </div>
      </div>
    </article>
  );
}

function ReceiptMenu({
  receipt,
  displayId,
  menuOpen,
  copied,
  menuRef,
  onToggle,
  onCopy,
}: {
  receipt: TransactionReceiptData;
  displayId: string;
  menuOpen: boolean;
  copied: boolean;
  menuRef: React.RefObject<HTMLDivElement | null>;
  onToggle: () => void;
  onCopy: () => void;
}) {
  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={menuOpen}
        aria-label={`More actions for ${displayId}`}
        className="flex h-10 w-10 items-center justify-center rounded-full border border-zinc-300 bg-white text-zinc-700 transition hover:bg-zinc-100"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>

      {menuOpen && (
        <div className="absolute right-0 top-12 z-20 w-52 overflow-hidden rounded-2xl border border-zinc-200 bg-white p-1.5 shadow-xl">
          <button
            type="button"
            onClick={onCopy}
            className="flex min-h-10 w-full items-center gap-3 rounded-xl px-3 text-left text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100"
          >
            {copied ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-700" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
            {copied ? "Receipt ID copied" : "Copy receipt ID"}
          </button>

          {receipt.explorerUrl && (
            <a
              href={receipt.explorerUrl}
              target="_blank"
              rel="noreferrer"
              className="flex min-h-10 w-full items-center gap-3 rounded-xl px-3 text-left text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100"
            >
              <ExternalLink className="h-4 w-4" />
              Open on ArcScan
            </a>
          )}
        </div>
      )}
    </div>
  );
}

function ReceiptStatusBadge({ status }: { status: ReceiptTransactionStatus }) {
  const config = {
    confirmed: {
      icon: CheckCircle2,
      className: "border-emerald-200 bg-emerald-50 text-emerald-800",
    },
    pending: {
      icon: Clock3,
      className: "border-amber-200 bg-amber-50 text-amber-800",
    },
    failed: {
      icon: CircleAlert,
      className: "border-rose-200 bg-rose-50 text-rose-800",
    },
    refunded: {
      icon: RefreshCw,
      className: "border-sky-200 bg-sky-50 text-sky-800",
    },
  }[status];

  const Icon = config.icon;

  return (
    <span
      className={`inline-flex min-h-8 items-center gap-1.5 rounded-full border px-2.5 text-[11px] font-semibold ${config.className}`}
    >
      <Icon className="h-3.5 w-3.5" />
      {statusLabels[status]}
    </span>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<[string, string]>;
}) {
  return (
    <label className="relative block min-w-40">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-12 w-full appearance-none rounded-2xl border border-zinc-200 bg-white pl-4 pr-10 text-xs font-semibold text-zinc-700 outline-none transition hover:bg-zinc-50 focus:border-zinc-400 focus:ring-2 focus:ring-zinc-950/5"
      >
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>
      <ChevronDown
        aria-hidden="true"
        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
      />
    </label>
  );
}

function NoResultsState({
  query,
  onReset,
}: {
  query: string;
  onReset: () => void;
}) {
  return (
    <div className="rounded-[2rem] border border-zinc-200 bg-white px-6 py-16 text-center shadow-sm sm:px-10">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-700">
        <Search className="h-6 w-6" />
      </span>
      <h2 className="mt-5 text-2xl font-semibold tracking-[-0.04em] text-zinc-950">
        No receipts match your search
      </h2>
      <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-zinc-600">
        {query.trim()
          ? `No locally saved receipt matches "${query.trim()}". Check the search text or reset the active filters.`
          : "No locally saved receipt matches the active filters."}
      </p>
      <button
        type="button"
        onClick={onReset}
        className="mt-6 inline-flex min-h-11 items-center justify-center rounded-full bg-zinc-950 px-5 text-sm font-semibold text-white transition hover:bg-zinc-800"
      >
        Reset all filters
      </button>
    </div>
  );
}

type CenterStateProps = {
  icon: typeof ReceiptText;
  eyebrow?: string;
  title: string;
  description: string;
  isLoading?: boolean;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
};

function CenterState({
  icon: Icon,
  eyebrow,
  title,
  description,
  isLoading = false,
  actionLabel,
  actionHref,
  onAction,
}: CenterStateProps) {
  return (
    <section className="section-shell py-20 sm:py-24 lg:py-32">
      <div className="mx-auto max-w-xl rounded-[2rem] border border-zinc-200 bg-white p-8 text-center shadow-[var(--tv-shadow-md)] sm:p-10">
        {eyebrow && (
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--tv-brand)]">
            {eyebrow}
          </p>
        )}
        <span className="mx-auto mt-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-700">
          <Icon
            aria-hidden="true"
            className={`h-6 w-6 ${isLoading ? "animate-spin" : ""}`}
          />
        </span>
        <h1 className="mt-6 text-3xl font-semibold tracking-[-0.04em] text-zinc-950">
          {title}
        </h1>
        <p className="mt-4 text-sm leading-7 text-zinc-600">{description}</p>
        {actionLabel &&
          (actionHref ? (
            <Link
              href={actionHref}
              className="mt-7 inline-flex min-h-11 items-center justify-center rounded-full bg-zinc-950 px-5 text-sm font-semibold text-white transition hover:bg-zinc-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-4"
            >
              {actionLabel}
            </Link>
          ) : (
            <button
              type="button"
              onClick={onAction}
              className="mt-7 inline-flex min-h-11 items-center justify-center rounded-full bg-zinc-950 px-5 text-sm font-semibold text-white transition hover:bg-zinc-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-4"
            >
              {actionLabel}
            </button>
          ))}
      </div>
    </section>
  );
}

function renderReceiptIcon(type: ReceiptTransactionType) {
  switch (type) {
    case "gift":
      return <Gift aria-hidden="true" className="h-4 w-4" />;
    case "bill-split":
      return <Split aria-hidden="true" className="h-4 w-4" />;
    case "purchase":
      return <ShoppingBag aria-hidden="true" className="h-4 w-4" />;
    default:
      return <ReceiptText aria-hidden="true" className="h-4 w-4" />;
  }
}

function getTypeLabel(type: ReceiptTransactionType) {
  return (
    typeLabels[type] ??
    `${type
      .replaceAll("-", " ")
      .replace(/\b\w/g, (value) => value.toUpperCase())} receipt`
  );
}

function getReceiptCounterparty(receipt: TransactionReceiptData) {
  if (receipt.type === "purchase") {
    return (
      receipt.seller?.storeName ||
      receipt.seller?.displayName ||
      receipt.recipientName ||
      "TrustVault Marketplace"
    );
  }

  if (receipt.type === "gift") {
    return receipt.recipientName || receipt.title || "Gift Vault";
  }

  if (receipt.type === "bill-split") {
    return receipt.title || "Bill Split";
  }

  return receipt.title || "TrustVault receipt";
}

function createSearchText(receipt: TransactionReceiptData) {
  return [
    receipt.id,
    receipt.displayId,
    receipt.title,
    receipt.description,
    receipt.orderId,
    receipt.billSplitId,
    receipt.giftVaultId,
    receipt.transactionHash,
    receipt.network,
    receipt.recipientName,
    receipt.customer?.displayName,
    receipt.customer?.email,
    receipt.seller?.displayName,
    receipt.seller?.storeName,
    receipt.seller?.settlementWallet,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function isWithinDays(value: string, days: number) {
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) return false;

  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return timestamp >= cutoff;
}

function shortHash(value: string) {
  if (value.length <= 18) return value;
  return `${value.slice(0, 8)}...${value.slice(-6)}`;
}

function formatAmount(value: string) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return value;

  return amount.toLocaleString(undefined, {
    maximumFractionDigits: 6,
  });
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
