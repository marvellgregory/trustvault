import { getAtlasRouteContext } from "./atlas-route-context";

const ATLAS_STARTER_PROMPTS: Readonly<Record<string, readonly string[]>> = {
  marketplace: [
    "How does Marketplace checkout work?",
    "Where can I find my orders?",
  ],
  "gift-vault": [
    "How does Gift Vault work?",
    "How do I manage a gift?",
  ],
  "bill-split": [
    "How does Bill Split work?",
    "Where can I review a split?",
  ],
  receipts: [
    "Where can I find my receipts?",
    "How do I verify activity?",
  ],
  "payment-review": [
    "What should I check before approval?",
    "How does wallet approval work?",
  ],
  support: [
    "Help me find the right support option",
    "I have a security concern",
  ],
  general: [
    "What can I do in TrustVault?",
    "How do wallet approvals work?",
  ],
};

export const ATLAS_SURFACE_SECURITY_NOTICE =
  "Never share a seed phrase or private key. Atlas never moves funds.";

export function getAtlasStarterPrompts(pathname: string): readonly string[] {
  const kind = getAtlasRouteContext(pathname).kind;
  return ATLAS_STARTER_PROMPTS[kind] ?? ATLAS_STARTER_PROMPTS.general;
}
