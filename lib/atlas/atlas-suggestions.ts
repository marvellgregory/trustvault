import { getAtlasRouteContext } from "./atlas-route-context";
import type { AtlasAction, AtlasIntent, AtlasSuggestion } from "./atlas-types.js";

const CONTEXT_SUGGESTIONS: Partial<Record<string, AtlasSuggestion>> = {
  marketplace: {
    id: "marketplace-orders",
    label: "View orders",
    action: { type: "navigate", label: "View orders", route: "/marketplace" },
  },
  "gift-vault": {
    id: "manage-gifts",
    label: "Manage gifts",
    action: { type: "navigate", label: "Manage gifts", route: "/gift-vault/manage" },
  },
  "bill-split": {
    id: "open-bill-split",
    label: "Open Bill Split",
    action: { type: "navigate", label: "Open Bill Split", route: "/bill-split" },
  },
  receipts: {
    id: "open-receipts",
    label: "Open receipts",
    action: { type: "navigate", label: "Open receipts", route: "/receipts" },
  },
  "trust-center": {
    id: "open-trust-center",
    label: "Open Trust Center",
    action: { type: "navigate", label: "Open Trust Center", route: "/trust-center" },
  },
  "payment-review": {
    id: "open-payment-review",
    label: "Open Payment Review",
    action: { type: "navigate", label: "Open Payment Review", route: "/payment-review" },
  },
  support: {
    id: "read-help",
    label: "Read Help Center",
    action: { type: "navigate", label: "Read Help Center", route: "/help" },
  },
};

export function createAtlasSuggestions(input: {
  intent: AtlasIntent;
  pathname: string;
  actions: readonly AtlasAction[];
}): readonly AtlasSuggestion[] {
  const suggestions: AtlasSuggestion[] = input.actions.slice(0, 3).map((action, index) => ({
    id:
      action.type === "navigate"
        ? `route:${action.route}`
        : action.type === "support"
          ? `support:${action.optionId}`
          : action.type === "ask-atlas"
            ? `ask:${index}:${action.prompt}`
            : `external:${index}`,
    label: action.label,
    action,
  }));
  const contextual = CONTEXT_SUGGESTIONS[getAtlasRouteContext(input.pathname).kind];
  if (contextual && !suggestions.some((item) => item.id === contextual.id)) {
    suggestions.push(contextual);
  }
  return suggestions.slice(0, 4);
}

