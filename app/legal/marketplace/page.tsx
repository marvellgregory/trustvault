import type { Metadata } from "next";

import { InformationPage } from "@/components/information/InformationPage";

export const metadata: Metadata = {
  title: "Marketplace Terms",
  description:
    "Terms relevant to TrustVault Marketplace purchases and sellers.",
};

const sections = [
  {
    title: "Marketplace role",
    paragraphs: [
      "TrustVault provides Marketplace software that allows customers to discover products, review seller information, build a cart and prepare eligible purchases.",
      "Product availability, descriptions, inventory, fulfillment and seller supplied information may depend on the relevant seller.",
    ],
  },
  {
    title: "Pricing and transaction review",
    paragraphs: [
      "Customers should review the displayed product price, quantity, seller information, wallet address, network and transaction details before approving payment.",
    ],
  },
  {
    title: "Escrow eligibility",
    paragraphs: [
      "A product marked escrow eligible indicates that the relevant TrustVault purchase flow may support an escrow based transaction path where that functionality is actually available.",
      "The label does not guarantee that every order will enter escrow or that every dispute will result in a refund.",
    ],
  },
  {
    title: "Orders and receipts",
    paragraphs: [
      "TrustVault may maintain application records of Marketplace orders and receipts while blockchain transaction information remains governed by the relevant onchain transaction.",
    ],
  },
  {
    title: "Seller responsibility",
    paragraphs: [
      "Sellers remain responsible for the accuracy of seller supplied product information and for fulfillment obligations applicable to their products.",
    ],
  },
] as const;

export default function MarketplaceTermsPage() {
  return (
    <InformationPage
      eyebrow="Legal"
      title="Marketplace Terms"
      description="Terms applying to TrustVault Marketplace browsing, orders, sellers and eligible transaction flows."
      sections={sections}
      updated="24 August 2026"
      backHref="/legal"
      backLabel="Back to Legal"
    />
  );
}