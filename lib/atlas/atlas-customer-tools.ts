import {
  adapterBelongsToCustomer,
  hasAuthorizedCustomerContext,
  type AtlasBillSplitRecord,
  type AtlasCustomerDataSource,
  type AtlasGiftRecord,
  type AtlasMarketplaceOrderRecord,
  type AtlasReceiptRecord,
} from "./atlas-customer-context.js";
import { atlasToolFailure, atlasToolSuccess } from "./atlas-result.js";
import type { AtlasTool, AtlasToolContext } from "./atlas-tool.js";
import { isSafeInternalRoute } from "./atlas-navigation.js";
import type {
  AtlasEvidence,
  AtlasPrivateEvidenceSourceType,
} from "./atlas-types.js";

export type AtlasRecordMatchResult<T> = {
  matches: readonly T[];
  matchCount: number;
  source: AtlasCustomerDataSource;
};

function inputRecord(input: unknown): Record<string, unknown> | null {
  return typeof input === "object" && input !== null
    ? (input as Record<string, unknown>)
    : null;
}

function optionalQuery(input: unknown): string | null {
  const query = inputRecord(input)?.query;
  if (query === undefined) return "";
  if (typeof query !== "string") return null;
  return query.trim();
}

const MATCH_STOP_WORDS = new Set([
  "fetch",
  "find",
  "get",
  "has",
  "is",
  "last",
  "latest",
  "my",
  "please",
  "recent",
  "show",
  "the",
  "trustvault",
  "what",
  "where",
]);

function queryTokens(query: string, domainWords: readonly string[]): string[] {
  const ignored = new Set([...MATCH_STOP_WORDS, ...domainWords]);
  return (query.toLowerCase().match(/[a-z0-9-]+/g) ?? []).filter(
    (token) => token.length > 1 && !ignored.has(token),
  );
}

function matchesQuery(
  query: string,
  values: readonly string[],
  domainWords: readonly string[],
): boolean {
  const tokens = queryTokens(query, domainWords);
  if (tokens.length === 0) return true;
  const searchable = values.join(" ").toLowerCase();
  return tokens.every((token) => searchable.includes(token));
}

function safeDeepLink(route: string): string {
  if (!isSafeInternalRoute(route)) {
    throw new Error("Atlas generated an unsafe customer record route.");
  }
  return route;
}

function recordEvidence(
  sourceType: AtlasPrivateEvidenceSourceType,
  id: string,
  title: string,
  route: string,
  excerpt: string,
): AtlasEvidence {
  return {
    sourceId: `${sourceType}:${id}`,
    sourceTitle: title,
    sourceRoute: safeDeepLink(route),
    sourceType,
    excerpt,
  };
}

function authorizationFailure() {
  return atlasToolFailure(
    "AUTHORIZATION_REQUIRED",
    "An authenticated TrustVault customer session is required for private records.",
  );
}

function unavailableFailure() {
  return atlasToolFailure(
    "DATA_UNAVAILABLE",
    "The authenticated customer record source is currently unavailable.",
  );
}

function authorizedAdapter<K extends keyof NonNullable<AtlasToolContext["customerAdapters"]>>(
  context: AtlasToolContext,
  key: K,
) {
  if (!hasAuthorizedCustomerContext(context)) return null;
  const adapter = context.customerAdapters?.[key];
  if (!adapter || !adapterBelongsToCustomer(adapter, context.authenticatedCustomer)) {
    return null;
  }
  return adapter;
}

export function findOrderMatches(
  orders: readonly AtlasMarketplaceOrderRecord[],
  query: string,
): AtlasMarketplaceOrderRecord[] {
  return orders.filter((order) =>
    matchesQuery(
      query,
      [order.id, order.orderNumber, order.status, ...order.itemTitles],
      [
        "awb",
        "consignment",
        "courier",
        "delivery",
        "order",
        "orders",
        "marketplace",
        "package",
        "purchase",
        "shipment",
        "track",
        "tracking",
        "waybill",
      ],
    ),
  );
}

export const findMyMarketplaceOrdersTool: AtlasTool = {
  id: "find_my_marketplace_orders",
  description: "Find Marketplace orders owned by the authenticated customer.",
  category: "customer-records",
  readOnly: true,
  requiresAuthentication: true,
  requiresWallet: false,
  riskLevel: "read",
  async execute(context, input) {
    if (!hasAuthorizedCustomerContext(context)) return authorizationFailure();
    const adapter = authorizedAdapter(context, "marketplaceOrders");
    if (!adapter) return unavailableFailure();
    const query = optionalQuery(input);
    if (query === null) return atlasToolFailure("INVALID_INPUT", "Order query must be text.");
    const result = await adapter.findAll();
    if (result.status === "unavailable") return unavailableFailure();
    const matches = findOrderMatches(result.records, query);
    const evidence = matches.map((order) =>
      recordEvidence(
        "marketplace-order",
        order.id,
        `Marketplace order ${order.orderNumber}`,
        `/orders/${encodeURIComponent(order.id)}`,
        `${order.status}; ${order.totalAmount} ${order.asset}`,
      ),
    );
    return atlasToolSuccess<AtlasRecordMatchResult<AtlasMarketplaceOrderRecord>>(
      { matches, matchCount: matches.length, source: adapter.source },
      matches.length > 0 ? "VERIFIED" : "UNAVAILABLE",
      evidence,
    );
  },
};

