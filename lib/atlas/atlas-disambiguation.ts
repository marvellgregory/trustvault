import type {
  AtlasBillSplitRecord,
  AtlasGiftRecord,
  AtlasMarketplaceOrderRecord,
  AtlasReceiptRecord,
} from "./atlas-customer-context.js";
import { formatAtlasRecordDate, formatAtlasStatus } from "./atlas-response-style";
import type { AtlasDisambiguationChoice } from "./atlas-types.js";

export function createOrderChoices(
  orders: readonly AtlasMarketplaceOrderRecord[],
): readonly AtlasDisambiguationChoice[] {
  return orders.map((order) => ({
    id: order.id,
    label: order.orderNumber,
    description: [
      formatAtlasRecordDate(order.createdAt),
      order.sellerName || "Seller unavailable",
      `${order.totalAmount} ${order.asset}`,
    ].join(" · "),
    action: {
      type: "navigate",
      label: `Open ${order.orderNumber}`,
      route: `/orders/${encodeURIComponent(order.id)}`,
    },
  }));
}

export function createBillSplitChoices(
  bills: readonly AtlasBillSplitRecord[],
): readonly AtlasDisambiguationChoice[] {
  return bills.map((bill) => ({
    id: bill.id,
    label: bill.title,
    description: `${formatAtlasRecordDate(bill.createdAt)} · ${formatAtlasStatus(bill.status)}`,
    action: {
      type: "navigate",
      label: `Open ${bill.title}`,
      route: `/bill-split/manage/${encodeURIComponent(bill.id)}`,
    },
  }));
}

export function createReceiptChoices(
  receipts: readonly AtlasReceiptRecord[],
): readonly AtlasDisambiguationChoice[] {
  return receipts.map((receipt) => ({
    id: receipt.id,
    label: receipt.title,
    description: `${formatAtlasRecordDate(receipt.createdAt)} · ${receipt.amount} ${receipt.asset}`,
    action: {
      type: "navigate",
      label: `Open ${receipt.title}`,
      route: `/receipt/${encodeURIComponent(receipt.id)}`,
    },
  }));
}

function safeRecipientLabel(address: string): string {
  return address.length >= 12
    ? `${address.slice(0, 6)}…${address.slice(-4)}`
    : "Recipient available in Gift Vault";
}

export function createGiftChoices(
  gifts: readonly AtlasGiftRecord[],
): readonly AtlasDisambiguationChoice[] {
  return gifts.map((gift) => ({
    id: gift.id,
    label: `Gift Vault ${gift.id}`,
    description: `${formatAtlasRecordDate(gift.createdAt)} · ${safeRecipientLabel(gift.recipientAddress)}`,
    action: {
      type: "navigate",
      label: `Open Gift Vault ${gift.id}`,
      route: `/gift-vault/manage/${encodeURIComponent(gift.id)}`,
    },
  }));
}

