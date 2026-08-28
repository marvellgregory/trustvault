import type { Metadata } from "next";

import { InformationPage } from "@/components/information/InformationPage";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How TrustVault handles customer information and privacy.",
};

const sections = [
  {
    title: "Information TrustVault may process",
    bullets: [
      "Customer profile information voluntarily provided through TrustVault.",
      "Wallet addresses and network information needed to support customer initiated blockchain actions.",
      "Marketplace orders, receipts, Gift Vault records, Bill Split records, notifications and activity information needed to provide TrustVault features.",
      "Technical information required for security, reliability and troubleshooting.",
    ],
  },
  {
    title: "Wallet secrets",
    paragraphs: [
      "TrustVault does not require customers to provide private keys, seed phrases or wallet recovery phrases.",
      "Wallet signing authority remains with the customer and the customer's wallet provider.",
    ],
  },
  {
    title: "Why information is used",
    bullets: [
      "Provide and restore customer account experiences.",
      "Maintain orders, receipts and customer initiated records.",
      "Deliver notifications and product functionality.",
      "Protect TrustVault against abuse, fraud and technical failures.",
      "Improve reliability and customer support.",
    ],
  },
  {
    title: "Onchain information",
    paragraphs: [
      "Public blockchain transactions may be visible permanently on the relevant network and blockchain explorer. Public onchain records cannot be treated like ordinary private application data.",
    ],
  },
  {
    title: "Browser storage",
    paragraphs: [
      "Some customer experiences, including local Marketplace state such as cart or Wishlist information, may be stored in the customer's browser or installed web application.",
      "Browser data may be removed by the customer, browser, operating system or storage settings.",
    ],
  },
] as const;

export default function PrivacyPage() {
  return (
    <InformationPage
      eyebrow="Legal"
      title="Privacy Policy"
      description="How TrustVault handles customer information across account, Marketplace and onchain experiences."
      sections={sections}
      updated="24 August 2026"
      backHref="/legal"
      backLabel="Back to Legal"
    />
  );
}