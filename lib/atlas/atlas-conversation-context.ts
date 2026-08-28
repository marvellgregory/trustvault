import type {
  AtlasIntent,
  AtlasResponsePlan,
} from "./atlas-types.js";

export type AtlasConversationReference =
  | {
      type: "marketplace-order";
      id: string;
      receiptId?: string;
    }
  | {
      type: "receipt";
      id: string;
    }
  | {
      type: "gift";
      id: string;
    }
  | {
      type: "bill-split";
      id: string;
    };

export type AtlasConversationContext = {
  previousIntent?: AtlasIntent;
  reference?: AtlasConversationReference;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : null;
}

function stringValue(
  record: Record<string, unknown>,
  key: string,
): string | undefined {
  const value = record[key];
  return typeof value === "string" && value.trim().length > 0
    ? value
    : undefined;
}

export function createAtlasConversationContext(
  plan: AtlasResponsePlan,
): AtlasConversationContext {
  const data = asRecord(plan.data);
  const selected = data ? asRecord(data.selected) : null;

  let reference: AtlasConversationReference | undefined;

  if (selected) {
    const id = stringValue(selected, "id");

    if (id) {
      switch (plan.intent) {
        case "marketplace-order": {
          reference = {
            type: "marketplace-order",
            id,
            ...(stringValue(selected, "receiptId")
              ? { receiptId: stringValue(selected, "receiptId") }
              : {}),
          };
          break;
        }

        case "receipt":
          reference = { type: "receipt", id };
          break;

        case "gift":
          reference = { type: "gift", id };
          break;

        case "bill-split":
          reference = { type: "bill-split", id };
          break;

        default:
          break;
      }
    }
  }

  return {
    previousIntent: plan.intent,
    ...(reference ? { reference } : {}),
  };
}

export function clearAtlasConversationContext(): AtlasConversationContext {
  return {};
}
