import type {
  AtlasFeatureId,
  AtlasFeaturePurpose,
} from "./atlas-feature-registry.js";

export type AtlasConversationalResolution = {
  feature: AtlasFeatureId;
  purpose: AtlasFeaturePurpose;
  confidence: number;
};

type ConversationalPattern = {
  feature: AtlasFeatureId;
  purpose: AtlasFeaturePurpose;
  patterns: readonly RegExp[];
};

const CONVERSATIONAL_PATTERNS: readonly ConversationalPattern[] = [
  {
    feature: "delivery-tracking",
    purpose: "learn",
    patterns: [
      /\bwhere (?:is|are) (?:my )?(?:stuff|package|parcel|delivery)\b/i,
      /\bdid anything happen with (?:my )?(?:delivery|package|parcel)\b/i,
      /\bhas anything happened with (?:my )?(?:delivery|package|parcel)\b/i,
      /\bwhat(?:'s| is) happening with (?:my )?(?:delivery|package|parcel)\b/i,
    ],
  },
  {
    feature: "bill-split",
    purpose: "start",
    patterns: [
      /\bhow do i pay everyone back\b/i,
      /\bhelp me pay everyone back\b/i,
      /\bwe all need to pay our share\b/i,
      /\bshare this cost between us\b/i,
      /\bdivide this cost between us\b/i,
      /\bsplit\b.+\bbetween\b.+\b(?:people|friends|us)\b/i,
    ],
  },
  {
    feature: "gift-vault",
    purpose: "start",
    patterns: [
      /\bi want to give (?:my )?(?:friend|someone|somebody) something\b/i,
      /\bhelp me send something to (?:my )?(?:friend|someone|somebody)\b/i,
      /\bi want to surprise (?:my )?(?:friend|someone|somebody)\b/i,
      /\b(?:send|give)\b.+\b\d+(?:\.\d{1,6})?\s+usdc\b.+\b(?:gift|present)\b/i,
    ],
  },
  {
    feature: "marketplace-order",
    purpose: "learn",
    patterns: [
      /\bwhere can i see what i paid for\b/i,
      /\bwhere can i see what i bought\b/i,
      /\bshow me what i bought\b/i,
      /\bwhat have i bought\b/i,
    ],
  },
  {
    feature: "receipts",
    purpose: "learn",
    patterns: [
      /\bwhere can i see proof (?:that )?i paid\b/i,
      /\bhow do i prove i paid\b/i,
      /\bwhere is the proof of payment\b/i,
    ],
  },
  {
    feature: "activity",
    purpose: "learn",
    patterns: [
      /\bshow me what i(?:'ve| have) been doing\b/i,
      /\bwhat have i been doing\b/i,
      /\bwhat have i done recently\b/i,
    ],
  },
  {
    feature: "trust-center",
    purpose: "learn",
    patterns: [
      /\bcan you check if this is legit\b/i,
      /\bis this legit\b/i,
      /\bcan you check if this is safe\b/i,
      /\bcan i trust this\b/i,
    ],
  },
];

export function resolveAtlasConversationalIntent(
  message: string,
): AtlasConversationalResolution | null {
  const normalized = message.trim();

  if (!normalized) return null;

  for (const candidate of CONVERSATIONAL_PATTERNS) {
    if (candidate.patterns.some((pattern) => pattern.test(normalized))) {
      return {
        feature: candidate.feature,
        purpose: candidate.purpose,
        confidence: 0.9,
      };
    }
  }

  return null;
}
