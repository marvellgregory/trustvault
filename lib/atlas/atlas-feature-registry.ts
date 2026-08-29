export type AtlasFeatureId =
  | "marketplace"
  | "marketplace-order"
  | "delivery-tracking"
  | "gift-vault"
  | "bill-split"
  | "receipts"
  | "account"
  | "wallet"
  | "trust-center"
  | "help"
  | "activity"
  | "wishlist"
  | "cart"
  | "swap";

export type AtlasFeaturePurpose =
  | "learn"
  | "start"
  | "manage"
  | "lookup"
  | "navigate"
  | "unknown";

export type AtlasFeatureMatchKind =
  | "exact"
  | "alias"
  | "fuzzy"
  | "none";

export type AtlasFeatureDefinition = {
  id: AtlasFeatureId;
  name: string;
  route: string;
  aliases: readonly string[];
  startAliases?: readonly string[];
  manageAliases?: readonly string[];
  lookupAliases?: readonly string[];
  relatedFeatures?: readonly AtlasFeatureId[];
  requiresAuthForLookup?: boolean;
  privateToolId?: string;
};

export type AtlasFeatureMatch = {
  feature?: AtlasFeatureDefinition;
  purpose: AtlasFeaturePurpose;
  confidence: number;
  kind: AtlasFeatureMatchKind;
  didYouMean: boolean;
};

