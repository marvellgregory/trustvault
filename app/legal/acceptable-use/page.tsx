import type { Metadata } from "next";

import { InformationPage } from "@/components/information/InformationPage";

export const metadata: Metadata = {
  title: "Acceptable Use",
  description:
    "Rules designed to protect TrustVault customers and product integrity.",
};

const sections = [
  {
    title: "Prohibited misuse",
    bullets: [
      "Do not use TrustVault to deceive, impersonate or defraud another person.",
      "Do not attempt to bypass wallet, transaction review or security controls.",
      "Do not use TrustVault to distribute malicious software or harmful links.",
      "Do not interfere with TrustVault infrastructure, availability or other customers.",
      "Do not use TrustVault for activity that is unlawful in the applicable jurisdiction.",
    ],
  },
  {
    title: "Wallet and credential safety",
    paragraphs: [
      "Customers must not submit private keys, seed phrases, recovery phrases or passwords through TrustVault forms, messages or support channels.",
    ],
  },
  {
    title: "Marketplace integrity",
    paragraphs: [
      "Seller and product information should be accurate and should not intentionally mislead customers.",
    ],
  },
  {
    title: "Enforcement",
    paragraphs: [
      "TrustVault may restrict access to application functionality where reasonably necessary to protect customers, software integrity or legal obligations.",
    ],
  },
] as const;

export default function AcceptableUsePage() {
  return (
    <InformationPage
      eyebrow="Legal"
      title="Acceptable Use"
      description="Rules for using TrustVault responsibly and protecting customers, wallets and product integrity."
      sections={sections}
      updated="24 August 2026"
      backHref="/legal"
      backLabel="Back to Legal"
    />
  );
}