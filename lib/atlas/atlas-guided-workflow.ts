import type { AtlasFeatureId, AtlasFeaturePurpose } from "./atlas-feature-registry.js";
import type { AtlasAction } from "./atlas-types.js";

export const ATLAS_GUIDED_WORKFLOW_STATUSES = [
  "IDLE",
  "IN_PROGRESS",
  "NEEDS_INPUT",
  "READY_FOR_REVIEW",
  "AWAITING_USER_CONFIRMATION",
  "COMPLETE",
  "BLOCKED",
] as const;

export type AtlasGuidedWorkflowStatus =
  (typeof ATLAS_GUIDED_WORKFLOW_STATUSES)[number];

export type AtlasGuidedWorkflowFeatureId = Extract<
  AtlasFeatureId,
  "bill-split" | "gift-vault" | "marketplace"
>;

export type AtlasGuidedWorkflowField =
  | "title"
  | "totalAmount"
  | "participants"
  | "splitMethod"
  | "note"
  | "giftMode"
  | "recipientName"
  | "walletAddress"
  | "amount"
  | "unlockDate"
  | "unlockTime"
  | "timeZone"
  | "message"
  | "productId"
  | "cartItemCount"
  | "quantity"
  | "fullName"
  | "email"
  | "phone"
  | "addressLine1"
  | "addressLine2"
  | "city"
  | "state"
  | "postalCode"
  | "country"
  | "productContext"
  | "cart";

export type AtlasGuidedWorkflowParticipant = {
  name: string;
  walletAddress: string;
  customAmount?: string;
};

export type AtlasGuidedWorkflowValues = Partial<{
  title: string;
  totalAmount: string;
  participants: readonly AtlasGuidedWorkflowParticipant[];
  splitMethod: "equal" | "custom";
  note: string;
  giftMode: "send-now" | "lock-later";
  recipientName: string;
  walletAddress: string;
  amount: string;
  unlockDate: string;
  unlockTime: string;
  timeZone: string;
  message: string;
  productId: string;
  cartItemCount: number;
  quantity: number;
  fullName: string;
  email: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}>;

export type AtlasGuidedWorkflowInput = {
  featureId?: AtlasGuidedWorkflowFeatureId | string;
  pathname: string;
  message?: string;
  requestedAction?: AtlasFeaturePurpose | "continue" | "review";
  conversationValues?: Readonly<AtlasGuidedWorkflowValues>;
  knownValues?: Readonly<AtlasGuidedWorkflowValues>;
  currentTurnValues?: Readonly<AtlasGuidedWorkflowValues>;
};

export type AtlasGuidedWorkflowApplicationState = Omit<
  AtlasGuidedWorkflowInput,
  "pathname" | "message"
>;

export type AtlasGuidedWorkflowStep = {
  id: string;
  label: string;
  fields: readonly AtlasGuidedWorkflowField[];
  nextPrompt: string;
  navigationRoute: string;
  navigationLabel: string;
};

type AtlasGuidedWorkflowNavigationAction = Extract<
  AtlasAction,
  { type: "navigate" }
>;

export type AtlasGuidedWorkflowResult = {
  workflowId: string;
  featureId: AtlasGuidedWorkflowFeatureId;
  status: AtlasGuidedWorkflowStatus;
  currentStep: string;
  completedSteps: readonly string[];
  requiredFields: readonly AtlasGuidedWorkflowField[];
  optionalFields: readonly AtlasGuidedWorkflowField[];
  missingFields: readonly AtlasGuidedWorkflowField[];
  nextPrompt: string;
  reviewReady: boolean;
  navigationRoute: string;
  confirmationRequired: boolean;
  confirmationBoundary: "TRUSTVAULT_REVIEW_AND_USER_WALLET";
  safeNextAction: AtlasGuidedWorkflowNavigationAction;
  values: Readonly<AtlasGuidedWorkflowValues>;
};

export type AtlasGuidedWorkflowDefinition = {
  workflowId: string;
  featureId: AtlasGuidedWorkflowFeatureId;
  acceptedFields: readonly (keyof AtlasGuidedWorkflowValues)[];
  optionalFields: readonly AtlasGuidedWorkflowField[];
  getSteps(
    values: Readonly<AtlasGuidedWorkflowValues>,
  ): readonly AtlasGuidedWorkflowStep[];
  isFieldComplete(
    field: AtlasGuidedWorkflowField,
    values: Readonly<AtlasGuidedWorkflowValues>,
  ): boolean;
  reviewPrompt: string;
  reviewRoute: string;
  reviewLabel: string;
};

