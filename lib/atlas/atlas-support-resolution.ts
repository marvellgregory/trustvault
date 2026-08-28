import { getConfiguredSupportOptions } from "./atlas-support";
import type {
  AtlasIssueCategory,
  AtlasSupportContext,
  AtlasSupportOption,
} from "./atlas-types.js";

const SUPPORT_ORDER: Record<AtlasIssueCategory, readonly string[]> = {
  wallet: ["help-center", "contact-page", "support-email"],
  network: ["help-center", "contact-page", "support-email"],
  "marketplace-order": ["contact-page", "support-email", "help-center"],
  delivery: ["contact-page", "support-email", "help-center"],
  payment: ["help-center", "contact-page", "support-email"],
  receipt: ["help-center", "contact-page", "support-email"],
  "gift-vault": ["help-center", "contact-page", "support-email"],
  "bill-split": ["help-center", "contact-page", "support-email"],
  account: ["contact-page", "support-email", "help-center"],
  security: ["responsible-disclosure", "support-email", "contact-page"],
  "refund-dispute": ["contact-page", "support-email", "help-center"],
  business: ["contact-page", "support-linkedin", "support-email"],
  general: ["help-center", "contact-page", "support-email"],
};

const RESPONSIBLE_DISCLOSURE: AtlasSupportOption = {
  id: "responsible-disclosure",
  channel: "contact",
  label: "Responsible Disclosure",
  destination: "/responsible-disclosure",
  description: "Private guidance for reporting a potential TrustVault security issue.",
  rank: 1,
};

export function rankAtlasSupportOptions(
  category: AtlasIssueCategory,
): readonly AtlasSupportOption[] {
  const configured = getConfiguredSupportOptions();
  const options =
    category === "security"
      ? [RESPONSIBLE_DISCLOSURE, ...configured]
      : configured;
  const byId = new Map(options.map((option) => [option.id, option]));

  return SUPPORT_ORDER[category].flatMap((id, index) => {
    const option = byId.get(id);
    return option ? [{ ...option, rank: index + 1 }] : [];
  });
}

export type AtlasSafeSupportReferences = Partial<{
  orderId: string;
  giftId: string;
  billId: string;
  receiptId: string;
  transactionHash: string;
}>;

export function createAtlasSupportContext(
  issueCategory: AtlasIssueCategory,
  input: AtlasSafeSupportReferences = {},
): AtlasSupportContext {
  const references: Array<AtlasSupportContext["references"][number]> = [];
  if (input.orderId) references.push({ label: "Order ID", value: input.orderId });
  if (input.giftId) references.push({ label: "Gift ID", value: input.giftId });
  if (input.billId) references.push({ label: "Bill ID", value: input.billId });
  if (input.receiptId) references.push({ label: "Receipt ID", value: input.receiptId });
  if (input.transactionHash && /^0x[a-fA-F0-9]{64}$/.test(input.transactionHash)) {
    references.push({ label: "Transaction hash", value: input.transactionHash });
  }
  return { issueCategory, references };
}
