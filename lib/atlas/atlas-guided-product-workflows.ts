import { extractAtlasEntities } from "./atlas-entity-extraction";
import {
  containsAtlasGuidedWorkflowSecret,
  resolveAtlasGuidedWorkflow,
  type AtlasGuidedWorkflowDefinition,
  type AtlasGuidedWorkflowFeatureId,
  type AtlasGuidedWorkflowInput,
  type AtlasGuidedWorkflowResult,
  type AtlasGuidedWorkflowValues,
} from "./atlas-guided-workflow.js";

const USDC_AMOUNT = /\b(\d+(?:\.\d{1,6})?)\s+USDC\b/gi;
const EVM_ADDRESS = /^0x[a-fA-F0-9]{40}$/;

function normalizedString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function positiveUsdc(value: unknown): boolean {
  const normalized = normalizedString(value);
  return /^\d+(\.\d{1,6})?$/.test(normalized) && Number(normalized) > 0;
}

function usdcBaseUnits(value: unknown): bigint | null {
  const normalized = normalizedString(value);
  if (!positiveUsdc(normalized)) return null;

  const [whole, fractional = ""] = normalized.split(".");
  return BigInt(whole) * BigInt(1_000_000) + BigInt(fractional.padEnd(6, "0"));
}

function validBillParticipants(values: Readonly<AtlasGuidedWorkflowValues>): boolean {
  const participants = values.participants;
  if (!Array.isArray(participants) || participants.length < 2) return false;

  const wallets = new Set<string>();
  let customTotal = BigInt(0);

  for (const participant of participants) {
    const name = normalizedString(participant.name);
    const walletAddress = normalizedString(participant.walletAddress);

    if (name.length < 2 || !EVM_ADDRESS.test(walletAddress)) return false;
    wallets.add(walletAddress.toLowerCase());

    if (values.splitMethod === "custom") {
      const customAmount = usdcBaseUnits(participant.customAmount);
      if (customAmount === null) return false;
      customTotal += customAmount;
    }
  }

  if (wallets.size !== participants.length) return false;

  if (values.splitMethod === "custom") {
    return customTotal === usdcBaseUnits(values.totalAmount);
  }

  return true;
}

const BILL_SPLIT_DEFINITION: AtlasGuidedWorkflowDefinition = {
  workflowId: "guided-bill-split",
  featureId: "bill-split",
  acceptedFields: ["title", "totalAmount", "participants", "splitMethod", "note"],
  optionalFields: ["note"],
  getSteps: () => [
    {
      id: "bill-details",
      label: "Bill details",
      fields: ["title", "totalAmount"],
      nextPrompt: "What title and exact USDC total should this Bill Split use?",
      navigationRoute: "/bill-split",
      navigationLabel: "Open Bill Split",
    },
    {
      id: "participants",
      label: "Participants",
      fields: ["participants"],
      nextPrompt:
        "Add at least two participant names and their EVM wallet addresses in Bill Split.",
      navigationRoute: "/bill-split",
      navigationLabel: "Add participants",
    },
    {
      id: "split-method",
      label: "Split method",
      fields: ["splitMethod"],
      nextPrompt: "Should the bill use the existing equal or custom split method?",
      navigationRoute: "/bill-split",
      navigationLabel: "Choose split method",
    },
  ],
  isFieldComplete(field, values) {
    if (field === "title") return normalizedString(values.title).length >= 2;
    if (field === "totalAmount") return positiveUsdc(values.totalAmount);
    if (field === "participants") return validBillParticipants(values);
    if (field === "splitMethod") {
      return values.splitMethod === "equal" || values.splitMethod === "custom";
    }
    return false;
  },
  reviewPrompt:
    "The Bill Split details are ready for you to review in TrustVault. Atlas will not create or pay it for you.",
  reviewRoute: "/bill-split",
  reviewLabel: "Review Bill Split",
};