export const ATLAS_FEATURES: readonly AtlasFeatureDefinition[] = [
  {
    id: "marketplace",
    name: "Marketplace",
    route: "/marketplace",
    aliases: [
      "marketplace",
      "shop",
      "shopping",
      "buy something",
      "browse products",
      "products",
      "show me products",
      "find me something",
      "what can i buy",
      "what can i shop for",
    ],
    startAliases: [
      "start shopping",
      "shop now",
      "browse marketplace",
      "help me shop",
      "i want to shop",
    ],
    relatedFeatures: ["marketplace-order", "cart", "wishlist"],
  },
  {
    id: "marketplace-order",
    name: "Marketplace Orders",
    route: "/marketplace",
    aliases: [
      "orders",
      "purchases",
      "marketplace order",
      "marketplace orders",
      "order history",
      "purchase history",
    ],
    lookupAliases: [
      "my order",
      "my orders",
      "latest order",
      "last order",
      "recent order",
      "my purchase",
      "my purchases",
      "show my order",
      "show my orders",
      "where is my order",
      "where's my order",
      "what did i buy",
      "my last purchase",
      "my recent purchase",
      "show what i bought",
    ],
    relatedFeatures: ["marketplace", "delivery-tracking", "receipts"],
    requiresAuthForLookup: true,
    privateToolId: "find_my_marketplace_orders",
  },
  {
    id: "delivery-tracking",
    name: "Delivery Tracking",
    route: "/marketplace",
    aliases: [
      "delivery tracking",
      "track delivery",
      "package tracking",
      "delivery status",
      "courier status",
      "parcel tracking",
      "track package",
      "track parcel",
    ],
    lookupAliases: [
      "track my order",
      "track my package",
      "where is my package",
      "my delivery",
      "my tracking",
      "my awb",
      "my waybill",
      "my consignment",
      "my courier",
      "where's my package",
      "where is my parcel",
      "where's my parcel",
      "track my parcel",
      "my parcel",
      "my package status",
      "my delivery status",
      "my courier status",
      "has my package moved",
      "has my parcel moved",
    ],
    relatedFeatures: ["marketplace-order", "help"],
    requiresAuthForLookup: true,
    privateToolId: "get_my_order_delivery",
  },
  {
    id: "gift-vault",
    name: "Gift Vault",
    route: "/gift-vault",
    aliases: [
      "gift vault",
      "gift",
      "gifting",
      "send gift",
      "send a gift",
      "send present",
      "send a present",
      "birthday gift",
      "usdc gift",
      "money as a gift",
      "gift someone usdc",
    ],
    startAliases: [
      "create gift",
      "create a gift",
      "send gift",
      "send a gift",
      "send present",
      "send a present",
      "gift someone",
      "give someone usdc",
      "send someone usdc as a gift",
      "send money as a gift",
      "make a gift for someone",
      "i want to gift someone",
    ],
    manageAliases: ["manage gifts", "manage my gifts"],
    lookupAliases: [
      "my gift",
      "my gifts",
      "show my gift",
      "show my gifts",
      "latest gift",
      "last gift",
    ],
    relatedFeatures: ["receipts", "help"],
    requiresAuthForLookup: true,
    privateToolId: "find_my_gifts",
  },
  {
    id: "bill-split",
    name: "Bill Split",
    route: "/bill-split",
    aliases: [
      "bill split",
      "split bill",
      "bill splitting",
      "split payment",
      "share bill",
      "divide bill",
      "dinner bill",
      "split dinner",
      "share expense",
      "split expense",
      "divide expense",
    ],
    startAliases: [
      "start bill split",
      "start a bill split",
      "create bill split",
      "create a bill split",
      "split a bill",
      "split dinner",
      "divide a bill",
      "split this between us",
      "split this between people",
      "divide this among people",
      "share this expense",
      "split this expense",
      "split this with friends",
    ],
    manageAliases: [
      "manage bill split",
      "manage bill splits",
      "manage my bill splits",
    ],
    lookupAliases: [
      "my bill split",
      "my bill splits",
      "show my bill split",
      "show my bill splits",
      "latest bill split",
      "last bill split",
      "recent bill split",
      "latest bill",
      "last bill",
    ],
    relatedFeatures: ["receipts", "help"],
    requiresAuthForLookup: true,
    privateToolId: "find_my_bill_splits",
  },
  {
    id: "receipts",
    name: "Receipts",
    route: "/receipts",
    aliases: [
      "receipt",
      "receipts",
      "receipt center",
      "proof of payment",
      "payment proof",
      "transaction proof",
      "payment receipt",
    ],
    lookupAliases: [
      "my receipt",
      "my receipts",
      "show my receipt",
      "show my receipts",
      "latest receipt",
      "last receipt",
      "show my payment proof",
      "show my transaction proof",
      "proof of my payment",
      "my payment receipt",
    ],
    relatedFeatures: ["marketplace-order", "gift-vault", "bill-split"],
    requiresAuthForLookup: true,
    privateToolId: "find_my_receipts",
  },
  {
    id: "account",
    name: "Account",
    route: "/account",
    aliases: [
      "account",
      "profile",
      "my profile",
      "sign in",
      "sign me in",
      "login",
      "account settings",
    ],
    relatedFeatures: ["wallet", "activity"],
  },
  {
    id: "wallet",
    name: "Wallet",
    route: "/account",
    aliases: [
      "wallet",
      "connect wallet",
      "wallet connection",
      "metamask",
      "binance wallet",
      "bitget wallet",
      "trust wallet",
      "phantom wallet",
      "bybit wallet",
      "link my wallet",
      "connect my wallet",
      "connect metamask",
      "why do i need a wallet",
    ],
    relatedFeatures: ["account", "trust-center"],
  },
  {
    id: "trust-center",
    name: "Trust Center",
    route: "/trust-center",
    aliases: [
      "trust center",
      "security",
      "verification",
      "verify transaction",
      "verify this transaction",
      "verify this payment",
      "check this transaction",
      "is this safe",
      "is this secure",
    ],
    relatedFeatures: ["wallet", "receipts", "help"],
  },
  {
    id: "help",
    name: "Help Center",
    route: "/help",
    aliases: [
      "help",
      "support",
      "help center",
      "contact support",
      "i need assistance",
      "i need help",
      "get help",
      "how do i contact support",
    ],
    relatedFeatures: ["account", "marketplace-order"],
  },
  {
    id: "activity",
    name: "Activity",
    route: "/dashboard",
    aliases: [
      "activity",
      "recent activity",
      "history",
      "transaction history",
      "recent transactions",
      "payment history",
      "what have i done",
    ],
    relatedFeatures: ["account", "receipts"],
  },
  {
    id: "wishlist",
    name: "Wishlist",
    route: "/wishlist",
    aliases: [
      "wishlist",
      "wish list",
      "saved products",
      "saved items",
      "things i saved",
      "products i saved",
    ],
    relatedFeatures: ["marketplace", "cart"],
  },
  {
    id: "cart",
    name: "Cart",
    route: "/cart",
    aliases: [
      "cart",
      "shopping cart",
      "basket",
      "what's in my cart",
      "what is in my cart",
      "what's in my basket",
      "items i'm buying",
      "items i am buying",
    ],
    relatedFeatures: ["marketplace", "wishlist"],
  },
  {
    id: "swap",
    name: "Swap",
    route: "/coming-soon",
    aliases: [
      "swap",
      "token swap",
      "swap usdc",
      "exchange usdc",
      "exchange tokens",
      "convert tokens",
      "convert usdc",
    ],
    relatedFeatures: ["wallet"],
  },
] as const;

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hasPhrase(message: string, phrase: string): boolean {
  const normalizedMessage = ` ${normalize(message)} `;
  const normalizedPhrase = ` ${normalize(phrase)} `;
  return normalizedMessage.includes(normalizedPhrase);
}

