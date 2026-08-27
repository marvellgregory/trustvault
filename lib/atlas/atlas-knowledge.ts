import { getAtlasGroundingLevel } from "./atlas-grounding";
import type {
  AtlasEvidence,
  AtlasKnowledgeRecord,
  AtlasGroundingLevel,
} from "./atlas-types.js";

export const TRUSTVAULT_KNOWLEDGE_INDEX: readonly AtlasKnowledgeRecord[] = [
  {
    id: "wallet-availability",
    title: "Supported wallet availability",
    summary:
      "MetaMask, Binance Wallet and Bitget Wallet are the currently presented supported wallets. Trust Wallet is marked Coming Soon and is not currently enabled for production connection.",
    route: "/help",
    category: "wallet",
    keywords: [
      "wallets can I use",
      "supported wallets",
      "MetaMask",
      "Binance Wallet",
      "Bitget Wallet",
      "Trust Wallet",
      "Coming Soon",
    ],
    sourceType: "help",
  },
  {
    id: "arc-testnet-network",
    title: "Arc Testnet",
    summary:
      "Current supported TrustVault blockchain transaction flows use Arc Testnet. Testnet assets should not be treated as guaranteed real-world value.",
    route: "/trust-center",
    category: "network",
    keywords: ["Arc Testnet", "wrong network", "network", "chain", "testnet USDC"],
    sourceType: "trust-center",
  },
  {
    id: "transaction-statuses",
    title: "Transaction and payment states",
    summary:
      "Pending or submitted means TrustVault does not yet have confirmed settlement evidence. Confirmed means the available transaction evidence shows settlement confirmation. Failed and refunded must only be reported when the corresponding TrustVault record says so.",
    route: "/trust-center",
    category: "payment",
    keywords: [
      "payment pending",
      "transaction pending",
      "confirmed meaning",
      "failed",
      "refunded",
      "awaiting approval",
      "wallet disconnected",
      "transaction explanation",
    ],
    sourceType: "trust-center",
  },
  {
    id: "unexpected-wallet-transaction",
    title: "Unexpected wallet transaction details",
    summary:
      "Do not approve a wallet request when the recipient, amount or network is unexpected. A confirmed blockchain payment is not automatically reversible; keep the transaction hash and relevant TrustVault record and use the verified support path.",
    route: "/help",
    category: "wallet-safety",
    keywords: [
      "sent to wrong wallet",
      "wrong recipient",
      "unexpected recipient",
      "wrong amount",
      "do not approve",
      "transaction recovery",
    ],
    sourceType: "help",
  },
  {
    id: "gift-vault-guide",
    title: "Gift Vault guidance",
    summary:
      "Gift Vault supports direct and timed gifts with customer review of the recipient, USDC amount, connected wallet and Arc Testnet details. Claim availability depends on gift conditions and verified onchain state.",
    route: "/help",
    category: "gift-vault",
    keywords: ["how Gift Vault works", "gift claim", "claimed", "timed gift", "unlock date"],
    sourceType: "help",
  },
  {
    id: "bill-split-guide",
    title: "Bill Split guidance",
    summary:
      "Bill Split coordinates payment requests between an organizer and participants. Each participant reviews their requested share and authorizes their own supported wallet transaction.",
    route: "/help",
    category: "bill-split",
    keywords: ["how Bill Split works", "participant share", "settled shares", "split payment"],
    sourceType: "help",
  },
  {
    id: "receipts-arcscan",
    title: "Receipts and ArcScan verification",
    summary:
      "TrustVault receipts may include network, amount, status and a transaction hash. When confirmed onchain data is available, an ArcScan link provides public transaction verification.",
    route: "/receipts",
    category: "receipt",
    keywords: ["receipt", "ArcScan", "verify transaction", "transaction hash", "public proof"],
    sourceType: "documentation",
  },
  {
    id: "refunds-disputes",
    title: "Refunds and disputes",
    summary:
      "A confirmed blockchain payment is not automatically reversible. Marketplace fulfillment or seller issues should be reviewed using the support and transaction information for the relevant order; escrow eligibility does not guarantee a refund or dispute outcome.",
    route: "/legal/refunds-disputes",
    category: "refund-dispute",
    keywords: ["refund", "refunds", "dispute", "chargeback", "reversible", "seller issue"],
    sourceType: "legal",
  },
  {
    id: "swap-coming-soon",
    title: "Swap Coming Soon",
    summary:
      "TrustVault Swap is Coming Soon. Swap execution, liquidity routing and a customer swap contract are not currently available through TrustVault, and Atlas cannot perform swaps.",
    route: "/coming-soon?feature=Swap",
    category: "product-status",
    keywords: ["Swap", "swap USDC", "exchange", "liquidity routing", "Coming Soon"],
    sourceType: "coming-soon",
  },
  {
    id: "account-session-safety",
    title: "Account and session safety",
    summary:
      "Private customer records require an authenticated TrustVault session. Wallet connection alone does not authorize access to private account data, and TrustVault support does not require wallet secrets.",
    route: "/trust-center",
    category: "account",
    keywords: ["account", "session", "signed in", "authentication", "private customer records"],
    sourceType: "trust-center",
  },
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
