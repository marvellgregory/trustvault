import { searchTrustVaultKnowledge } from "./atlas-knowledge";
import { isSafeInternalRoute } from "./atlas-navigation";
import { getAtlasRouteContext } from "./atlas-route-context";
import { atlasToolFailure, atlasToolSuccess } from "./atlas-result";
import {
  ATLAS_SUPPORT_EVIDENCE,
  getVerifiedSupportOptions,
} from "./atlas-support";
import type { AtlasTool } from "./atlas-tool.js";
import { ATLAS_CUSTOMER_TOOLS } from "./atlas-customer-tools";
import { getMyOrderDeliveryTool } from "./atlas-delivery";

function inputRecord(input: unknown): Record<string, unknown> | null {
  return typeof input === "object" && input !== null
    ? (input as Record<string, unknown>)
    : null;
}

export const searchTrustVaultKnowledgeTool: AtlasTool = {
  id: "search_trustvault_knowledge",
  description: "Search the local TrustVault-owned knowledge index.",
  category: "knowledge",
  readOnly: true,
  requiresAuthentication: false,
  requiresWallet: false,
  riskLevel: "read",
  execute(_context, input) {
    const query = inputRecord(input)?.query;
    if (typeof query !== "string" || query.trim().length === 0) {
      return atlasToolFailure("INVALID_INPUT", "A non-empty knowledge query is required.");
    }

    const result = searchTrustVaultKnowledge(query);
    return atlasToolSuccess(result, result.groundingLevel, result.evidence);
  },
};

export const getCurrentRouteContextTool: AtlasTool = {
  id: "get_current_route_context",
  description: "Classify the current TrustVault route for contextual assistance.",
  category: "context",
  readOnly: true,
  requiresAuthentication: false,
  requiresWallet: false,
  riskLevel: "read",
  execute(context) {
    return atlasToolSuccess(getAtlasRouteContext(context.pathname));
  },
};

export const getSupportOptionsTool: AtlasTool = {
  id: "get_support_options",
  description: "Return and rank only verified, configured TrustVault support destinations.",
  category: "support",
  readOnly: true,
  requiresAuthentication: false,
  requiresWallet: false,
  riskLevel: "read",
  execute(_context, input) {
    const topic = inputRecord(input)?.topic;
    if (topic !== undefined && typeof topic !== "string") {
      return atlasToolFailure("INVALID_INPUT", "Support topic must be text when provided.");
    }
    return atlasToolSuccess(
      getVerifiedSupportOptions(topic),
      "VERIFIED",
      ATLAS_SUPPORT_EVIDENCE,
    );
  },
};

export const openTrustVaultRouteTool: AtlasTool = {
  id: "open_trustvault_route",
  description: "Open a validated internal TrustVault route.",
  category: "navigation",
  readOnly: true,
  requiresAuthentication: false,
  requiresWallet: false,
  riskLevel: "navigation",
  async execute(context, input) {
    const route = inputRecord(input)?.route;
    if (typeof route !== "string" || route.trim().length === 0) {
      return atlasToolFailure("INVALID_INPUT", "An internal TrustVault route is required.");
    }
    if (!isSafeInternalRoute(route)) {
      return atlasToolFailure("UNSAFE_ROUTE", "Atlas only opens safe internal TrustVault routes.");
    }

    if (context.navigate) await context.navigate(route);
    return atlasToolSuccess({ route, navigated: Boolean(context.navigate) });
  },
};

export const FOUNDATION_ATLAS_TOOLS: readonly AtlasTool[] = [
  searchTrustVaultKnowledgeTool,
  getCurrentRouteContextTool,
  getSupportOptionsTool,
  openTrustVaultRouteTool,
] as const;

export const ATLAS_PACKAGE_2_TOOLS: readonly AtlasTool[] = [
  ...ATLAS_CUSTOMER_TOOLS,
  getMyOrderDeliveryTool,
] as const;

export const ALL_ATLAS_TOOLS: readonly AtlasTool[] = [
  ...FOUNDATION_ATLAS_TOOLS,
  ...ATLAS_PACKAGE_2_TOOLS,
] as const;
