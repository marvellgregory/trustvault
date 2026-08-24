import type { Metadata } from "next";

import { InformationPage } from "@/components/information/InformationPage";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Verified ways to contact TrustVault for product questions, feedback and responsible security reports.",
};

const sections = [
  {
    title: "General contact",
    paragraphs: [
      "For TrustVault product questions, feedback or general enquiries, use the contact channels already published by the project.",
    ],
    bullets: [
      "Email: marvellgregory85@gmail.com",
      "X: @YoungestGrandad",
      "Farcaster: @youngestgrandad",
      "LinkedIn: Marvell Darlyn Gregory",
    ],
  },
  {
    title: "Product feedback",
    paragraphs: [
      "Useful feedback includes the TrustVault page or flow being tested, what happened, what was expected and whether the issue occurred on desktop, mobile browser or an installed application experience.",
      "When reporting a transaction related issue, include a public transaction hash only when it is relevant and safe to share.",
    ],
  },
  {
    title: "Wallet and account safety",
    paragraphs: [
      "Do not send private keys, seed phrases, recovery phrases, passwords or other wallet secrets through email, social channels or TrustVault support communication.",
      "TrustVault does not need those credentials to investigate a product issue.",
    ],
  },
  {
    title: "Security reports",
    paragraphs: [
      "Potential security vulnerabilities should follow the Responsible Disclosure guidance rather than being posted publicly before the issue has been reviewed.",
      "The current published email contact may be used for a responsible security report.",
    ],
  },
] as const;

export default function ContactPage() {
  return (
    <InformationPage
      eyebrow="Contact"
      title="Talk to TrustVault"
      description="Verified contact channels for product questions, feedback and responsible reporting."
      sections={sections}
      updated="24 August 2026"
      backHref="/"
      backLabel="Back to TrustVault"
    />
  );
}