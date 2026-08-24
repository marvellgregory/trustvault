import type { Metadata } from "next";

import { InformationPage } from "@/components/information/InformationPage";

export const metadata: Metadata = {
  title: "Documentation",
  description:
    "Current TrustVault product behavior across Marketplace, Gift Vault, Bill Split, wallets, receipts and customer data.",
};

const sections = [
  {
    title: "Current environment",
    paragraphs: [
      "TrustVault currently uses Arc Testnet for supported blockchain transaction flows described in the application.",
      "USDC is the asset used by the current supported payment and gifting experiences. Testnet assets have no guaranteed real world value.",
    ],
  },
  {
    title: "Wallet model",
    paragraphs: [
      "TrustVault uses customer controlled wallets. Wallet signing remains an explicit customer action presented by the connected wallet.",
      "TrustVault does not require private keys, seed phrases or recovery phrases.",
    ],
    bullets: [
      "Wallet connection establishes the active wallet context.",
      "Supported money actions verify the expected network before approval.",
      "A customer should review the wallet address, recipient, amount and network before signing.",
    ],
  },
  {
    title: "Marketplace",
    paragraphs: [
      "Marketplace supports product discovery, product detail pages, Wishlist, cart, checkout, transaction review, orders and receipts.",
      "Adding an item to the cart does not move funds. Supported payment approval occurs only later in the checkout and transaction review flow.",
    ],
    bullets: [
      "Wishlist is available without wallet authentication and persists locally in the current browser or installed app unless that local storage is cleared.",
      "Wishlist and cart are separate customer states. Adding an item to cart does not automatically remove it from Wishlist.",
      "Checkout verifies customer and transaction requirements before a supported payment action.",
      "Transaction review presents the connected wallet, Arc network and relevant payment details before approval.",
    ],
  },
  {
    title: "Gift Vault",
    paragraphs: [
      "Gift Vault includes direct send and timed gift experiences built around customer review before wallet approval.",
      "Timed gifts include recipient, amount and unlock schedule information. The current review experience verifies the connected wallet and Arc Testnet before supported transaction actions.",
    ],
    bullets: [
      "Direct send reviews the recipient wallet and exact USDC amount.",
      "Timed gifts review recipient, amount, unlock date, unlock time and timezone.",
      "Network fees are shown by the wallet or relevant estimate before required signing.",
      "Confirmed onchain records may be linked to ArcScan.",
      "Recipient claim state depends on the gift conditions and relevant onchain state.",
    ],
  },
  {
    title: "Bill Split",
    paragraphs: [
      "Bill Split provides organizer, participant and receipt flows for coordinating shared payment requests.",
      "A Bill Split request is coordination data. A participant payment requires the relevant participant wallet and explicit transaction approval.",
    ],
  },
  {
    title: "Receipts",
    paragraphs: [
      "TrustVault supports customer-facing transaction receipts and a Receipt Center.",
      "Receipt information may include network, amount, transaction status and transaction hash. Where public onchain proof exists, TrustVault can expose ArcScan verification.",
    ],
    bullets: [
      "A receipt QR code that points to ArcScan exposes public transaction details only.",
      "A receipt or QR code does not provide access to the connected wallet.",
    ],
  },
  {
    title: "Application data and onchain truth",
    paragraphs: [
      "TrustVault can maintain application data such as customer records, orders, receipts, notifications and product experience state separately from blockchain settlement.",
      "For a supported blockchain payment or contract action, the relevant confirmed onchain transaction remains the settlement evidence.",
    ],
  },
  {
    title: "Feature status",
    paragraphs: [
      "TrustVault distinguishes between available functionality and product areas that are still marked coming soon.",
      "Swap remains a coming soon area and does not currently provide customer swap execution, liquidity routing or a customer swap contract through TrustVault.",
    ],
  },
] as const;

export default function DocumentationPage() {
  return (
    <InformationPage
      eyebrow="Resources"
      title="TrustVault documentation"
      description="A factual guide to the current TrustVault customer experience and how its major product flows behave."
      sections={sections}
      updated="24 August 2026"
      backHref="/"
      backLabel="Back to TrustVault"
    />
  );
}