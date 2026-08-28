import type {
  AtlasConversationContext,
  AtlasConversationReference,
} from "./atlas-conversation-context.js";
import type { AtlasIntent } from "./atlas-types.js";

export type AtlasFollowUpResolution = {
  intent: AtlasIntent;
  toolId: string;
  input: Record<string, string>;
};

function normalizedMessage(message: string): string {
  return message.trim().toLowerCase();
}

function refersToPreviousRecord(message: string): boolean {
  return /\b(that|this|it|its|same|previous|one)\b/i.test(message);
}

function resolveOrderFollowUp(
  message: string,
  reference: Extract<
    AtlasConversationReference,
    { type: "marketplace-order" }
  >,
): AtlasFollowUpResolution | null {
  const normalized = normalizedMessage(message);

  if (
    /\b(delivery|tracking|track|awb|waybill|courier|shipment|package)\b/.test(
      normalized,
    )
  ) {
    return {
      intent: "delivery-tracking",
      toolId: "get_my_order_delivery",
      input: { query: reference.id },
    };
  }

  if (
    reference.receiptId &&
    /\b(receipt|proof of payment)\b/.test(normalized)
  ) {
    return {
      intent: "receipt",
      toolId: "find_my_receipts",
      input: { query: reference.receiptId },
    };
  }

  if (
    /\b(order|purchase|status)\b/.test(normalized) &&
    refersToPreviousRecord(normalized)
  ) {
    return {
      intent: "marketplace-order",
      toolId: "find_my_marketplace_orders",
      input: { query: reference.id },
    };
  }

  return null;
}

function resolveReceiptFollowUp(
  message: string,
  reference: Extract<AtlasConversationReference, { type: "receipt" }>,
): AtlasFollowUpResolution | null {
  const normalized = normalizedMessage(message);

  if (
    /\breceipt\b/.test(normalized) &&
    refersToPreviousRecord(normalized)
  ) {
    return {
      intent: "receipt",
      toolId: "find_my_receipts",
      input: { query: reference.id },
    };
  }

  return null;
}

function resolveGiftFollowUp(
  message: string,
  reference: Extract<AtlasConversationReference, { type: "gift" }>,
): AtlasFollowUpResolution | null {
  const normalized = normalizedMessage(message);

  if (
    /\bgift\b/.test(normalized) &&
    refersToPreviousRecord(normalized)
  ) {
    return {
      intent: "gift",
      toolId: "find_my_gifts",
      input: { giftId: reference.id },
    };
  }

  return null;
}

function resolveBillSplitFollowUp(
  message: string,
  reference: Extract<AtlasConversationReference, { type: "bill-split" }>,
): AtlasFollowUpResolution | null {
  const normalized = normalizedMessage(message);

  if (
    /\b(bill split|split|bill|status)\b/.test(normalized) &&
    refersToPreviousRecord(normalized)
  ) {
    return {
      intent: "bill-split",
      toolId: "find_my_bill_splits",
      input: { query: reference.id },
    };
  }

  return null;
}

export function resolveAtlasFollowUp(
  message: string,
  conversation?: AtlasConversationContext,
): AtlasFollowUpResolution | null {
  const reference = conversation?.reference;

  if (!reference || !message.trim()) return null;

  switch (reference.type) {
    case "marketplace-order":
      return resolveOrderFollowUp(message, reference);

    case "receipt":
      return resolveReceiptFollowUp(message, reference);

    case "gift":
      return resolveGiftFollowUp(message, reference);

    case "bill-split":
      return resolveBillSplitFollowUp(message, reference);

    default:
      return null;
  }
}