function editDistance(left: string, right: string): number {
  const a = normalize(left);
  const b = normalize(right);

  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  const current = new Array<number>(b.length + 1);

  for (let i = 1; i <= a.length; i += 1) {
    current[0] = i;

    for (let j = 1; j <= b.length; j += 1) {
      current[j] = Math.min(
        current[j - 1] + 1,
        previous[j] + 1,
        previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }

    for (let j = 0; j <= b.length; j += 1) {
      previous[j] = current[j];
    }
  }

  return previous[b.length];
}

function similarity(left: string, right: string): number {
  const a = normalize(left);
  const b = normalize(right);
  const longest = Math.max(a.length, b.length);

  if (longest === 0) return 1;
  return 1 - editDistance(a, b) / longest;
}

function determinePurpose(
  message: string,
  feature: AtlasFeatureDefinition,
): AtlasFeaturePurpose {
  const normalized = normalize(message);

  if (
    feature.lookupAliases?.some((alias) => hasPhrase(normalized, alias)) ||
    (
      feature.requiresAuthForLookup &&
      /\b(my|mine|latest|last|recent)\b/.test(normalized)
    )
  ) {
    return "lookup";
  }

  if (feature.manageAliases?.some((alias) => hasPhrase(normalized, alias))) {
    return "manage";
  }

  if (feature.startAliases?.some((alias) => hasPhrase(normalized, alias))) {
    return "start";
  }

  if (/\b(open|go to|take me to|navigate|show page)\b/.test(normalized)) {
    return "navigate";
  }

  return "learn";
}

function allAliases(feature: AtlasFeatureDefinition): readonly string[] {
  return [
    feature.name,
    ...feature.aliases,
    ...(feature.startAliases ?? []),
    ...(feature.manageAliases ?? []),
    ...(feature.lookupAliases ?? []),
  ];
}

export function getAtlasFeature(
  id: AtlasFeatureId,
): AtlasFeatureDefinition | undefined {
  return ATLAS_FEATURES.find((feature) => feature.id === id);
}

export function resolveAtlasFeature(message: string): AtlasFeatureMatch {
  const normalized = normalize(message);

  if (!normalized) {
    return {
      purpose: "unknown",
      confidence: 0,
      kind: "none",
      didYouMean: false,
    };
  }

  const phraseCandidates = ATLAS_FEATURES.flatMap((feature) =>
    allAliases(feature).map((alias) => ({
      feature,
      alias: normalize(alias),
    })),
  ).filter((candidate) => hasPhrase(normalized, candidate.alias));

  if (phraseCandidates.length > 0) {
    phraseCandidates.sort((left, right) => right.alias.length - left.alias.length);
    const winner = phraseCandidates[0];

    return {
      feature: winner.feature,
      purpose: determinePurpose(normalized, winner.feature),
      confidence: 1,
      kind:
        normalize(winner.feature.name) === winner.alias
          ? "exact"
          : "alias",
      didYouMean: false,
    };
  }

  let best:
    | {
        feature: AtlasFeatureDefinition;
        score: number;
      }
    | undefined;

  for (const feature of ATLAS_FEATURES) {
    for (const alias of allAliases(feature)) {
      const candidate = normalize(alias);

      if (candidate.length < 4) continue;

      const score = similarity(normalized, candidate);

      if (!best || score > best.score) {
        best = { feature, score };
      }
    }
  }

  if (best && best.score >= 0.72) {
    return {
      feature: best.feature,
      purpose: determinePurpose(normalized, best.feature),
      confidence: Number(best.score.toFixed(3)),
      kind: "fuzzy",
      didYouMean: true,
    };
  }

  return {
    purpose: "unknown",
    confidence: best ? Number(best.score.toFixed(3)) : 0,
    kind: "none",
    didYouMean: false,
  };
}
