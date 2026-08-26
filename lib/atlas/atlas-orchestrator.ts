import { createAtlasGrounding } from "./atlas-grounding.js";
import { classifyAtlasIntent, extractGiftId } from "./atlas-intent.js";
import type {
  AtlasBillSplitRecord,
  AtlasGiftRecord,
  AtlasMarketplaceOrderRecord,
  AtlasReceiptRecord,
} from "./atlas-customer-context.js";
import type { AtlasOrderDeliveryResult } from "./atlas-delivery.js";
import type { AtlasToolResult } from "./atlas-result.js";
import { getVerifiedSupportOptions } from "./atlas-support.js";
import type { AtlasToolContext } from "./atlas-tool.js";
import { AtlasToolRegistry } from "./atlas-tool-registry.js";
import { ALL_ATLAS_TOOLS } from "./atlas-tools.js";
import type {
  AtlasAction,
  AtlasEvidence,
  AtlasIntent,
  AtlasResponsePlan,
} from "./atlas-types.js";

type RecordMatchData<T> = {
  matches: readonly T[];
  matchCount: number;
};

function supportActions(topic: string): AtlasAction[] {
  return getVerifiedSupportOptions(topic)
    .slice(0, 3)
    .map((option) => ({
      type: "support" as const,
      label: option.label,
      optionId: option.id,
      destination: option.destination,
    }));
}

function unavailablePlan(
  intent: AtlasIntent,
  answer: string,
  historyRoute?: string,
): AtlasResponsePlan {
  return {
    intent,
    answer,
    grounding: createAtlasGrounding("UNAVAILABLE", []),
    actions: [
      ...(historyRoute
        ? [{ type: "navigate" as const, label: "Open history", route: historyRoute }]
        : []),
      ...supportActions(intent),
    ],
    visualState: "warning",
    visualSequence: ["thinking", "warning"],
  };
}

function authorizationPlan(intent: AtlasIntent): AtlasResponsePlan {
  return unavailablePlan(
    intent,
    "Please authenticate your TrustVault account before I look up private customer records. A connected wallet by itself does not authorize that access.",
  );
}

function privateFailurePlan(
  result: Extract<AtlasToolResult, { ok: false }>,
  intent: AtlasIntent,
  unavailableAnswer: string,
  historyRoute?: string,
): AtlasResponsePlan {
  if (result.code === "AUTHORIZATION_REQUIRED") return authorizationPlan(intent);
  const plan = unavailablePlan(intent, unavailableAnswer, historyRoute);
  if (result.code === "EXECUTION_FAILED") {
    return {
      ...plan,
      visualState: "error",
      visualSequence: ["thinking", "error"],
    };
  }
  return plan;
}

function verifiedPlan(input: {
  intent: AtlasIntent;
  answer: string;
  evidence: readonly AtlasEvidence[];
  actions: readonly AtlasAction[];
  data: unknown;
  partial?: boolean;
}): AtlasResponsePlan {
  return {
    intent: input.intent,
    answer: input.answer,
    grounding: createAtlasGrounding(
      input.partial ? "PARTIAL" : "VERIFIED",
      input.evidence,
    ),
    actions: input.actions,
    visualState: "speaking",
    visualSequence: ["thinking", "speaking"],
    data: input.data,
  };
}

function actionFromEvidence(evidence: AtlasEvidence): AtlasAction {
  return {
    type: "navigate",
    label: `Open ${evidence.sourceTitle}`,
    route: evidence.sourceRoute,
  };
}

function isRecordMatchData<T>(value: unknown): value is RecordMatchData<T> {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<RecordMatchData<T>>;
  return Array.isArray(candidate.matches) && typeof candidate.matchCount === "number";
}

function planOrder(
  result: AtlasToolResult,
): AtlasResponsePlan {
  if (!result.ok) {
    return privateFailurePlan(
      result,
      "marketplace-order",
      "I couldn't access your Marketplace orders right now.",
      "/marketplace",
    );
  }
  if (!isRecordMatchData<AtlasMarketplaceOrderRecord>(result.data)) {
    return unavailablePlan("marketplace-order", "I couldn't verify an order from the available records.");
  }
  if (result.data.matchCount === 0) {
    return unavailablePlan(
      "marketplace-order",
      "I couldn't find a Marketplace order matching that in the records available to this account.",
      "/marketplace",
    );
  }
  const orders = result.data.matches;
  const answer =
    orders.length === 1
      ? `I found Marketplace order ${orders[0].orderNumber}. Its status is ${orders[0].status}.`
      : `I found ${orders.length} Marketplace orders that match. Which order number do you mean?`;
  return verifiedPlan({
    intent: "marketplace-order",
    answer,
    evidence: result.evidence,
    actions: result.evidence.map(actionFromEvidence),
    data: result.data,
  });
}

function planReceipt(result: AtlasToolResult): AtlasResponsePlan {
  if (!result.ok) {
    return privateFailurePlan(
      result,
      "receipt",
      "I couldn't access your receipts right now.",
      "/receipts",
    );
  }
  if (!isRecordMatchData<AtlasReceiptRecord>(result.data) || result.data.matchCount === 0) {
    return unavailablePlan(
      "receipt",
      "I couldn't find a receipt matching that in the records available to this account.",
      "/receipts",
    );
  }
  const receipts = result.data.matches;
  return verifiedPlan({
    intent: "receipt",
    answer:
      receipts.length === 1
        ? `I found your ${receipts[0].title} receipt.`
        : `I found ${receipts.length} matching receipts. Which one do you mean?`,
    evidence: result.evidence,
    actions: result.evidence.map(actionFromEvidence),
    data: result.data,
  });
}

