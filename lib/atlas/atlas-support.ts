import { createUnavailableResponsePlan } from "./atlas-grounding.js";
import type {
  AtlasEvidence,
  AtlasResponsePlan,
  AtlasSupportOption,
} from "./atlas-types.js";

type ConfiguredSupportOption = Omit<AtlasSupportOption, "rank"> & {
  topics: readonly string[];
};

// Mirrors the verified destinations currently published by /contact and Footer.
// Receipt sharing destinations are intentionally not support channels.
const CONFIGURED_SUPPORT_OPTIONS: readonly ConfiguredSupportOption[] = [
  {
    id: "help-center",
    channel: "help",
    label: "Help Center",
    destination: "/help",
    description: "Guidance for wallets, Arc Testnet, product flows and receipts.",
    topics: ["wallet", "network", "marketplace", "gift", "bill", "receipt", "arcscan"],
  },
  {
    id: "contact-page",
    channel: "contact",
    label: "Contact TrustVault",
    destination: "/contact",
    description: "Verified TrustVault contact and responsible reporting guidance.",
    topics: ["contact", "feedback", "support", "security", "other"],
  },
  {
    id: "support-email",
    channel: "email",
    label: "Email",
    destination: "mailto:marvellgregory85@gmail.com",
    description: "Published email for product questions and responsible security reports.",
    topics: ["security", "account", "transaction", "feedback", "other"],
  },
  {
    id: "support-x",
    channel: "x",
    label: "X",
    destination: "https://x.com/YoungestGrandad",
    description: "Published TrustVault contact on X.",
    topics: ["social", "feedback", "other"],
  },
  {
    id: "support-farcaster",
    channel: "farcaster",
    label: "Farcaster",
    destination: "https://farcaster.xyz/youngestgrandad",
    description: "Published TrustVault contact on Farcaster.",
    topics: ["social", "feedback", "other"],
  },
  {
    id: "support-linkedin",
    channel: "linkedin",
    label: "LinkedIn",
    destination:
      "https://www.linkedin.com/in/marvell-darlyn-gregory-b69ba71bb/",
    description: "Published TrustVault contact on LinkedIn.",
    topics: ["social", "business", "feedback", "other"],
  },
] as const;

export const ATLAS_SUPPORT_EVIDENCE: readonly AtlasEvidence[] = [
  {
    sourceId: "contact",
    sourceTitle: "Contact TrustVault",
    sourceRoute: "/contact",
    sourceType: "contact",
    excerpt: "Verified contact channels for product questions, feedback and responsible reporting.",
  },
] as const;

function topicTokens(topic: string): string[] {
  return topic.toLowerCase().match(/[a-z0-9]+/g) ?? [];
}

export function getConfiguredSupportOptions(): readonly AtlasSupportOption[] {
  return CONFIGURED_SUPPORT_OPTIONS.map((option, index) =>
    toSupportOption(option, index),
  );
}

function toSupportOption(
  option: ConfiguredSupportOption,
  index: number,
): AtlasSupportOption {
  return {
    id: option.id,
    channel: option.channel,
    label: option.label,
    destination: option.destination,
    description: option.description,
    rank: index + 1,
  };
}

export function getVerifiedSupportOptions(
  topic = "other",
): readonly AtlasSupportOption[] {
  const tokens = topicTokens(topic);

  return CONFIGURED_SUPPORT_OPTIONS.map((option, index) => {
    const relevance = option.topics.reduce(
      (score, candidate) => score + (tokens.includes(candidate) ? 1 : 0),
      0,
    );
    return { option, index, relevance };
  })
    .sort((left, right) => right.relevance - left.relevance || left.index - right.index)
    .map(({ option }, index) => toSupportOption(option, index));
}

export function createAtlasSupportFallbackPlan(
  topic = "other",
): AtlasResponsePlan {
  const options = getVerifiedSupportOptions(topic);
  return createUnavailableResponsePlan(
    "support",
    options.map((option) => ({
      type: "support" as const,
      label: option.label,
      optionId: option.id,
      destination: option.destination,
    })),
  );
}
