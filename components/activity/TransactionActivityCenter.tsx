"use client";

import {
  CheckCircle2,
  Clock3,
  ExternalLink,
  Gift,
  LoaderCircle,
  ReceiptText,
  RefreshCcw,
  ShoppingBag,
  Split,
  WalletCards,
} from "lucide-react";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useAccount, usePublicClient } from "wagmi";

import {
  browserBillSplitRepository,
} from "@/lib/bill-split/bill-repository";
import {
  ARC_TESTNET_EXPLORER_URL,
  TRUSTVAULT_GIFT_VAULT_ADDRESS,
} from "@/lib/gift-vault/contract";
import {
  formatGiftAmount,
  formatGiftUnlockFromChain,
  isSameAddress,
  shortAddress,
} from "@/lib/gift-vault/gift-display";
import {
  listRecentGifts,
  type IndexedGift,
} from "@/lib/gift-vault/list-gifts";
import {
  browserOrderRepository,
} from "@/lib/marketplace/repository/order-repository";
import {
  browserReceiptStore,
  createReceiptPath,
} from "@/lib/receipts/receipt-store";

type ActivityFilter =
  | "all"
  | "marketplace"
  | "gifts"
  | "bill-split";

type ActivityStatus =
  | "confirmed"
  | "pending"
  | "locked"
  | "claimable"
  | "claimed";

type ActivityKind =
  | "receipt"
  | "marketplace-order"
  | "timed-gift"
  | "bill-split";

type ActivityItem = {
  id: string;
  kind: ActivityKind;
  filter: Exclude<ActivityFilter, "all">;
  title: string;
  description: string;
  amount?: string;
  status: ActivityStatus;
  timestamp: string;
  counterparty?: string;
  transactionHash?: string;
  explorerUrl?: string;
  primaryHref?: string;
  primaryLabel?: string;
  sourceLabel: string;
};

function safeTime(value?: string) {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
}

function receiptFilter(type: string): Exclude<ActivityFilter, "all"> {
  if (type === "purchase") return "marketplace";
  if (type === "bill-split") return "bill-split";
  return "gifts";
}

function receiptStatus(status: string): ActivityStatus {
  return status === "confirmed" ? "confirmed" : "pending";
}

