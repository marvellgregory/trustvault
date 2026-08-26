import type {
  AtlasEvidence,
  AtlasGroundingLevel,
  AtlasSourceLabel,
} from "./atlas-types.js";

const SOURCE_LABELS: Record<AtlasEvidence["sourceType"], string> = {
  "marketplace-order": "From your Marketplace order",
  receipt: "From your TrustVault receipt",
  "gift-vault": "From your Gift Vault",
  "bill-split": "From your Bill Split",
  activity: "From your TrustVault activity",
  delivery: "From your delivery details",
  help: "From TrustVault Help",
  documentation: "From TrustVault Documentation",
  "trust-center": "From Trust Center",
  contact: "From TrustVault Contact",
  legal: "From TrustVault policy",
  roadmap: "From the TrustVault Roadmap",
  "release-notes": "From TrustVault Release Notes",
  "coming-soon": "From TrustVault Coming Soon",
};

export function createAtlasSourceLabels(
  evidence: readonly AtlasEvidence[],
): readonly AtlasSourceLabel[] {
  return evidence.map((item) => ({
    sourceId: item.sourceId,
    label: SOURCE_LABELS[item.sourceType],
  }));
}

export function formatAtlasRecordDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Date unavailable" : date.toISOString().slice(0, 10);
}

export function formatAtlasStatus(value: string): string {
  return value.replaceAll("-", " ");
}

export function atlasConfidenceLead(level: AtlasGroundingLevel): string {
  if (level === "PARTIAL") return "Here’s what I could verify.";
  if (level === "UNAVAILABLE") {
    return "I couldn't verify that from the information currently available. I don't want to guess.";
  }
  return "";
}