const GIFT_VAULT_DEFINITION: AtlasGuidedWorkflowDefinition = {
  workflowId: "guided-gift-vault",
  featureId: "gift-vault",
  acceptedFields: [
    "giftMode",
    "recipientName",
    "walletAddress",
    "amount",
    "unlockDate",
    "unlockTime",
    "timeZone",
    "message",
  ],
  optionalFields: ["message"],
  getSteps: (values) => [
    {
      id: "gift-mode",
      label: "Gifting mode",
      fields: ["giftMode"],
      nextPrompt: "Would you like to use Send Now or Lock for Later?",
      navigationRoute: "/gift-vault",
      navigationLabel: "Open Gift Vault",
    },
    {
      id: "recipient",
      label: "Recipient",
      fields: ["recipientName", "walletAddress"],
      nextPrompt: "Add the recipient name and their EVM wallet address.",
      navigationRoute: "/gift-vault",
      navigationLabel: "Add gift recipient",
    },
    {
      id: "amount",
      label: "Gift amount",
      fields: ["amount"],
      nextPrompt: "What exact USDC amount would you like to gift?",
      navigationRoute: "/gift-vault",
      navigationLabel: "Add gift amount",
    },
    ...(values.giftMode === "lock-later"
      ? [
          {
            id: "unlock-schedule",
            label: "Unlock schedule",
            fields: ["unlockDate", "unlockTime", "timeZone"] as const,
            nextPrompt:
              "Choose the future unlock date, time and timezone in Gift Vault.",
            navigationRoute: "/gift-vault",
            navigationLabel: "Set unlock schedule",
          },
        ]
      : []),
  ],
  isFieldComplete(field, values) {
    if (field === "giftMode") {
      return values.giftMode === "send-now" || values.giftMode === "lock-later";
    }
    if (field === "recipientName") {
      return normalizedString(values.recipientName).length >= 2;
    }
    if (field === "walletAddress") {
      return EVM_ADDRESS.test(normalizedString(values.walletAddress));
    }
    if (field === "amount") return positiveUsdc(values.amount);
    if (field === "unlockDate") return normalizedString(values.unlockDate).length > 0;
    if (field === "unlockTime") return normalizedString(values.unlockTime).length > 0;
    if (field === "timeZone") return normalizedString(values.timeZone).length > 0;
    return false;
  },
  reviewPrompt:
    "The gift details are ready for TrustVault review. You remain responsible for confirmation and wallet signing.",
  reviewRoute: "/gift-vault",
  reviewLabel: "Review Gift",
};

function marketplaceSteps(
  values: Readonly<AtlasGuidedWorkflowValues>,
): ReturnType<AtlasGuidedWorkflowDefinition["getSteps"]> {
  const productId = normalizedString(values.productId);
  const productRoute = productId
    ? `/marketplace/product/${encodeURIComponent(productId)}`
    : "/marketplace";

  return [
    {
      id: "product-selection",
      label: "Product selection",
      fields: ["productContext"],
      nextPrompt: "Choose a product from the TrustVault Marketplace.",
      navigationRoute: "/marketplace",
      navigationLabel: "Open Marketplace",
    },
    {
      id: "cart",
      label: "Cart",
      fields: ["cart"],
      nextPrompt: "Review the product and add the intended quantity to your cart.",
      navigationRoute: productRoute,
      navigationLabel: productId ? "Open product" : "Open Marketplace",
    },
    {
      id: "checkout-details",
      label: "Checkout details",
      fields: [
        "fullName",
        "email",
        "addressLine1",
        "city",
        "state",
        "postalCode",
        "country",
      ],
      nextPrompt:
        "Complete the required buyer and delivery details in Marketplace checkout.",
      navigationRoute: "/checkout",
      navigationLabel: "Continue to Checkout",
    },
  ];
}

