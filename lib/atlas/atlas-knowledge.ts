import { getAtlasGroundingLevel } from "./atlas-grounding.js";
import type {
  AtlasEvidence,
  AtlasKnowledgeRecord,
  AtlasGroundingLevel,
} from "./atlas-types.js";

export const TRUSTVAULT_KNOWLEDGE_INDEX: readonly AtlasKnowledgeRecord[] = [
  {
    id: "help-center",
    title: "Help Center",
    summary:
      "Practical guidance for wallet connection, Arc Testnet, Marketplace, Gift Vault, Bill Split, receipts, ArcScan and safety.",
    route: "/help",
    category: "support",
    keywords: [
      "wallet connection",
      "Arc Testnet",
      "Marketplace",
      "Gift Vault",
      "Bill Split",
      "receipts",
      "ArcScan",
      "safety",
    ],
    sourceType: "help",
  },
  {
    id: "documentation",
    title: "TrustVault Documentation",
    summary:
      "A factual guide to current TrustVault customer flows, application records and onchain settlement behavior.",
    route: "/documentation",
    category: "documentation",
    keywords: ["guide", "product flows", "onchain settlement", "application records"],
    sourceType: "documentation",
  },
  {
    id: "marketplace-delivery-tracking",
    title: "Marketplace delivery tracking and AWB",
    summary:
      "Tracking number pending means the carrier, AWB, waybill or consignment number has not been assigned yet. Tracking details are expected within 48 working hours after order placement.",
    route: "/help",
    category: "marketplace-delivery",
    keywords: [
      "AWB",
      "tracking number",
      "consignment number",
      "waybill",
      "courier",
      "delivery tracking",
      "48 working hours",
    ],
    sourceType: "help",
  },
  {
    id: "trust-center",
    title: "Trust Center",
    summary:
      "TrustVault's published boundaries for wallet control, transaction review, network verification, public proof and product transparency.",
    route: "/trust-center",
    category: "trust-and-safety",
    keywords: [
      "wallet control",
      "transaction review",
      "network verification",
      "public proof",
      "private key",
      "seed phrase",
    ],
    sourceType: "trust-center",
  },
  {
    id: "contact",
    title: "Contact TrustVault",
    summary:
      "Verified contact channels and guidance for product feedback, wallet safety and responsible security reports.",
    route: "/contact",
    category: "support",
    keywords: ["contact", "email", "feedback", "security report", "responsible disclosure"],
    sourceType: "contact",
  },
  {
    id: "legal-center",
    title: "Legal Center",
    summary:
      "TrustVault terms, privacy, risk, acceptable use and product-specific policy information.",
    route: "/legal",
    category: "legal",
    keywords: ["terms", "privacy", "risk disclosure", "acceptable use", "refunds", "disputes"],
    sourceType: "legal",
  },
  {
    id: "roadmap",
    title: "Roadmap",
    summary:
      "Future TrustVault direction without guaranteed delivery dates, separated from shipped functionality.",
    route: "/roadmap",
    category: "product-status",
    keywords: ["roadmap", "future", "planned", "production readiness", "Atlas", "Swap"],
    sourceType: "roadmap",
  },
  {
    id: "release-notes",
    title: "Release Notes",
    summary:
      "A factual record of customer-facing functionality shipped in the current Arc Testnet build.",
    route: "/release-notes",
    category: "product-status",
    keywords: ["release notes", "shipped", "current build", "updates"],
    sourceType: "release-notes",
  },
  {
    id: "coming-soon",
    title: "Coming Soon",
    summary:
      "A status page for TrustVault experiences that are still under development.",
    route: "/coming-soon",
    category: "product-status",
    keywords: ["coming soon", "under development", "not available"],
    sourceType: "coming-soon",
  },
] as const;

const QUERY_STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "can",
  "do",
  "for",
  "how",
  "i",
  "in",
  "is",
  "me",
  "my",
  "of",
  "on",
  "the",
  "to",
  "trustvault",
  "what",
  "where",
  "with",
]);

function tokenize(value: string): string[] {
  return (value.toLowerCase().match(/[a-z0-9]+/g) ?? []).filter(
    (token) => token.length > 1 && !QUERY_STOP_WORDS.has(token),
  );
}

function searchableText(record: AtlasKnowledgeRecord): string {
  return [record.title, record.summary, record.category, ...record.keywords]
    .join(" ")
    .toLowerCase();
}

export type AtlasKnowledgeSearchResult = {
  records: readonly AtlasKnowledgeRecord[];
  evidence: readonly AtlasEvidence[];
  groundingLevel: AtlasGroundingLevel;
};

export function searchTrustVaultKnowledge(
  query: string,
  limit = 5,
): AtlasKnowledgeSearchResult {
  const tokens = [...new Set(tokenize(query))];
  if (tokens.length === 0) {
    return { records: [], evidence: [], groundingLevel: "UNAVAILABLE" };
  }

  const records = TRUSTVAULT_KNOWLEDGE_INDEX.map((record, index) => {
    const text = searchableText(record);
    const score = tokens.reduce(
      (total, token) => total + (text.includes(token) ? 1 : 0),
      0,
    );
    return { record, index, score };
  })
    .filter(({ score }) => score > 0)
    .sort((left, right) => right.score - left.score || left.index - right.index)
    .slice(0, Math.max(0, limit))
    .map(({ record }) => record);

  const evidence = records.map(
    (record): AtlasEvidence => ({
      sourceId: record.id,
      sourceTitle: record.title,
      sourceRoute: record.route,
      sourceType: record.sourceType,
      excerpt: record.summary,
    }),
  );

  return {
    records,
    evidence,
    groundingLevel: getAtlasGroundingLevel(evidence),
  };
}
