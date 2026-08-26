export const ATLAS_GROUNDING_LEVELS = [
  "VERIFIED",
  "PARTIAL",
  "UNAVAILABLE",
] as const;

export type AtlasGroundingLevel = (typeof ATLAS_GROUNDING_LEVELS)[number];

export type AtlasIntent =
  | "knowledge"
  | "route-context"
  | "support"
  | "navigation"
  | "diagnosis"
  | "marketplace-order"
  | "receipt"
  | "gift"
  | "bill-split"
  | "activity"
  | "delivery-tracking"
  | "unknown";

export const ATLAS_RISK_LEVELS = [
  "read",
  "navigation",
  "prepare",
  "mutation",
  "transaction",
] as const;

export type AtlasRiskLevel = (typeof ATLAS_RISK_LEVELS)[number];

export type AtlasToolCategory =
  | "knowledge"
  | "context"
  | "support"
  | "navigation"
  | "customer-records"
  | "delivery";

export type AtlasPrivateEvidenceSourceType =
  | "marketplace-order"
  | "receipt"
  | "gift-vault"
  | "bill-split"
  | "activity"
  | "delivery";

export type AtlasEvidenceSourceType =
  | AtlasKnowledgeSourceType
  | AtlasPrivateEvidenceSourceType;

export type AtlasEvidence = {
  sourceId: string;
  sourceTitle: string;
  sourceRoute: string;
  sourceType: AtlasEvidenceSourceType;
  excerpt: string;
};

export type AtlasGrounding = {
  level: AtlasGroundingLevel;
  evidence: readonly AtlasEvidence[];
};

export type AtlasAction =
  | {
      type: "navigate";
      label: string;
      route: string;
    }
  | {
      type: "support";
      label: string;
      optionId: string;
      destination: string;
    }
  | {
      type: "external-navigation";
      label: string;
      destination: string;
    };

export type AtlasResponsePlan = {
  intent: AtlasIntent;
  answer: string;
  grounding: AtlasGrounding;
  actions: readonly AtlasAction[];
  visualState?: import("./atlas-visual-state.js").AtlasVisualState;
  visualSequence?: readonly import("./atlas-visual-state.js").AtlasVisualState[];
  data?: unknown;
};

export type AtlasSupportChannel =
  | "contact"
  | "email"
  | "whatsapp"
  | "discord"
  | "help"
  | "x"
  | "farcaster"
  | "linkedin";

export type AtlasSupportOption = {
  id: string;
  channel: AtlasSupportChannel;
  label: string;
  destination: string;
  description: string;
  rank: number;
};

export type AtlasKnowledgeSourceType =
  | "help"
  | "documentation"
  | "trust-center"
  | "contact"
  | "legal"
  | "roadmap"
  | "release-notes"
  | "coming-soon";

export type AtlasKnowledgeRecord = {
  id: string;
  title: string;
  summary: string;
  route: string;
  category: string;
  keywords: readonly string[];
  sourceType: AtlasKnowledgeSourceType;
};