const MARKETPLACE_DEFINITION: AtlasGuidedWorkflowDefinition = {
  workflowId: "guided-marketplace-checkout",
  featureId: "marketplace",
  acceptedFields: [
    "productId",
    "cartItemCount",
    "quantity",
    "fullName",
    "email",
    "phone",
    "addressLine1",
    "addressLine2",
    "city",
    "state",
    "postalCode",
    "country",
  ],
  optionalFields: ["quantity", "phone", "addressLine2"],
  getSteps: marketplaceSteps,
  isFieldComplete(field, values) {
    if (field === "productContext") {
      return (
        normalizedString(values.productId).length > 0 ||
        (typeof values.cartItemCount === "number" && values.cartItemCount > 0)
      );
    }
    if (field === "cart") {
      return typeof values.cartItemCount === "number" && values.cartItemCount > 0;
    }
    if (field === "email") {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedString(values.email));
    }
    if (
      field === "fullName" ||
      field === "addressLine1" ||
      field === "city" ||
      field === "state" ||
      field === "postalCode" ||
      field === "country"
    ) {
      return normalizedString(values[field]).length > 0;
    }
    return false;
  },
  reviewPrompt:
    "The cart and checkout details are ready for TrustVault review. Atlas will not place the order or approve payment.",
  reviewRoute: "/checkout",
  reviewLabel: "Review Checkout",
};

export const ATLAS_GUIDED_PRODUCT_WORKFLOWS: readonly AtlasGuidedWorkflowDefinition[] = [
  BILL_SPLIT_DEFINITION,
  GIFT_VAULT_DEFINITION,
  MARKETPLACE_DEFINITION,
] as const;

export function getAtlasGuidedProductWorkflow(
  featureId: AtlasGuidedWorkflowFeatureId | string,
): AtlasGuidedWorkflowDefinition | undefined {
  return ATLAS_GUIDED_PRODUCT_WORKFLOWS.find(
    (definition) => definition.featureId === featureId,
  );
}

function currentTurnValues(
  featureId: AtlasGuidedWorkflowFeatureId,
  message: string | undefined,
): AtlasGuidedWorkflowValues {
  if (!message || containsAtlasGuidedWorkflowSecret(message)) return {};
  if (
    extractAtlasEntities(message).some(
      (entity) => entity.kind === "transaction-hash",
    )
  ) {
    return {};
  }

  const amounts = [...message.matchAll(USDC_AMOUNT)].map((match) => match[1]);
  const uniqueAmounts = [...new Set(amounts)];
  const values: AtlasGuidedWorkflowValues = {};

  if (uniqueAmounts.length === 1) {
    if (featureId === "bill-split") values.totalAmount = uniqueAmounts[0];
    if (featureId === "gift-vault") values.amount = uniqueAmounts[0];
  }

  if (featureId === "bill-split") {
    if (/\b(?:equal|equally)\b/i.test(message)) values.splitMethod = "equal";
    if (/\bcustom(?: split)?\b/i.test(message)) values.splitMethod = "custom";
  }

  if (featureId === "gift-vault") {
    if (/\b(?:send now|immediate(?:ly)?)\b/i.test(message)) {
      values.giftMode = "send-now";
    }
    if (/\b(?:lock for later|timed gift|unlock)\b/i.test(message)) {
      values.giftMode = "lock-later";
    }
  }

  return values;
}

export function resolveAtlasGuidedProductWorkflow(
  input: AtlasGuidedWorkflowInput,
): AtlasGuidedWorkflowResult | null {
  if (!input.featureId) return null;

  const definition = getAtlasGuidedProductWorkflow(input.featureId);
  if (!definition) return null;

  return resolveAtlasGuidedWorkflow(definition, {
    ...input,
    currentTurnValues: {
      ...currentTurnValues(definition.featureId, input.message),
      ...(input.currentTurnValues ?? {}),
    },
  });
}

export function isAtlasGuidedWorkflowKnowledgeQuestion(message: string): boolean {
  return /^\s*(?:what (?:is|are)|what's|how (?:does|do) .+ work|tell me about|explain)\b/i.test(
    message,
  );
}

export function isAtlasGuidedWorkflowFeature(
  featureId: string | undefined,
): featureId is AtlasGuidedWorkflowFeatureId {
  return Boolean(featureId && getAtlasGuidedProductWorkflow(featureId));
}
