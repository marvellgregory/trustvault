import { resolveAtlasConversationalIntent } from "./atlas-conversational-intent";
import {
  getAtlasFeature,
  resolveAtlasFeature,
  type AtlasFeatureId,
  type AtlasFeatureMatch,
  type AtlasFeaturePurpose,
} from "./atlas-feature-registry";
import type { AtlasIntent } from "./atlas-types.js";

export type AtlasIntentClassification = {
  intent: AtlasIntent;
  requiresPrivateData: boolean;
  toolId?: string;
  feature?: AtlasFeatureId;
  featureName?: string;
  purpose?: AtlasFeaturePurpose;
  featureConfidence?: number;
  featureMatchKind?: AtlasFeatureMatch["kind"];
  didYouMean?: boolean;
};

const FEATURE_INTENTS: Partial<Record<AtlasFeatureId, AtlasIntent>> = {
  marketplace: "knowledge",
  "marketplace-order": "marketplace-order",
  "delivery-tracking": "delivery-tracking",
  "gift-vault": "gift",
  "bill-split": "bill-split",
  receipts: "receipt",
  account: "knowledge",
  wallet: "knowledge",
  "trust-center": "knowledge",
  help: "support",
  activity: "activity",
  wishlist: "knowledge",
  cart: "knowledge",
  swap: "knowledge",
};

function featureClassification(
  match: AtlasFeatureMatch,
): AtlasIntentClassification | null {
  if (!match.feature) return null;

  const intent = FEATURE_INTENTS[match.feature.id] ?? "knowledge";

  const isPrivateLookup =
    match.didYouMean !== true &&
    match.purpose === "lookup" &&
    match.feature.requiresAuthForLookup === true &&
    Boolean(match.feature.privateToolId);

  return {
    intent,
    requiresPrivateData: isPrivateLookup || intent === "activity",
    ...(isPrivateLookup && match.feature.privateToolId
      ? { toolId: match.feature.privateToolId }
      : {}),
    feature: match.feature.id,
    featureName: match.feature.name,
    purpose: match.purpose,
    featureConfidence: match.confidence,
    featureMatchKind: match.kind,
    didYouMean: match.didYouMean,
  };
}

export function classifyAtlasIntent(
  message: string,
): AtlasIntentClassification {
  const normalized = message.trim().toLowerCase();

  if (!normalized) {
    return {
      intent: "unknown",
      requiresPrivateData: false,
      purpose: "unknown",
    };
  }

  const featureMatch = resolveAtlasFeature(message);
  const featureResult = featureClassification(featureMatch);
  const conversational = resolveAtlasConversationalIntent(message);

  if (/\b(open|go to|take me to|navigate)\b/.test(normalized)) {
    return {
      intent: "navigation",
      requiresPrivateData: false,
      purpose: "navigate",
      ...(featureMatch.feature
        ? {
            feature: featureMatch.feature.id,
            featureName: featureMatch.feature.name,
            featureConfidence: featureMatch.confidence,
            featureMatchKind: featureMatch.kind,
            didYouMean: featureMatch.didYouMean,
          }
        : {}),
    };
  }

  if (/\b(why|wrong|failed|problem|issue)\b/.test(normalized)) {
    return {
      intent: "diagnosis",
      requiresPrivateData: false,
      purpose: "learn",
      ...(featureMatch.feature
        ? {
            feature: featureMatch.feature.id,
            featureName: featureMatch.feature.name,
            featureConfidence: featureMatch.confidence,
            featureMatchKind: featureMatch.kind,
            didYouMean: featureMatch.didYouMean,
          }
        : {}),
    };
  }

  if (conversational) {
    const feature = getAtlasFeature(conversational.feature);

    return {
      intent: FEATURE_INTENTS[conversational.feature] ?? "knowledge",
      requiresPrivateData: false,
      feature: conversational.feature,
      ...(feature ? { featureName: feature.name } : {}),
      purpose: conversational.purpose,
      featureConfidence: conversational.confidence,
      featureMatchKind: "none",
      didYouMean: false,
    };
  }

  if (featureResult) {
    return featureResult;
  }

  if (/\b(page|route|where am i)\b/.test(normalized)) {
    return {
      intent: "route-context",
      requiresPrivateData: false,
      purpose: "learn",
    };
  }

  return {
    intent: "knowledge",
    requiresPrivateData: false,
    purpose: "unknown",
    featureConfidence: featureMatch.confidence,
    featureMatchKind: featureMatch.kind,
    didYouMean: false,
  };
}
