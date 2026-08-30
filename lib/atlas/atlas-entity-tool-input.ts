import {
  extractAtlasEntities,
  type AtlasEntityKind,
  type AtlasExtractedEntity,
} from "./atlas-entity-extraction";

type AtlasEntityAwareToolInput = Record<string, string>;

const TOOL_ENTITY_KIND: Readonly<Record<string, AtlasEntityKind>> = {
  find_my_marketplace_orders: "marketplace-order",
  find_my_receipts: "receipt",
  find_my_gifts: "gift",
  find_my_bill_splits: "bill-split",
  get_my_order_delivery: "marketplace-order",
};

export function buildAtlasEntityAwareToolInput(
  toolId: string,
  message: string,
  entities: readonly AtlasExtractedEntity[] = extractAtlasEntities(message),
): AtlasEntityAwareToolInput {
  const expectedKind = TOOL_ENTITY_KIND[toolId];

  const explicitEntity = expectedKind
    ? entities.find(
        (entity) =>
          entity.kind === expectedKind &&
          entity.reference === "explicit" &&
          typeof entity.value === "string" &&
          entity.value.length > 0,
      )
    : undefined;

  if (toolId === "find_my_gifts") {
    return {
      giftId: explicitEntity?.value ?? "",
    };
  }

  return {
    query: explicitEntity?.value ?? message,
  };
}