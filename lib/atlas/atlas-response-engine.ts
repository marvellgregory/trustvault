import type {
  AtlasBillSplitRecord,
  AtlasCustomerDataSource,
  AtlasGiftRecord,
  AtlasMarketplaceOrderRecord,
  AtlasReceiptRecord,
} from "./atlas-customer-context.js";
import {
  createBillSplitChoices,
  createGiftChoices,
  createOrderChoices,
  createReceiptChoices,
} from "./atlas-disambiguation";
import type { AtlasOrderDeliveryResult } from "./atlas-delivery.js";
import { createAtlasFeatureResponse } from "./atlas-feature-responses";
import { createAtlasGrounding } from "./atlas-grounding";
import type { AtlasIntentClassification } from "./atlas-intent.js";
import { isControlledArcScanTransactionUrl } from "./atlas-navigation";
import { classifyAtlasIssue } from "./atlas-resolution";
import type { AtlasToolResult } from "./atlas-result.js";
import { createAtlasSourceLabels, formatAtlasStatus } from "./atlas-response-style";
import { createAtlasSuggestions } from "./atlas-suggestions";
import {
  createAtlasSupportContext,
  rankAtlasSupportOptions,
  type AtlasSafeSupportReferences,
} from "./atlas-support-resolution";
import { ATLAS_SUPPORT_EVIDENCE } from "./atlas-support";
import type { AtlasToolContext } from "./atlas-tool.js";
import type {
  AtlasAction,
  AtlasDisambiguationChoice,
  AtlasEvidence,
  AtlasGroundingLevel,
  AtlasIntent,
  AtlasResponsePlan,
  AtlasSupportOption,
} from "./atlas-types.js";

type RecordMatchData<T> = {
  matches: readonly T[];
  matchCount: number;
  source?: AtlasCustomerDataSource;
};

export type AtlasResponseRequest = {
  message: string;
  classification: AtlasIntentClassification;
  context: AtlasToolContext;
  result?: AtlasToolResult;
};

type PlanInput = {
  intent: AtlasIntent;
  answer: string;
  level: AtlasGroundingLevel;
  evidence?: readonly AtlasEvidence[];
  actions?: readonly AtlasAction[];
  data?: unknown;
  disambiguation?: readonly AtlasDisambiguationChoice[];
  supportOptions?: readonly AtlasSupportOption[];
  supportReferences?: AtlasSafeSupportReferences;
  visualState?: NonNullable<AtlasResponsePlan["visualState"]>;
};

function isRecordMatchData<T>(value: unknown): value is RecordMatchData<T> {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<RecordMatchData<T>>;
  return Array.isArray(candidate.matches) && typeof candidate.matchCount === "number";
}

function isDeliveryResult(value: unknown): value is AtlasOrderDeliveryResult {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as Partial<AtlasOrderDeliveryResult>).trackingStatus === "string"
  );
}

function supportActions(options: readonly AtlasSupportOption[]): AtlasAction[] {
  return options.map((option) => ({
    type: "support",
    label: option.label,
    optionId: option.id,
    destination: option.destination,
  }));
}

function evidenceActions(evidence: readonly AtlasEvidence[]): AtlasAction[] {
  return evidence.map((item) => ({
    type: "navigate",
    label: `Open ${item.sourceTitle}`,
    route: item.sourceRoute,
  }));
}

function latestOnly<T extends { createdAt: string }>(
  records: readonly T[],
  message: string,
): readonly T[] {
  if (!/\b(latest|last|recent)\b/i.test(message) || records.length < 2) return records;
  return [...records]
    .sort(
      (left, right) =>
        new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
    )
    .slice(0, 1);
}

function recoveryActions(
  issueCategory: ReturnType<typeof classifyAtlasIssue>,
): readonly AtlasAction[] {
  const prompts: Partial<Record<typeof issueCategory, string>> = {
    wallet: "What can Atlas help me check about my wallet in TrustVault?",
    network: "What can Atlas help me check about Arc and my network connection?",
    "marketplace-order":
      "What can Atlas help me with about Marketplace orders in TrustVault?",
    delivery:
      "What can Atlas help me with about Marketplace delivery and tracking?",
    payment:
      "What can Atlas safely help me check about payments in TrustVault?",
    receipt:
      "What can Atlas help me understand about TrustVault receipts?",
    "gift-vault":
      "What can Atlas help me with about Gift Vault?",
    "bill-split":
      "What can Atlas help me with about Bill Split?",
    account:
      "What can Atlas help me with about my TrustVault account?",
    security:
      "What safe TrustVault security checks can Atlas help me with?",
    "refund-dispute":
      "What TrustVault support options are available for refunds or disputes?",
    business:
      "What can Atlas explain about TrustVault?",
    general:
      "What can Atlas help me with in TrustVault?",
  };

  return [
    {
      type: "ask-atlas",
      label: "Try another way",
      prompt:
        prompts[issueCategory] ??
        "What can Atlas help me with in TrustVault?",
    },
    {
      type: "navigate",
      label: "Open Help Center",
      route: "/help",
    },
  ];
}

