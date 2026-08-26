import {
  adapterBelongsToCustomer,
  hasAuthorizedCustomerContext,
  type AtlasMarketplaceOrderRecord,
} from "./atlas-customer-context.js";
import { findOrderMatches } from "./atlas-customer-tools.js";
import { atlasToolFailure, atlasToolSuccess } from "./atlas-result.js";
import type { AtlasTool } from "./atlas-tool.js";
import { isSafeInternalRoute } from "./atlas-navigation.js";
import type { AtlasEvidence } from "./atlas-types.js";

export const ATLAS_DELIVERY_POLICY = {
  trackingAssignmentWorkingHours: 48,
  pendingLabel: "Tracking number pending",
  explanation:
    "Your tracking details are expected within 48 working hours after the order was placed.",
} as const;

export type AtlasDeliveryTrackingStatus =
  | "pending"
  | "assigned"
  | "overdue-unavailable";

export type AtlasCarrierId = "dhl" | "fedex" | "ups" | "aramex";

export type AtlasCarrier = {
  id: AtlasCarrierId;
  displayName: string;
  trackingLabel: string;
  officialTrackingDestination: string;
  aliases: readonly string[];
  availability: "official-landing-page";
};

// Carrier links are deliberately landing pages. Package 2 never interpolates an
// untrusted AWB into a URL and does not claim that a carrier has live tracking data.
export const ATLAS_CARRIER_REGISTRY: readonly AtlasCarrier[] = [
  {
    id: "dhl",
    displayName: "DHL",
    trackingLabel: "DHL tracking number",
    officialTrackingDestination: "https://www.dhl.com/us-en/home/tracking.html",
    aliases: ["dhl", "dhl express", "dhl ecommerce"],
    availability: "official-landing-page",
  },
  {
    id: "fedex",
    displayName: "FedEx",
    trackingLabel: "FedEx tracking ID",
    officialTrackingDestination: "https://www.fedex.com/en-us/tracking.html",
    aliases: ["fedex", "federal express"],
    availability: "official-landing-page",
  },
  {
    id: "ups",
    displayName: "UPS",
    trackingLabel: "UPS tracking number",
    officialTrackingDestination: "https://www.ups.com/us/en/support/tracking-support",
    aliases: ["ups", "united parcel service"],
    availability: "official-landing-page",
  },
  {
    id: "aramex",
    displayName: "Aramex",
    trackingLabel: "Aramex waybill number",
    officialTrackingDestination: "https://www.aramex.com/us/en/home/Index/",
    aliases: ["aramex"],
    availability: "official-landing-page",
  },
] as const;

export function resolveAtlasCarrier(value?: string): AtlasCarrier | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  return (
    ATLAS_CARRIER_REGISTRY.find(
      (carrier) =>
        carrier.id === normalized || carrier.aliases.includes(normalized),
    ) ?? null
  );
}

export function isControlledTrackingDestination(destination: string): boolean {
  try {
    const parsed = new URL(destination);
    return (
      parsed.protocol === "https:" &&
      ATLAS_CARRIER_REGISTRY.some(
        (carrier) => carrier.officialTrackingDestination === parsed.toString(),
      )
    );
  } catch {
    return false;
  }
}

// In Package 2, a working hour is an elapsed clock hour on Monday-Friday.
// Weekends are excluded; public holidays and local business-hour windows are not
// calculated until TrustVault has an authoritative business calendar.
export function addAtlasWorkingHours(start: Date, hours: number): Date {
  const result = new Date(start);
  let remaining = Math.max(0, Math.floor(hours));

  while (remaining > 0) {
    result.setUTCHours(result.getUTCHours() + 1);
    const day = result.getUTCDay();
    if (day !== 0 && day !== 6) remaining -= 1;
  }

  return result;
}

export function getAtlasDeliveryTrackingStatus(input: {
  orderPlacedAt: string;
  trackingNumber?: string;
  now?: Date;
}): AtlasDeliveryTrackingStatus {
  if (input.trackingNumber?.trim()) return "assigned";
  const placedAt = new Date(input.orderPlacedAt);
  if (Number.isNaN(placedAt.getTime())) return "pending";
  const deadline = addAtlasWorkingHours(
    placedAt,
    ATLAS_DELIVERY_POLICY.trackingAssignmentWorkingHours,
  );
  return (input.now ?? new Date()).getTime() >= deadline.getTime()
    ? "overdue-unavailable"
    : "pending";
}