function orderStatus(status: string): ActivityStatus {
  return [
    "paid",
    "escrow-funded",
    "processing",
    "packed",
    "shipped",
    "out-for-delivery",
    "delivered",
    "completed",
  ].includes(status)
    ? "confirmed"
    : "pending";
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function statusClasses(status: ActivityStatus) {
  if (
    status === "confirmed" ||
    status === "claimed"
  ) {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }

  if (status === "claimable") {
    return "border-blue-200 bg-blue-50 text-blue-800";
  }

  if (status === "locked") {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }

  return "border-zinc-200 bg-zinc-100 text-zinc-700";
}

function statusLabel(status: ActivityStatus) {
  if (status === "confirmed") return "Confirmed";
  if (status === "claimable") return "Claimable";
  if (status === "claimed") return "Claimed";
  if (status === "locked") return "Locked";
  return "Pending";
}

function iconFor(item: ActivityItem) {
  if (item.filter === "marketplace") {
    return ShoppingBag;
  }

  if (item.filter === "bill-split") {
    return Split;
  }

  return Gift;
}

export function TransactionActivityCenter() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();

  const [filter, setFilter] =
    useState<ActivityFilter>("all");

  const [items, setItems] =
    useState<ActivityItem[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const timeZone = useMemo(() => {
    try {
      return (
        Intl.DateTimeFormat().resolvedOptions().timeZone ||
        "UTC"
      );
    } catch {
      return "UTC";
    }
  }, []);

  const loadActivity = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [
        storedReceipts,
        marketplaceOrders,
        bills,
        timedGifts,
      ] = await Promise.all([
        browserReceiptStore.findAll(),
        browserOrderRepository.findAll(),
        browserBillSplitRepository.findAll(),
        publicClient
          ? listRecentGifts(publicClient, {
              limit: 100,
            })
          : Promise.resolve([] as IndexedGift[]),
      ]);

      const next: ActivityItem[] = [];

      for (const stored of storedReceipts) {
        const receipt = stored.receipt;

        const title =
          receipt.type === "purchase"
            ? receipt.seller?.storeName ||
              receipt.seller?.displayName ||
              "Marketplace purchase"
            : receipt.type === "bill-split"
              ? receipt.title || "Bill Split settlement"
              : receipt.title ||
                receipt.recipientName ||
                "Gift transaction";

        next.push({
          id: `receipt:${receipt.id}`,
          kind: "receipt",
          filter: receiptFilter(receipt.type),
          title,
          description:
            receipt.description ||
            `${receipt.network} ${receipt.asset} transaction receipt`,
          amount: receipt.amount
            ? `${receipt.amount} ${receipt.asset}`
            : undefined,
          status: receiptStatus(receipt.status),
          timestamp:
            receipt.confirmedAt ??
            receipt.createdAt,
          counterparty:
            receipt.type === "purchase"
              ? receipt.seller?.storeName ||
                receipt.seller?.displayName
              : receipt.recipientName,
          transactionHash:
            receipt.transactionHash,
          explorerUrl:
            receipt.explorerUrl,
          primaryHref:
            createReceiptPath(receipt.id),
          primaryLabel: "View receipt",
          sourceLabel: "Saved receipt",
        });
      }

      for (const order of marketplaceOrders) {
        const alreadyRepresented =
          order.receipt?.receiptId &&
          storedReceipts.some(
            (stored) =>
              stored.receipt.id ===
              order.receipt?.receiptId,
          );

        if (alreadyRepresented) {
          continue;
        }

        next.push({
          id: `order:${order.id}`,
          kind: "marketplace-order",
          filter: "marketplace",
          title:
            order.seller.storeName ||
            order.seller.displayName ||
            "Marketplace order",
          description: `Order ${order.orderNumber}`,
          amount: `${order.totals.total.amount} USDC`,
          status: orderStatus(order.status),
          timestamp: order.updatedAt,
          counterparty:
            order.seller.storeName ||
            order.seller.displayName,
          transactionHash:
            order.payment.transactionHash,
          explorerUrl:
            order.payment.explorerUrl,
          primaryHref:
            `/orders/${encodeURIComponent(order.id)}`,
          primaryLabel: "View order",
          sourceLabel: "Marketplace repository",
        });
      }

      if (address) {
        for (const bill of bills) {
          const relevant =
            isSameAddress(
              bill.organizerAddress,
              address,
            ) ||
            bill.participants.some(
              (participant) =>
                isSameAddress(
                  participant.walletAddress,
                  address,
                ),
            );

          if (!relevant) continue;

          const paidParticipants =
            bill.participants.filter(
              (participant) =>
                participant.status === "paid",
            );

          const onchainPaid =
            paidParticipants.filter(
              (participant) =>
                Boolean(
                  participant.transactionHash,
                ),
            );

          next.push({
            id: `bill:${bill.id}`,
            kind: "bill-split",
            filter: "bill-split",
            title: bill.title,
            description:
              `${paidParticipants.length}/${bill.participants.length} shares settled`,
            amount: `${bill.totalAmount} USDC`,
            status:
              bill.status === "settled"
                ? "confirmed"
                : "pending",
            timestamp: bill.updatedAt,
            counterparty:
              isSameAddress(
                bill.organizerAddress,
                address,
              )
                ? "Organizer"
                : "Participant",
            transactionHash:
              onchainPaid[0]
                ?.transactionHash,
            explorerUrl:
              onchainPaid[0]?.explorerUrl,
            primaryHref:
              `/bill-split/manage/${encodeURIComponent(bill.id)}`,
            primaryLabel: "Manage bill",
            sourceLabel: "Bill Split repository",
          });
        }

        for (const gift of timedGifts) {
          const isSender = isSameAddress(
            gift.sender,
            address,
          );

          const isRecipient = isSameAddress(
            gift.recipient,
            address,
          );

          if (!isSender && !isRecipient) {
            continue;
          }

          let claimable = false;

          if (
            !gift.claimed &&
            publicClient
          ) {
            try {
              claimable = Boolean(
                await publicClient.readContract({
                  address:
                    TRUSTVAULT_GIFT_VAULT_ADDRESS,
                  abi: (
                    await import(
                      "@/lib/gift-vault/contract"
                    )
                  ).giftVaultAbi,
                  functionName: "isClaimable",
                  args: [gift.giftId],
                }),
              );
            } catch {
              claimable = false;
            }
          }

          const unlock =
            formatGiftUnlockFromChain(
              gift.unlockTimestamp,
              timeZone,
            );

          next.push({
            id: `gift:${gift.giftId.toString()}`,
            kind: "timed-gift",
            filter: "gifts",
            title:
              `Timed Gift Vault #${gift.giftId.toString()}`,
            description: gift.claimed
              ? "Gift claimed from the deployed Gift Vault contract"
              : claimable
                ? "Gift is now claimable"
                : `Locked until ${unlock.local}`,
            amount:
              `${formatGiftAmount(gift.amount)} USDC`,
            status: gift.claimed
              ? "claimed"
              : claimable
                ? "claimable"
                : "locked",
            timestamp:
              new Date(
                Number(gift.unlockTimestamp) *
                  1000,
              ).toISOString(),
            counterparty:
              isSender
                ? `To ${shortAddress(gift.recipient)}`
                : `From ${shortAddress(gift.sender)}`,
            primaryHref:
              `/gift-vault/manage/${gift.giftId.toString()}`,
            primaryLabel: "View gift",
            explorerUrl:
              `${ARC_TESTNET_EXPLORER_URL}/address/${TRUSTVAULT_GIFT_VAULT_ADDRESS}`,
            sourceLabel: "Arc Testnet contract",
          });
        }
      }

      next.sort(
        (left, right) =>
          safeTime(right.timestamp) -
          safeTime(left.timestamp),
      );

      setItems(next);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "TrustVault activity could not be loaded.",
      );
    } finally {
      setLoading(false);
    }
  }, [
    address,
    publicClient,
    timeZone,
  ]);

  useEffect(() => {
    void loadActivity();
  }, [loadActivity]);

  const filtered = useMemo(
    () =>
      filter === "all"
        ? items
        : items.filter(
            (item) =>
              item.filter === filter,
          ),
    [filter, items],
  );

  const metrics = useMemo(() => {
    const marketplace =
      items.filter(
        (item) =>
          item.filter === "marketplace",
      ).length;

    const gifts =
      items.filter(
        (item) =>
          item.filter === "gifts",
      ).length;

    const bills =
      items.filter(
        (item) =>
          item.filter === "bill-split",
      ).length;

    const confirmed =
      items.filter(
        (item) =>
          item.status === "confirmed" ||
          item.status === "claimed",
      ).length;

    return {
      marketplace,
      gifts,
      bills,
      confirmed,
      total: items.length,
    };
  }, [items]);

  return (
    <section className="section-shell py-10 sm:py-14 lg:py-16">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-6 border-b border-zinc-200 pb-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--tv-brand)]">
              TrustVault activity
            </p>

            <h1 className="mt-3 text-4xl font-semibold tracking-[-0.05em] text-zinc-950 sm:text-5xl">
              One timeline for every trusted transaction.
            </h1>

            <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-600">
              Review saved receipts, Marketplace orders, Bill Split
              settlements and contract-backed timed gifts without creating a
              second transaction database.
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              void loadActivity()
            }
            disabled={loading}
            className="inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-full border border-zinc-300 bg-white px-5 text-sm font-semibold text-zinc-950 disabled:opacity-50 lg:self-auto"
          >
            <RefreshCcw
              className={`h-4 w-4 ${
                loading ? "animate-spin" : ""
              }`}
            />
            Refresh activity
          </button>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <MetricCard
            label="All activity"
            value={String(metrics.total)}
            detail="Known local + onchain records"
          />
          <MetricCard
            label="Marketplace"
            value={String(metrics.marketplace)}
            detail="Orders and receipts"
          />
          <MetricCard
            label="Timed gifts"
            value={String(metrics.gifts)}
            detail="Arc contract-backed"
          />
          <MetricCard
            label="Bill Splits"
            value={String(metrics.bills)}
            detail="Settlement records"
          />
          <MetricCard
            label="Confirmed"
            value={String(metrics.confirmed)}
            detail="Confirmed or claimed"
          />
        </div>

        <div className="mt-8 rounded-[2rem] border border-zinc-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-zinc-200 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-2xl font-semibold tracking-[-0.04em] text-zinc-950">
                Activity timeline
              </h2>
              <p className="mt-1 text-sm text-zinc-500">
                Newest verifiable or locally stored activity first.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <FilterButton
                active={filter === "all"}
                onClick={() =>
                  setFilter("all")
                }
              >
                All
              </FilterButton>
              <FilterButton
                active={
                  filter === "marketplace"
                }
                onClick={() =>
                  setFilter("marketplace")
                }
              >
                Marketplace
              </FilterButton>
              <FilterButton
                active={filter === "gifts"}
                onClick={() =>
                  setFilter("gifts")
                }
              >
                Gifts
              </FilterButton>
              <FilterButton
                active={
                  filter === "bill-split"
                }
                onClick={() =>
                  setFilter("bill-split")
                }
              >
                Bill Split
              </FilterButton>
            </div>
          </div>

          {!isConnected ? (
            <EmptyState
              icon={WalletCards}
              title="Connect a wallet for complete activity."
              description="Saved browser receipts and orders may still exist locally, but wallet-specific Bill Splits and timed Gift Vaults require the connected wallet."
            />
          ) : loading ? (
            <EmptyState
              icon={LoaderCircle}
              title="Building your TrustVault timeline…"
              description="Reading local repositories and reconciling recent timed gifts from Arc Testnet."
              spinning
            />
          ) : error ? (
            <EmptyState
              icon={RefreshCcw}
              title="Activity could not be loaded."
              description={error}
            />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={ReceiptText}
              title="No activity in this view yet."
              description="Complete a Marketplace purchase, timed gift or Bill Split settlement and the supported record will appear here."
            />
          ) : (
            <div className="divide-y divide-zinc-200">
              {filtered.map((item) => (
                <ActivityRow
                  key={item.id}
                  item={item}
                />
              ))}
            </div>
          )}
        </div>

        <div className="mt-6 rounded-3xl border border-blue-200 bg-blue-50 p-5 text-sm leading-6 text-blue-900">
          <p className="font-semibold">
            Activity provenance
          </p>
          <p className="mt-1">
            Marketplace and Bill Split entries come from TrustVault browser
            repositories, saved receipt entries come from the Receipt Center,
            and timed Gift Vault status is read from the deployed Arc Testnet
            contract. Direct Send Now transfers are shown only when a saved
            receipt or persisted activity record exists; TrustVault does not
            fabricate wallet history.
          </p>
        </div>
      </div>
    </section>
  );
}

function MetricCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-400">
        {label}
      </p>
      <p className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-zinc-950">
        {value}
      </p>
      <p className="mt-2 text-xs leading-5 text-zinc-500">
        {detail}
      </p>
    </div>
  );
}

function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex min-h-9 items-center justify-center rounded-full px-4 text-xs font-semibold transition ${
        active
          ? "bg-zinc-950 text-white"
          : "border border-zinc-300 bg-white text-zinc-700 hover:border-zinc-400"
      }`}
    >
      {children}
    </button>
  );
}

function ActivityRow({
  item,
}: {
  item: ActivityItem;
}) {
  const Icon = iconFor(item);

  return (
    <article className="p-5 transition hover:bg-zinc-50 sm:p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 gap-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-700">
            <Icon className="h-5 w-5" />
          </span>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate text-base font-semibold text-zinc-950">
                {item.title}
              </p>

              <span
                className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusClasses(item.status)}`}
              >
                {statusLabel(item.status)}
              </span>
            </div>

            <p className="mt-1 text-sm text-zinc-600">
              {item.description}
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-zinc-500">
              <span>
                {formatDate(item.timestamp)}
              </span>

              {item.counterparty && (
                <span>
                  {item.counterparty}
                </span>
              )}

              <span className="rounded-full bg-zinc-100 px-2.5 py-1 font-semibold text-zinc-600">
                {item.sourceLabel}
              </span>
            </div>

            {item.transactionHash && (
              <p className="mt-3 max-w-xl truncate font-mono text-[11px] text-zinc-400">
                {item.transactionHash}
              </p>
            )}
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2 lg:justify-end">
          {item.amount && (
            <p className="mr-2 text-lg font-semibold tracking-[-0.03em] text-zinc-950">
              {item.amount}
            </p>
          )}

          {item.primaryHref && (
            <Link
              href={item.primaryHref}
              className="inline-flex min-h-10 items-center justify-center rounded-full bg-zinc-950 px-4 text-xs font-semibold text-white"
            >
              {item.primaryLabel ||
                "View"}
            </Link>
          )}

          {item.explorerUrl && (
            <a
              href={item.explorerUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-zinc-300 bg-white px-4 text-xs font-semibold text-zinc-950"
            >
              ArcScan
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
      </div>
    </article>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
  spinning,
}: {
  icon: typeof ReceiptText;
  title: string;
  description: string;
  spinning?: boolean;
}) {
  return (
    <div className="p-10 text-center sm:p-14">
      <Icon
        className={`mx-auto h-7 w-7 text-zinc-500 ${
          spinning ? "animate-spin" : ""
        }`}
      />
      <p className="mt-4 text-base font-semibold text-zinc-950">
        {title}
      </p>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-zinc-600">
        {description}
      </p>
    </div>
  );
}