const SENSITIVE_FIELD_NAME =
  /private.?key|seed.?phrase|mnemonic|password|passcode|one.?time.?password|otp|auth(?:entication)?.?token|access.?token/i;

const SENSITIVE_TEXT =
  /\b(?:private key|seed phrase|recovery phrase|mnemonic phrase|password|one[ -]?time password|authentication token|access token)\b/i;

const PRIVATE_KEY_LIKE_VALUE = /\b0x[a-fA-F0-9]{64}\b/;

export function containsAtlasGuidedWorkflowSecret(
  value: unknown,
  key = "",
): boolean {
  if (SENSITIVE_FIELD_NAME.test(key)) return true;

  if (typeof value === "string") {
    return SENSITIVE_TEXT.test(value) || PRIVATE_KEY_LIKE_VALUE.test(value);
  }

  if (Array.isArray(value)) {
    return value.some((item) => containsAtlasGuidedWorkflowSecret(item));
  }

  if (typeof value === "object" && value !== null) {
    return Object.entries(value).some(([nestedKey, nestedValue]) =>
      containsAtlasGuidedWorkflowSecret(nestedValue, nestedKey),
    );
  }

  return false;
}

function cloneSafeValue(value: unknown): unknown {
  if (
    typeof value === "string" ||
    typeof value === "boolean" ||
    (typeof value === "number" && Number.isFinite(value))
  ) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(cloneSafeValue).filter((item) => item !== undefined);
  }

  if (typeof value === "object" && value !== null) {
    return Object.fromEntries(
      Object.entries(value).flatMap(([key, nestedValue]) => {
        const cloned = cloneSafeValue(nestedValue);
        return cloned === undefined ? [] : [[key, cloned]];
      }),
    );
  }

  return undefined;
}

function sanitizeValues(
  values: Readonly<AtlasGuidedWorkflowValues> | undefined,
  acceptedFields: ReadonlySet<keyof AtlasGuidedWorkflowValues>,
): AtlasGuidedWorkflowValues {
  if (!values || containsAtlasGuidedWorkflowSecret(values)) return {};

  const sanitized: Record<string, unknown> = {};

  for (const [field, value] of Object.entries(values)) {
    if (!acceptedFields.has(field as keyof AtlasGuidedWorkflowValues)) continue;
    if (containsAtlasGuidedWorkflowSecret(value, field)) continue;

    const cloned = cloneSafeValue(value);
    if (cloned !== undefined) sanitized[field] = cloned;
  }

  return sanitized as AtlasGuidedWorkflowValues;
}

function uniqueFields(
  fields: readonly AtlasGuidedWorkflowField[],
): readonly AtlasGuidedWorkflowField[] {
  return [...new Set(fields)];
}

export function resolveAtlasGuidedWorkflow(
  definition: AtlasGuidedWorkflowDefinition,
  input: AtlasGuidedWorkflowInput,
): AtlasGuidedWorkflowResult {
  const acceptedFields = new Set(definition.acceptedFields);
  const values: AtlasGuidedWorkflowValues = {
    ...sanitizeValues(input.conversationValues, acceptedFields),
    ...sanitizeValues(input.knownValues, acceptedFields),
    ...sanitizeValues(input.currentTurnValues, acceptedFields),
  };
  const steps = definition.getSteps(values);
  const requiredFields = uniqueFields(steps.flatMap((step) => step.fields));
  const missingFields = requiredFields.filter(
    (field) => !definition.isFieldComplete(field, values),
  );
  const completedSteps = steps
    .filter((step) =>
      step.fields.every((field) => definition.isFieldComplete(field, values)),
    )
    .map((step) => step.id);
  const currentStep = steps.find((step) =>
    step.fields.some((field) => !definition.isFieldComplete(field, values)),
  );
  const reviewReady = missingFields.length === 0;
  const navigationRoute = currentStep?.navigationRoute ?? definition.reviewRoute;
  const navigationLabel = currentStep?.navigationLabel ?? definition.reviewLabel;

  return {
    workflowId: definition.workflowId,
    featureId: definition.featureId,
    status: reviewReady ? "READY_FOR_REVIEW" : "NEEDS_INPUT",
    currentStep: currentStep?.id ?? "review",
    completedSteps,
    requiredFields,
    optionalFields: definition.optionalFields,
    missingFields,
    nextPrompt: currentStep?.nextPrompt ?? definition.reviewPrompt,
    reviewReady,
    navigationRoute,
    confirmationRequired: reviewReady,
    confirmationBoundary: "TRUSTVAULT_REVIEW_AND_USER_WALLET",
    safeNextAction: {
      type: "navigate",
      label: navigationLabel,
      route: navigationRoute,
    },
    values,
  };
}
