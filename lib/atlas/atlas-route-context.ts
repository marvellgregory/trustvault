export const ATLAS_ROUTE_CONTEXTS = [
  "marketplace",
  "gift-vault",
  "bill-split",
  "receipts",
  "trust-center",
  "account",
  "payment-review",
  "support",
  "documentation",
  "dashboard",
  "general",
] as const;

export type AtlasRouteContextKind = (typeof ATLAS_ROUTE_CONTEXTS)[number];

export type AtlasRouteContext = {
  pathname: string;
  kind: AtlasRouteContextKind;
  label: string;
  suggestedKnowledgeCategories: readonly string[];
};

function normalizePathname(route: string): string {
  const pathname = route.split(/[?#]/, 1)[0] || "/";
  return pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
}

export function classifyAtlasRoute(route: string): AtlasRouteContextKind {
  const pathname = normalizePathname(route).toLowerCase();

  if (pathname === "/payment-review") return "payment-review";
  if (pathname === "/trust-center") return "trust-center";
  if (pathname.startsWith("/gift-vault")) return "gift-vault";
  if (pathname.startsWith("/bill-split")) return "bill-split";
  if (pathname === "/receipts" || pathname.startsWith("/receipt/")) return "receipts";
  if (
    pathname.startsWith("/marketplace") ||
    pathname.startsWith("/orders/") ||
    pathname === "/cart" ||
    pathname === "/checkout" ||
    pathname === "/wishlist"
  ) {
    return "marketplace";
  }
  if (pathname.startsWith("/account")) return "account";
  if (pathname.startsWith("/dashboard")) return "dashboard";
  if (
    pathname === "/help" ||
    pathname === "/contact" ||
    pathname === "/responsible-disclosure"
  ) {
    return "support";
  }
  if (
    pathname === "/documentation" ||
    pathname.startsWith("/legal") ||
    pathname === "/roadmap" ||
    pathname === "/release-notes" ||
    pathname === "/coming-soon"
  ) {
    return "documentation";
  }
  return "general";
}

const ROUTE_METADATA: Record<
  AtlasRouteContextKind,
  Omit<AtlasRouteContext, "pathname" | "kind">
> = {
  marketplace: {
    label: "Marketplace",
    suggestedKnowledgeCategories: ["marketplace", "wallet", "receipts"],
  },
  "gift-vault": {
    label: "Gift Vault",
    suggestedKnowledgeCategories: ["gift-vault", "wallet", "safety"],
  },
  "bill-split": {
    label: "Bill Split",
    suggestedKnowledgeCategories: ["bill-split", "wallet", "receipts"],
  },
  receipts: {
    label: "Receipts",
    suggestedKnowledgeCategories: ["receipts", "arcscan", "settlement"],
  },
  "trust-center": {
    label: "Trust Center",
    suggestedKnowledgeCategories: ["trust-and-safety", "wallet-control"],
  },
  account: {
    label: "Account",
    suggestedKnowledgeCategories: ["account", "wallet"],
  },
  "payment-review": {
    label: "Payment Review",
    suggestedKnowledgeCategories: ["transaction-review", "wallet", "network"],
  },
  support: {
    label: "Support",
    suggestedKnowledgeCategories: ["support", "contact", "safety"],
  },
  documentation: {
    label: "Documentation",
    suggestedKnowledgeCategories: ["documentation", "product-status", "legal"],
  },
  dashboard: {
    label: "Dashboard",
    suggestedKnowledgeCategories: ["account", "activity", "products"],
  },
  general: {
    label: "TrustVault",
    suggestedKnowledgeCategories: ["getting-started", "products"],
  },
};

export function getAtlasRouteContext(route: string): AtlasRouteContext {
  const pathname = normalizePathname(route);
  const kind = classifyAtlasRoute(pathname);
  return { pathname, kind, ...ROUTE_METADATA[kind] };
}