function planGift(result: AtlasToolResult): AtlasResponsePlan {
  if (!result.ok) {
    return privateFailurePlan(
      result,
      "gift",
      "I couldn't access that Gift Vault record right now.",
      "/gift-vault/manage",
    );
  }
  if (!isRecordMatchData<AtlasGiftRecord>(result.data) || result.data.matchCount === 0) {
    return unavailablePlan(
      "gift",
      "I couldn't find that Gift Vault record among records authorized for this account.",
      "/gift-vault/manage",
    );
  }
  const gift = result.data.matches[0];
  return verifiedPlan({
    intent: "gift",
    answer: `I found Gift Vault ${gift.id}.`,
    evidence: result.evidence,
    actions: result.evidence.map(actionFromEvidence),
    data: result.data,
  });
}

function planBillSplit(result: AtlasToolResult): AtlasResponsePlan {
  if (!result.ok) {
    return privateFailurePlan(
      result,
      "bill-split",
      "I couldn't access your Bill Splits right now.",
      "/bill-split",
    );
  }
  if (!isRecordMatchData<AtlasBillSplitRecord>(result.data) || result.data.matchCount === 0) {
    return unavailablePlan(
      "bill-split",
      "I couldn't find a Bill Split matching that in the records available to this account.",
      "/bill-split",
    );
  }
  const bills = result.data.matches;
  const answer =
    bills.length === 1
      ? `I found your ${bills[0].title} Bill Split. ${bills[0].settledShareCount} of ${bills[0].participantCount} shares are settled.`
      : `I found ${bills.length} Bill Splits that match: ${bills.map((bill) => bill.title).join(" or ")}. Which one do you mean?`;
  return verifiedPlan({
    intent: "bill-split",
    answer,
    evidence: result.evidence,
    actions: result.evidence.map(actionFromEvidence),
    data: result.data,
  });
}

function isDeliveryResult(value: unknown): value is AtlasOrderDeliveryResult {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as Partial<AtlasOrderDeliveryResult>).trackingStatus === "string"
  );
}

function planDelivery(result: AtlasToolResult): AtlasResponsePlan {
  if (!result.ok) {
    return privateFailurePlan(
      result,
      "delivery-tracking",
      "I couldn't access delivery details for your orders right now.",
    );
  }
  if (!isDeliveryResult(result.data)) {
    return unavailablePlan(
      "delivery-tracking",
      "I couldn't identify one owned order for that delivery lookup.",
    );
  }
  const delivery = result.data;
  const actions: AtlasAction[] = [
    { type: "navigate", label: "Open order", route: delivery.orderRoute },
  ];
  if (delivery.officialTrackingDestination) {
    actions.push({
      type: "external-navigation",
      label: "Open official tracking",
      destination: delivery.officialTrackingDestination,
    });
  }
  if (delivery.trackingStatus === "overdue-unavailable") {
    actions.push(...supportActions("delivery tracking"));
  }
  const answer =
    delivery.trackingStatus === "assigned"
      ? `I found the tracking number for ${delivery.orderNumber}: ${delivery.trackingNumber}.`
      : delivery.trackingStatus === "pending"
        ? `Tracking number pending. ${delivery.policyExplanation}`
        : "The tracking information is not currently available, and the expected 48-working-hour window has passed.";
  return verifiedPlan({
    intent: "delivery-tracking",
    answer,
    evidence: result.evidence,
    actions,
    data: delivery,
    partial: delivery.trackingStatus !== "assigned",
  });
}

const PRIVATE_PLANNERS: Record<string, (result: AtlasToolResult) => AtlasResponsePlan> = {
  find_my_marketplace_orders: planOrder,
  find_my_receipts: planReceipt,
  find_my_gifts: planGift,
  find_my_bill_splits: planBillSplit,
  get_my_order_delivery: planDelivery,
};

export class AtlasOrchestrator {
  readonly #registry: AtlasToolRegistry;

  constructor(registry = new AtlasToolRegistry(ALL_ATLAS_TOOLS)) {
    this.#registry = registry;
  }

  async plan(
    message: string,
    context: AtlasToolContext,
  ): Promise<AtlasResponsePlan> {
    const classification = classifyAtlasIntent(message);

    if (classification.toolId) {
      const input =
        classification.intent === "gift"
          ? { giftId: extractGiftId(message) ?? "" }
          : { query: message };
      const result = await this.#registry.execute(
        classification.toolId,
        context,
        input,
      );
      return PRIVATE_PLANNERS[classification.toolId](result);
    }

    if (classification.intent === "support") {
      const actions = supportActions(message);
      return {
        intent: "support",
        answer: "Here are the verified TrustVault support options most relevant to you.",
        grounding: createAtlasGrounding("VERIFIED", [
          {
            sourceId: "contact",
            sourceTitle: "Contact TrustVault",
            sourceRoute: "/contact",
            sourceType: "contact",
            excerpt: "Verified TrustVault support destinations.",
          },
        ]),
        actions,
        visualState: "support",
        visualSequence: ["thinking", "support"],
      };
    }

    if (classification.intent === "activity") {
      return unavailablePlan(
        "activity",
        "I couldn't verify a complete authenticated activity source in the current TrustVault architecture.",
      );
    }

    const result = await this.#registry.execute(
      "search_trustvault_knowledge",
      context,
      { query: message },
    );
    if (!result.ok || result.evidence.length === 0) {
      return unavailablePlan(
        classification.intent,
        "I couldn't verify that from the information currently available in TrustVault. I don't want to guess.",
      );
    }
    return verifiedPlan({
      intent: classification.intent,
      answer: result.evidence[0].excerpt,
      evidence: result.evidence,
      actions: result.evidence.map(actionFromEvidence),
      data: result.data,
    });
  }
}
