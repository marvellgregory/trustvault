import type { AtlasIntent } from "./atlas-types.js";

export type AtlasIntentClassification = {
  intent: AtlasIntent;
  requiresPrivateData: boolean;
  toolId?: string;
};

const PRIVATE_INTENTS: Partial<Record<AtlasIntent, string>> = {
  "marketplace-order": "find_my_marketplace_orders",
  receipt: "find_my_receipts",
  gift: "find_my_gifts",
  "bill-split": "find_my_bill_splits",
  "delivery-tracking": "get_my_order_delivery",
};

export function classifyAtlasIntent(message: string): AtlasIntentClassification {
  const normalized = message.trim().toLowerCase();
  let intent: AtlasIntent;

  if (/\b(awb|waybill|consignment|courier|delivery|tracking)\b/.test(normalized)) {
    intent = "delivery-tracking";
  } else if (/\b(receipt|receipts)\b/.test(normalized)) {
    intent = "receipt";
  } else if (/\b(gift|gifts|gift vault)\b/.test(normalized)) {
    intent = "gift";
  } else if (/\b(bill split|split bill|dinner bill|bill splits)\b/.test(normalized)) {
    intent = "bill-split";
  } else if (/\b(order|orders|purchase)\b/.test(normalized)) {
    intent = "marketplace-order";
  } else if (/\b(activity|recent activity|history)\b/.test(normalized)) {
    intent = "activity";
  } else if (/\b(help|support|contact)\b/.test(normalized)) {
    intent = "support";
  } else if (/\b(open|go to|take me to|navigate)\b/.test(normalized)) {
    intent = "navigation";
  } else if (/\b(why|wrong|failed|problem|issue)\b/.test(normalized)) {
    intent = "diagnosis";
  } else if (/\b(page|route|where am i)\b/.test(normalized)) {
    intent = "route-context";
  } else if (normalized.length > 0) {
    intent = "knowledge";
  } else {
    intent = "unknown";
  }

  const toolId = PRIVATE_INTENTS[intent];
  return {
    intent,
    requiresPrivateData: Boolean(toolId) || intent === "activity",
    ...(toolId ? { toolId } : {}),
  };
}

export function extractGiftId(message: string): string | null {
  return message.match(/\b(?:gift(?: vault)?\s*)?#?(\d+)\b/i)?.[1] ?? null;
}