export type AtlasOrderDeliveryResult = {
  orderId: string;
  orderNumber: string;
  trackingStatus: AtlasDeliveryTrackingStatus;
  trackingAvailability: "available" | "pending" | "unavailable";
  trackingNumber?: string;
  carrier?: string;
  orderRoute: string;
  officialTrackingDestination?: string;
  policyExplanation: string;
};

function deliveryResult(
  order: AtlasMarketplaceOrderRecord,
  now?: Date,
): AtlasOrderDeliveryResult {
  const trackingStatus = getAtlasDeliveryTrackingStatus({
    orderPlacedAt: order.createdAt,
    trackingNumber: order.fulfillment.trackingNumber,
    now,
  });
  const carrier = resolveAtlasCarrier(order.fulfillment.carrier);
  const orderRoute = `/orders/${encodeURIComponent(order.id)}`;
  if (!isSafeInternalRoute(orderRoute)) {
    throw new Error("Atlas generated an unsafe order route.");
  }
  return {
    orderId: order.id,
    orderNumber: order.orderNumber,
    trackingStatus,
    trackingAvailability:
      trackingStatus === "assigned"
        ? "available"
        : trackingStatus === "pending"
          ? "pending"
          : "unavailable",
    ...(order.fulfillment.trackingNumber?.trim()
      ? { trackingNumber: order.fulfillment.trackingNumber.trim() }
      : {}),
    ...(carrier ? { carrier: carrier.displayName } : {}),
    orderRoute,
    ...(carrier && isControlledTrackingDestination(carrier.officialTrackingDestination)
      ? { officialTrackingDestination: carrier.officialTrackingDestination }
      : {}),
    policyExplanation: ATLAS_DELIVERY_POLICY.explanation,
  };
}

export const getMyOrderDeliveryTool: AtlasTool = {
  id: "get_my_order_delivery",
  description: "Read delivery and AWB availability for an authenticated customer's order.",
  category: "delivery",
  readOnly: true,
  requiresAuthentication: true,
  requiresWallet: false,
  riskLevel: "read",
  async execute(context, input) {
    if (!hasAuthorizedCustomerContext(context)) {
      return atlasToolFailure(
        "AUTHORIZATION_REQUIRED",
        "An authenticated TrustVault customer session is required for delivery details.",
      );
    }
    const adapter = context.customerAdapters?.marketplaceOrders;
    if (!adapter || !adapterBelongsToCustomer(adapter, context.authenticatedCustomer)) {
      return atlasToolFailure(
        "DATA_UNAVAILABLE",
        "The authenticated Marketplace order source is currently unavailable.",
      );
    }
    const candidate =
      typeof input === "object" && input !== null
        ? (input as Record<string, unknown>)
        : {};
    const query = candidate.query;
    if (typeof query !== "string" || query.trim().length === 0) {
      return atlasToolFailure("INVALID_INPUT", "Delivery lookup requires an order constraint.");
    }
    const loaded = await adapter.findAll();
    if (loaded.status === "unavailable") {
      return atlasToolFailure(
        "DATA_UNAVAILABLE",
        "The authenticated Marketplace order source is currently unavailable.",
      );
    }
    const matches = findOrderMatches(loaded.records, query);
    if (matches.length !== 1) {
      return atlasToolSuccess(
        { matches: matches.map((order) => ({ id: order.id, orderNumber: order.orderNumber })) },
        matches.length > 0 ? "PARTIAL" : "UNAVAILABLE",
        [],
      );
    }
    const result = deliveryResult(matches[0]);
    const evidence: AtlasEvidence[] = [
      {
        sourceId: `delivery:${result.orderId}`,
        sourceTitle: `Delivery for ${result.orderNumber}`,
        sourceRoute: result.orderRoute,
        sourceType: "delivery",
        excerpt:
          result.trackingStatus === "assigned"
            ? "Tracking number assigned"
            : ATLAS_DELIVERY_POLICY.pendingLabel,
      },
    ];
    return atlasToolSuccess(
      result,
      result.trackingStatus === "assigned" ? "VERIFIED" : "PARTIAL",
      evidence,
    );
  },
};
