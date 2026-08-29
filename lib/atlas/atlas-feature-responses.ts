import {
  getAtlasFeature,
  type AtlasFeatureDefinition,
  type AtlasFeatureId,
  type AtlasFeaturePurpose,
} from "./atlas-feature-registry";
import type { AtlasAction } from "./atlas-types.js";

export type AtlasFeatureResponse = {
  answer: string;
  actions: readonly AtlasAction[];
};

type FeatureCopy = {
  learn: string;
  start?: string;
  manage?: string;
  lookup?: string;
};

const FEATURE_COPY: Record<AtlasFeatureId, FeatureCopy> = {
  marketplace: {
    learn:
      "Marketplace lets you browse products and complete supported purchases through TrustVault.",
    start:
      "You can start browsing products in the TrustVault Marketplace.",
  },

  "marketplace-order": {
    learn:
      "Marketplace Orders keeps your TrustVault purchase records and order details together.",
    lookup:
      "I can help look up your Marketplace orders once your TrustVault account is securely authenticated.",
  },

  "delivery-tracking": {
    learn:
      "Delivery Tracking helps you check available fulfillment and tracking information for your Marketplace orders.",
    lookup:
      "I can check delivery details for an order you own once your TrustVault account is securely authenticated.",
  },

  "gift-vault": {
    learn:
      "Gift Vault lets you create and manage programmable USDC gifts in TrustVault.",
    start:
      "You can start a new Gift Vault from the Gift Vault page. Your wallet remains the final approval point for any onchain transaction.",
    manage:
      "You can review and manage your existing Gift Vault records from the Gift Vault management area.",
    lookup:
      "I can look up your Gift Vault records once your TrustVault account is securely authenticated.",
  },

  "bill-split": {
    learn:
      "Bill Split helps you create and manage shared payment requests in TrustVault.",
    start:
      "You can create a new Bill Split from the Bill Split page. Atlas will not submit a payment or transaction for you.",
    manage:
      "You can manage your existing Bill Split records from the Bill Split page.",
    lookup:
      "I can look up your Bill Split records once your TrustVault account is securely authenticated.",
  },

  receipts: {
    learn:
      "Receipt Center keeps your available TrustVault transaction and payment receipts in one place.",
    lookup:
      "I can look up your available TrustVault receipts once your account is securely authenticated.",
  },

  account: {
    learn:
      "Account is where you manage your TrustVault customer profile and authenticated session.",
  },

  wallet: {
    learn:
      "Wallet connections let TrustVault work with supported wallet providers while keeping signing authority inside your wallet.",
  },

  "trust-center": {
    learn:
      "Trust Center brings together TrustVault verification, security, and transaction-checking information.",
  },

  help: {
    learn:
      "Help Center contains TrustVault guidance and support paths for payments, orders, Gift Vault, Bill Split, wallets, receipts, and other issues.",
  },

  activity: {
    learn:
      "Activity is intended to surface your TrustVault history and transaction states when verified records are available.",
  },

  wishlist: {
    learn:
      "Wishlist lets you keep Marketplace products you may want to revisit later.",
  },

  cart: {
    learn:
      "Cart keeps the Marketplace products you are preparing to review before checkout.",
  },

  swap: {
    learn:
      "Swap is visible in TrustVault as a Coming Soon experience. Swap execution is not currently available.",
  },
};

function routeAction(
  feature: AtlasFeatureDefinition,
  purpose: AtlasFeaturePurpose,
): AtlasAction {
  const labels: Partial<Record<AtlasFeaturePurpose, string>> = {
    start: `Open ${feature.name}`,
    manage: `Manage ${feature.name}`,
    lookup: `Open ${feature.name}`,
    navigate: `Open ${feature.name}`,
    learn: `Open ${feature.name}`,
  };

  return {
    type: "navigate",
    label: labels[purpose] ?? `Open ${feature.name}`,
    route: feature.route,
  };
}

function relatedActions(
  feature: AtlasFeatureDefinition,
): readonly AtlasAction[] {
  return (feature.relatedFeatures ?? [])
    .map((id) => getAtlasFeature(id))
    .filter((item): item is AtlasFeatureDefinition => Boolean(item))
    .slice(0, 2)
    .map((item) => ({
      type: "navigate" as const,
      label: `Open ${item.name}`,
      route: item.route,
    }));
}

export function createAtlasFeatureResponse(input: {
  featureId: AtlasFeatureId;
  purpose: AtlasFeaturePurpose;
  didYouMean?: boolean;
}): AtlasFeatureResponse {
  const feature = getAtlasFeature(input.featureId);

  if (!feature) {
    return {
      answer:
        "I couldn't confidently match that to a TrustVault feature. I don't want to guess.",
      actions: [],
    };
  }

  const copy = FEATURE_COPY[input.featureId];
  const purpose =
    input.purpose === "unknown" || input.purpose === "navigate"
      ? "learn"
      : input.purpose;

  const answer =
    copy[purpose as keyof FeatureCopy] ??
    copy.learn;

  const prefix = input.didYouMean
    ? `Did you mean ${feature.name}? `
    : "";

  const actions: AtlasAction[] = [
    routeAction(feature, input.purpose),
    ...relatedActions(feature),
  ];

  return {
    answer: `${prefix}${answer}`,
    actions,
  };
}