export const findMyReceiptsTool: AtlasTool = {
  id: "find_my_receipts",
  description: "Find receipts owned by the authenticated customer.",
  category: "customer-records",
  readOnly: true,
  requiresAuthentication: true,
  requiresWallet: false,
  riskLevel: "read",
  async execute(context, input) {
    if (!hasAuthorizedCustomerContext(context)) return authorizationFailure();
    const adapter = authorizedAdapter(context, "receipts");
    if (!adapter) return unavailableFailure();
    const query = optionalQuery(input);
    if (query === null) return atlasToolFailure("INVALID_INPUT", "Receipt query must be text.");
    const result = await adapter.findAll();
    if (result.status === "unavailable") return unavailableFailure();
    const matches = result.records.filter((receipt) =>
      matchesQuery(
        query,
        [
          receipt.id,
          receipt.title,
          receipt.type,
          receipt.status,
          receipt.orderId ?? "",
          receipt.billSplitId ?? "",
          receipt.giftVaultId ?? "",
        ],
        ["receipt", "receipts"],
      ),
    );
    const evidence = matches.map((receipt) =>
      recordEvidence(
        "receipt",
        receipt.id,
        receipt.title,
        `/receipt/${encodeURIComponent(receipt.id)}`,
        `${receipt.status}; ${receipt.amount} ${receipt.asset}`,
      ),
    );
    return atlasToolSuccess<AtlasRecordMatchResult<AtlasReceiptRecord>>(
      { matches, matchCount: matches.length, source: adapter.source },
      matches.length > 0 ? "VERIFIED" : "UNAVAILABLE",
      evidence,
    );
  },
};

export const findMyGiftsTool: AtlasTool = {
  id: "find_my_gifts",
  description: "Find an authenticated customer's Gift Vault record by owned ID.",
  category: "customer-records",
  readOnly: true,
  requiresAuthentication: true,
  requiresWallet: false,
  riskLevel: "read",
  async execute(context, input) {
    if (!hasAuthorizedCustomerContext(context)) return authorizationFailure();
    const adapter = authorizedAdapter(context, "gifts");
    if (!adapter) return unavailableFailure();
    const giftId = inputRecord(input)?.giftId;
    if (typeof giftId !== "string" || giftId.trim().length === 0) {
      return atlasToolFailure(
        "INVALID_INPUT",
        "Gift Vault lookup requires an owned gift identifier.",
      );
    }
    const gift = await adapter.findById(giftId.trim());
    const matches: AtlasGiftRecord[] = gift ? [gift] : [];
    const evidence = gift
      ? [
          recordEvidence(
            "gift-vault",
            gift.id,
            `Gift Vault ${gift.id}`,
            `/gift-vault/manage/${encodeURIComponent(gift.id)}`,
            `Gift Vault record created ${gift.createdAt}`,
          ),
        ]
      : [];
    return atlasToolSuccess<AtlasRecordMatchResult<AtlasGiftRecord>>(
      { matches, matchCount: matches.length, source: adapter.source },
      gift ? "VERIFIED" : "UNAVAILABLE",
      evidence,
    );
  },
};

export const findMyBillSplitsTool: AtlasTool = {
  id: "find_my_bill_splits",
  description: "Find Bill Splits scoped to the authenticated customer session.",
  category: "customer-records",
  readOnly: true,
  requiresAuthentication: true,
  requiresWallet: false,
  riskLevel: "read",
  async execute(context, input) {
    if (!hasAuthorizedCustomerContext(context)) return authorizationFailure();
    const adapter = authorizedAdapter(context, "billSplits");
    if (!adapter) return unavailableFailure();
    const query = optionalQuery(input);
    if (query === null) return atlasToolFailure("INVALID_INPUT", "Bill Split query must be text.");
    const result = await adapter.findAll();
    if (result.status === "unavailable") return unavailableFailure();
    const matches = result.records.filter((bill) =>
      matchesQuery(
        query,
        [bill.id, bill.title, bill.status],
        ["bill", "bills", "split", "splits"],
      ),
    );
    const evidence = matches.map((bill) =>
      recordEvidence(
        "bill-split",
        bill.id,
        bill.title,
        `/bill-split/manage/${encodeURIComponent(bill.id)}`,
        `${bill.settledShareCount} of ${bill.participantCount} shares settled`,
      ),
    );
    return atlasToolSuccess<AtlasRecordMatchResult<AtlasBillSplitRecord>>(
      { matches, matchCount: matches.length, source: adapter.source },
      matches.length > 0 ? "VERIFIED" : "UNAVAILABLE",
      evidence,
    );
  },
};

export const ATLAS_CUSTOMER_TOOLS: readonly AtlasTool[] = [
  findMyMarketplaceOrdersTool,
  findMyReceiptsTool,
  findMyGiftsTool,
  findMyBillSplitsTool,
] as const;
