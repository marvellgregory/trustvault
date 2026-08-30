export type AtlasEntityKind =
  | "marketplace-order"
  | "receipt"
  | "gift"
  | "bill-split"
  | "transaction-hash";

export type AtlasEntityReference =
  | "explicit"
  | "latest"
  | "previous"
  | "current";

export type AtlasExtractedEntity = {
  kind: AtlasEntityKind;
  reference: AtlasEntityReference;
  value?: string;
};

const TRANSACTION_HASH = /\b0x[a-fA-F0-9]{64}\b/;

type RecordEntityKind = Exclude<AtlasEntityKind, "transaction-hash">;

type ExplicitEntityPattern = {
  kind: RecordEntityKind;
  patterns: readonly RegExp[];
};

const EXPLICIT_PATTERNS: readonly ExplicitEntityPattern[] = [
  {
    kind: "marketplace-order",
    patterns: [
      /\b(?:order|purchase)\s+(?:id|number)\s*[:#-]?\s*([a-z0-9][a-z0-9-]*)\b/i,
      /\b(?:order|purchase)\s*#\s*([a-z0-9][a-z0-9-]*)\b/i,
      /\b(?:order|purchase)\s+((?:tv|order|purchase)-[a-z0-9-]+)\b/i,
    ],
  },
  {
    kind: "receipt",
    patterns: [
      /\breceipt\s+(?:id|number)\s*[:#-]?\s*([a-z0-9][a-z0-9-]*)\b/i,
      /\breceipt\s*#\s*([a-z0-9][a-z0-9-]*)\b/i,
      /\breceipt\s+((?:tv|receipt)-[a-z0-9-]+)\b/i,
    ],
  },
  {
    kind: "gift",
    patterns: [
      /\b(?:gift(?:\s+vault)?)\s+(?:id|number)\s*[:#-]?\s*(\d+)\b/i,
      /\b(?:gift(?:\s+vault)?)\s*#\s*(\d+)\b/i,
      /\b(?:gift(?:\s+vault)?)\s+(\d+)\b/i,
    ],
  },
  {
    kind: "bill-split",
    patterns: [
      /\b(?:bill\s+split|split)\s+(?:id|number)\s*[:#-]?\s*([a-z0-9][a-z0-9-]*)\b/i,
      /\b(?:bill\s+split|split)\s*#\s*([a-z0-9][a-z0-9-]*)\b/i,
      /\b(?:bill\s+split|split)\s+((?:bill|split)-[a-z0-9-]+)\b/i,
    ],
  },
];

const CONTEXTUAL_PATTERNS: readonly {
  kind: RecordEntityKind;
  reference: Exclude<AtlasEntityReference, "explicit">;
  pattern: RegExp;
}[] = [
  {
    kind: "marketplace-order",
    reference: "latest",
    pattern:
      /\b(?:the\s+)?(?:latest|newest|most\s+recent)\s+(?:order|purchase)\b/i,
  },
  {
    kind: "marketplace-order",
    reference: "previous",
    pattern:
      /\b(?:the\s+)?(?:previous|last)\s+(?:order|purchase)\b/i,
  },
  {
    kind: "marketplace-order",
    reference: "current",
    pattern:
      /\b(?:the\s+)?(?:this|that|current|same)\s+(?:order|purchase)\b/i,
  },

  {
    kind: "receipt",
    reference: "latest",
    pattern:
      /\b(?:the\s+)?(?:latest|newest|most\s+recent)\s+receipt\b/i,
  },
  {
    kind: "receipt",
    reference: "previous",
    pattern:
      /\b(?:the\s+)?(?:previous|last)\s+receipt\b/i,
  },
  {
    kind: "receipt",
    reference: "current",
    pattern:
      /\b(?:the\s+)?(?:this|that|current|same)\s+receipt\b/i,
  },

  {
    kind: "gift",
    reference: "latest",
    pattern:
      /\b(?:the\s+)?(?:latest|newest|most\s+recent)\s+gift(?:\s+vault)?\b/i,
  },
  {
    kind: "gift",
    reference: "previous",
    pattern:
      /\b(?:the\s+)?(?:previous|last)\s+gift(?:\s+vault)?\b/i,
  },
  {
    kind: "gift",
    reference: "current",
    pattern:
      /\b(?:the\s+)?(?:this|that|current|same)\s+gift(?:\s+vault)?\b/i,
  },

  {
    kind: "bill-split",
    reference: "latest",
    pattern:
      /\b(?:the\s+)?(?:latest|newest|most\s+recent)\s+(?:bill\s+split|split)\b/i,
  },
  {
    kind: "bill-split",
    reference: "previous",
    pattern:
      /\b(?:the\s+)?(?:previous|last)\s+(?:bill\s+split|split)\b/i,
  },
  {
    kind: "bill-split",
    reference: "current",
    pattern:
      /\b(?:the\s+)?(?:this|that|current|same)\s+(?:bill\s+split|split)\b/i,
  },
];

function explicitValues(
  message: string,
  patterns: readonly RegExp[],
): readonly string[] {
  const matches: { index: number; value: string }[] = [];

  for (const pattern of patterns) {
    const flags = pattern.flags.includes("g")
      ? pattern.flags
      : `${pattern.flags}g`;
    const globalPattern = new RegExp(pattern.source, flags);

    for (const match of message.matchAll(globalPattern)) {
      const value = match[1];

      if (!value || match.index === undefined) continue;

      matches.push({
        index: match.index,
        value,
      });
    }
  }

  matches.sort((left, right) => left.index - right.index);

  const seen = new Set<string>();
  const values: string[] = [];

  for (const match of matches) {
    const key = match.value.toLowerCase();

    if (seen.has(key)) continue;

    seen.add(key);
    values.push(match.value);
  }

  return values;
}

export function extractAtlasEntities(
  message: string,
): readonly AtlasExtractedEntity[] {
  const normalized = message.trim();

  if (!normalized) return [];

  const entities: AtlasExtractedEntity[] = [];

  const transactionHash = normalized.match(TRANSACTION_HASH)?.[0];

  if (transactionHash) {
    entities.push({
      kind: "transaction-hash",
      reference: "explicit",
      value: transactionHash,
    });
  }

  for (const candidate of EXPLICIT_PATTERNS) {
    const values = explicitValues(normalized, candidate.patterns);

    for (const value of values) {
      entities.push({
        kind: candidate.kind,
        reference: "explicit",
        value,
      });
    }
  }

  for (const candidate of CONTEXTUAL_PATTERNS) {
    const alreadyExtracted = entities.some(
      (entity) => entity.kind === candidate.kind,
    );

    if (alreadyExtracted) continue;

    if (!candidate.pattern.test(normalized)) continue;

    entities.push({
      kind: candidate.kind,
      reference: candidate.reference,
    });
  }

  return entities;
}
