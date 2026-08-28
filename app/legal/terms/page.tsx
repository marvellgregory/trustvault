import type { Metadata } from "next";

import { InformationPage } from "@/components/information/InformationPage";

export const metadata: Metadata = {
  title: "Terms of Use",
  description:
    "General terms governing access to and use of TrustVault.",
};

const sections = [
  {
    title: "Using TrustVault",
    paragraphs: [
      "TrustVault provides software interfaces for Marketplace browsing, gifting, shared payment coordination, transaction review and related customer experiences.",
      "Customers are responsible for using TrustVault lawfully, providing accurate information where required and reviewing transaction details before approving wallet actions.",
    ],
  },
  {
    title: "Wallets and customer authorization",
    paragraphs: [
      "TrustVault does not ask customers to provide wallet private keys, seed phrases or recovery phrases.",
      "When a wallet action is required, the connected wallet remains responsible for presenting and authorizing the transaction. Customers should verify addresses, amounts, networks and transaction details before signing.",
    ],
  },
  {
    title: "Blockchain transactions",
    paragraphs: [
      "Blockchain transactions may become irreversible after submission and confirmation. TrustVault cannot promise that an onchain transaction can be cancelled, reversed or recovered after execution.",
      "Network conditions, wallet software, RPC services and third party infrastructure may affect availability or transaction completion.",
    ],
  },
  {
    title: "Product status",
    paragraphs: [
      "TrustVault may operate on test networks or in staged product environments while features are developed and validated.",
      "Features shown as unavailable, preview, testnet or coming soon should not be treated as production financial services.",
    ],
  },
  {
    title: "Changes and availability",
    paragraphs: [
      "TrustVault may update, suspend or remove software functionality where necessary for security, reliability, product development or legal reasons.",
    ],
  },
] as const;

export default function TermsPage() {
  return (
    <InformationPage
      eyebrow="Legal"
      title="Terms of Use"
      description="General conditions for accessing and using TrustVault."
      sections={sections}
      updated="24 August 2026"
      backHref="/legal"
      backLabel="Back to Legal"
    />
  );
}