function historyAction(intent: AtlasIntent): AtlasAction | null {
  const routes: Partial<Record<AtlasIntent, { label: string; route: string }>> = {
    "marketplace-order": { label: "View orders", route: "/marketplace" },
    receipt: { label: "Open receipts", route: "/receipts" },
    gift: { label: "Manage gifts", route: "/gift-vault/manage" },
    "bill-split": { label: "Open Bill Split", route: "/bill-split" },
  };
  const target = routes[intent];
  return target ? { type: "navigate", ...target } : null;
}

export class AtlasResponseEngine {
  create(request: AtlasResponseRequest): AtlasResponsePlan {
    const issueCategory = classifyAtlasIssue(request.message, request.context.pathname);

    if (request.classification.intent === "support") {
      const options = rankAtlasSupportOptions(issueCategory);
      return this.#finalize(
        request,
        {
          intent: "support",
          answer: "I can help you reach the right verified TrustVault support option.",
          level: "VERIFIED",
          evidence: ATLAS_SUPPORT_EVIDENCE,
          actions: supportActions(options),
          supportOptions: options,
          visualState: "support",
        },
        issueCategory,
      );
    }

    if (request.classification.intent === "activity") {
      return this.#unavailable(
        request,
        "I couldn't verify a complete account activity source from the records currently available. I don't want to guess.",
        issueCategory,
      );
    }

    if (request.classification.toolId) {
      return this.#privateResponse(request, issueCategory);
    }

    return this.#knowledgeResponse(request, issueCategory);
  }

  #privateResponse(
    request: AtlasResponseRequest,
    issueCategory: ReturnType<typeof classifyAtlasIssue>,
  ): AtlasResponsePlan {
    const result = request.result;
    if (!result) {
      return this.#unavailable(request, "I couldn't complete that lookup.", issueCategory);
    }
    if (!result.ok) {
      if (result.code === "AUTHORIZATION_REQUIRED") {
        return this.#unavailable(
          request,
          "Please securely sign in to TrustVault before I look up private customer records. Connecting a wallet by itself isn't enough.",
          issueCategory,
        );
      }
      if (result.code === "INVALID_INPUT" && request.classification.intent === "gift") {
        return this.#unavailable(
          request,
          "I can check a Gift Vault record once you provide its Gift Vault ID. I won't guess which gift you mean.",
          issueCategory,
        );
      }
      return this.#finalize(
        request,
        {
          intent: request.classification.intent,
          answer: "I couldn't complete that TrustVault lookup right now. I don't want to guess.",
          level: "UNAVAILABLE",
          visualState: result.code === "EXECUTION_FAILED" ? "error" : "warning",
        },
        issueCategory,
      );
    }

    if (request.classification.intent === "delivery-tracking") {
      return this.#deliveryResponse(request, result, issueCategory);
    }
    if (request.classification.intent === "marketplace-order") {
      return this.#orderResponse(request, result, issueCategory);
    }
    if (request.classification.intent === "receipt") {
      return this.#receiptResponse(request, result, issueCategory);
    }
    if (request.classification.intent === "gift") {
      return this.#giftResponse(request, result, issueCategory);
    }
    return this.#billResponse(request, result, issueCategory);
  }

  #orderResponse(
    request: AtlasResponseRequest,
    result: Extract<AtlasToolResult, { ok: true }>,
    issueCategory: ReturnType<typeof classifyAtlasIssue>,
  ): AtlasResponsePlan {
    if (!isRecordMatchData<AtlasMarketplaceOrderRecord>(result.data)) {
      return this.#unavailable(request, "I couldn't verify an owned order from the available records.", issueCategory);
    }
    const matches = latestOnly(result.data.matches, request.message);
    if (matches.length === 0) return this.#zeroRecord(request, issueCategory);
    if (matches.length > 1) {
      return this.#disambiguate(
        request,
        result,
        issueCategory,
        `I found ${matches.length} orders that might match. Which one did you mean?`,
        createOrderChoices(matches),
      );
    }
    const order = matches[0];
    const actions: AtlasAction[] = [
      { type: "navigate", label: "View order", route: `/orders/${encodeURIComponent(order.id)}` },
    ];
    if (order.receiptId) {
      actions.push({
        type: "navigate",
        label: "Open receipt",
        route: `/receipt/${encodeURIComponent(order.receiptId)}`,
      });
    }
    return this.#finalize(
      request,
      {
        intent: "marketplace-order",
        answer: `I found your order ${order.orderNumber}. It's ${formatAtlasStatus(order.status)} with ${order.sellerName || "the recorded seller"} for ${order.totalAmount} ${order.asset}. Payment is ${formatAtlasStatus(order.paymentStatus || "unavailable")}.`,
        level: "VERIFIED",
        evidence: result.evidence,
        actions,
        data: { ...result.data, selected: order },
      },
      issueCategory,
    );
  }

  #receiptResponse(
    request: AtlasResponseRequest,
    result: Extract<AtlasToolResult, { ok: true }>,
    issueCategory: ReturnType<typeof classifyAtlasIssue>,
  ): AtlasResponsePlan {
    if (!isRecordMatchData<AtlasReceiptRecord>(result.data)) {
      return this.#zeroRecord(request, issueCategory);
    }
    const matches = latestOnly(result.data.matches, request.message);
    if (matches.length === 0) return this.#zeroRecord(request, issueCategory);
    if (matches.length > 1) {
      return this.#disambiguate(
        request,
        result,
        issueCategory,
        `I found ${matches.length} receipts that might match. Which one did you mean?`,
        createReceiptChoices(matches),
      );
    }
    const receipt = matches[0];
    const actions: AtlasAction[] = [
      { type: "navigate", label: "Open receipt", route: `/receipt/${encodeURIComponent(receipt.id)}` },
    ];
    if (receipt.explorerUrl && isControlledArcScanTransactionUrl(receipt.explorerUrl)) {
      actions.push({
        type: "external-navigation",
        label: "Open ArcScan",
        destination: receipt.explorerUrl,
      });
    }
    return this.#finalize(
      request,
      {
        intent: "receipt",
        answer: `I found your ${receipt.title} receipt. It's ${formatAtlasStatus(receipt.status)} for ${receipt.amount} ${receipt.asset}.`,
        level: "VERIFIED",
        evidence: result.evidence,
        actions,
        data: { ...result.data, selected: receipt },
      },
      issueCategory,
    );
  }

  #giftResponse(
    request: AtlasResponseRequest,
    result: Extract<AtlasToolResult, { ok: true }>,
    issueCategory: ReturnType<typeof classifyAtlasIssue>,
  ): AtlasResponsePlan {
    if (!isRecordMatchData<AtlasGiftRecord>(result.data) || result.data.matches.length === 0) {
      return this.#zeroRecord(request, issueCategory);
    }
    if (result.data.matches.length > 1) {
      return this.#disambiguate(
        request,
        result,
        issueCategory,
        `I found ${result.data.matches.length} gifts that might match. Which one did you mean?`,
        createGiftChoices(result.data.matches),
      );
    }
    const gift = result.data.matches[0];
    const asksClaimed = /\b(claimed|claim status|did .* claim)\b/i.test(request.message);
    return this.#finalize(
      request,
      {
        intent: "gift",
        answer: asksClaimed
          ? `I found Gift Vault ${gift.id}, but this record doesn't confirm whether the gift has been claimed. I don't want to guess.`
          : `I found Gift Vault ${gift.id}. The gift metadata is available in your TrustVault records.`,
        level: asksClaimed ? "PARTIAL" : "VERIFIED",
        evidence: result.evidence,
        actions: [
          {
            type: "navigate",
            label: "Manage gift",
            route: `/gift-vault/manage/${encodeURIComponent(gift.id)}`,
          },
        ],
        data: { ...result.data, selected: gift },
      },
      issueCategory,
    );
  }

  #billResponse(
    request: AtlasResponseRequest,
    result: Extract<AtlasToolResult, { ok: true }>,
    issueCategory: ReturnType<typeof classifyAtlasIssue>,
  ): AtlasResponsePlan {
    if (!isRecordMatchData<AtlasBillSplitRecord>(result.data)) {
      return this.#zeroRecord(request, issueCategory);
    }
    const matches = latestOnly(result.data.matches, request.message);
    if (matches.length === 0) return this.#zeroRecord(request, issueCategory);
    if (matches.length > 1) {
      return this.#disambiguate(
        request,
        result,
        issueCategory,
        `I found ${matches.length} Bill Splits that might match. Which one did you mean?`,
        createBillSplitChoices(matches),
      );
    }
    const bill = matches[0];
    return this.#finalize(
      request,
      {
        intent: "bill-split",
        answer: `I found your ${bill.title} Bill Split. ${bill.settledShareCount} of ${bill.participantCount} shares are settled.`,
        level: "VERIFIED",
        evidence: result.evidence,
        actions: [
          {
            type: "navigate",
            label: "Open Bill Split",
            route: `/bill-split/manage/${encodeURIComponent(bill.id)}`,
          },
        ],
        data: { ...result.data, selected: bill },
      },
      issueCategory,
    );
  }

  #deliveryResponse(
    request: AtlasResponseRequest,
    result: Extract<AtlasToolResult, { ok: true }>,
    issueCategory: ReturnType<typeof classifyAtlasIssue>,
  ): AtlasResponsePlan {
    if (isRecordMatchData<AtlasMarketplaceOrderRecord>(result.data)) {
      if (result.data.matches.length === 0) return this.#zeroRecord(request, issueCategory);
      return this.#disambiguate(
        request,
        result,
        issueCategory,
        `I found ${result.data.matches.length} orders that might match. Which delivery did you mean?`,
        createOrderChoices(result.data.matches),
      );
    }
    if (!isDeliveryResult(result.data)) {
      return this.#unavailable(
        request,
        "I couldn't identify one owned order for that delivery lookup.",
        issueCategory,
      );
    }
    const delivery = result.data;
    const actions: AtlasAction[] = [
      { type: "navigate", label: "View order", route: delivery.orderRoute },
    ];
    if (delivery.officialTrackingDestination) {
      actions.push({
        type: "external-navigation",
        label: "Track delivery",
        destination: delivery.officialTrackingDestination,
      });
    }
    if (delivery.trackingStatus === "assigned") {
      return this.#finalize(
        request,
        {
          intent: "delivery-tracking",
          answer: `I found the tracking details for ${delivery.orderNumber}. ${delivery.carrier ? `${delivery.carrier}: ` : "Tracking number: "}${delivery.trackingNumber}.`,
          level: "VERIFIED",
          evidence: result.evidence,
          actions,
          data: delivery,
        },
        issueCategory,
      );
    }
    if (delivery.trackingStatus === "pending") {
      return this.#finalize(
        request,
        {
          intent: "delivery-tracking",
          answer: "Your tracking number hasn't been assigned yet. TrustVault expects tracking details within 48 working hours after the order is placed.",
          level: "PARTIAL",
          evidence: result.evidence,
          actions,
          data: delivery,
        },
        issueCategory,
      );
    }
    const options = rankAtlasSupportOptions("delivery");
    return this.#finalize(
      request,
      {
        intent: "delivery-tracking",
        answer: "Your tracking details are not available yet, and this order is past the expected 48-working-hour window. I don't want to guess. I can help you contact TrustVault support.",
        level: "PARTIAL",
        evidence: result.evidence,
        actions: [...actions, ...supportActions(options)],
        data: delivery,
        supportOptions: options,
        supportReferences: { orderId: delivery.orderId },
        visualState: "support",
      },
      issueCategory,
    );
  }

  #knowledgeResponse(
    request: AtlasResponseRequest,
    issueCategory: ReturnType<typeof classifyAtlasIssue>,
  ): AtlasResponsePlan {
    const result = request.result;
    if (!result?.ok || result.evidence.length === 0) {
      return this.#unavailable(
        request,
        "I couldn't verify that from the information currently available in TrustVault, so I won't make up an answer. I can still help you approach it another way.",
        issueCategory,
      );
    }
    const evidence = result.evidence;

    if (
      request.classification.feature &&
      request.classification.purpose &&
      request.classification.intent !== "diagnosis" &&
      request.classification.intent !== "navigation"
    ) {
      const featureResponse = createAtlasFeatureResponse({
        featureId: request.classification.feature,
        purpose: request.classification.purpose,
        didYouMean: request.classification.didYouMean,
      });

      return this.#finalize(
        request,
        {
          intent: request.classification.intent,
          answer: featureResponse.answer,
          level: "VERIFIED",
          evidence,
          actions: featureResponse.actions,
          data: result.data,
        },
        issueCategory,
      );
    }

    const primary = evidence[0];
    let answer = primary.excerpt;
    if (primary.sourceId === "swap-coming-soon") {
      answer = "Swap is Coming Soon. Swap execution isn't currently available in TrustVault, and Atlas can't swap USDC.";
    } else if (primary.sourceId === "wallet-availability" && /trust wallet/i.test(request.message)) {
      answer = "Trust Wallet is marked Coming Soon, so it isn't currently enabled for production connection in TrustVault.";
    } else if (primary.sourceId === "transaction-statuses" && /confirmed/i.test(request.message)) {
      answer = "Confirmed means the available TrustVault transaction evidence shows settlement confirmation. A receipt or ArcScan link can provide the supporting details when available.";
    }
    return this.#finalize(
      request,
      {
        intent: request.classification.intent,
        answer,
        level: "VERIFIED",
        evidence,
        actions: evidenceActions(evidence),
        data: result.data,
      },
      issueCategory,
    );
  }

  #zeroRecord(
    request: AtlasResponseRequest,
    issueCategory: ReturnType<typeof classifyAtlasIssue>,
  ): AtlasResponsePlan {
    const names: Partial<Record<AtlasIntent, string>> = {
      "marketplace-order": "Marketplace order",
      receipt: "receipt",
      gift: "Gift Vault record",
      "bill-split": "Bill Split",
      "delivery-tracking": "delivery record",
    };
    const history = historyAction(request.classification.intent);
    const support = rankAtlasSupportOptions(issueCategory);
    return this.#finalize(
      request,
      {
        intent: request.classification.intent,
        answer: `I couldn't find a ${names[request.classification.intent] ?? "record"} matching that in the records available to this account.`,
        level: "UNAVAILABLE",
        actions: [...(history ? [history] : []), ...supportActions(support)],
        supportOptions: support,
        visualState: "warning",
      },
      issueCategory,
    );
  }

  #disambiguate(
    request: AtlasResponseRequest,
    result: Extract<AtlasToolResult, { ok: true }>,
    issueCategory: ReturnType<typeof classifyAtlasIssue>,
    answer: string,
    choices: readonly AtlasDisambiguationChoice[],
  ): AtlasResponsePlan {
    return this.#finalize(
      request,
      {
        intent: request.classification.intent,
        answer,
        level: "VERIFIED",
        evidence: result.evidence,
        actions: choices.flatMap((choice) => (choice.action ? [choice.action] : [])),
        disambiguation: choices,
        data: result.data,
      },
      issueCategory,
    );
  }

  #unavailable(
    request: AtlasResponseRequest,
    answer: string,
    issueCategory: ReturnType<typeof classifyAtlasIssue>,
  ): AtlasResponsePlan {
    const options = rankAtlasSupportOptions(issueCategory);
    return this.#finalize(
      request,
      {
        intent: request.classification.intent,
        answer,
        level: "UNAVAILABLE",
        actions: [
          ...recoveryActions(issueCategory),
          ...supportActions(options),
        ],
        supportOptions: options,
        visualState: "warning",
      },
      issueCategory,
    );
  }

  #finalize(
    request: AtlasResponseRequest,
    input: PlanInput,
    issueCategory: ReturnType<typeof classifyAtlasIssue>,
  ): AtlasResponsePlan {
    const evidence = input.evidence ?? [];
    const actions = input.actions ?? [];
    const visualState =
      input.visualState ?? (input.level === "UNAVAILABLE" ? "warning" : "speaking");
    const source =
      typeof input.data === "object" &&
      input.data !== null &&
      "source" in input.data &&
      input.data.source === "authenticated-browser"
        ? ("Current browser" as const)
        : ("TrustVault account" as const);

    return {
      intent: input.intent,
      answer: input.answer,
      grounding: createAtlasGrounding(input.level, evidence),
      confidence: input.level,
      evidence,
      actions,
      suggestions: createAtlasSuggestions({
        intent: input.intent,
        pathname: request.context.pathname,
        actions,
      }),
      visualState,
      visualSequence: ["listening", "thinking", visualState],
      sourceLabels: createAtlasSourceLabels(evidence),
      issueCategory,
      ...(request.classification.requiresPrivateData
        ? {
            customerContext: {
              authenticated: request.context.isAuthenticated,
              ...(request.context.isAuthenticated ? { source } : {}),
            },
          }
        : {}),
      ...(input.supportOptions ? { supportOptions: input.supportOptions } : {}),
      ...(input.supportReferences
        ? { supportContext: createAtlasSupportContext(issueCategory, input.supportReferences) }
        : {}),
      ...(input.disambiguation ? { disambiguation: input.disambiguation } : {}),
      ...(input.data !== undefined ? { data: input.data } : {}),
    };
  }
}
