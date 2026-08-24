import type { Metadata } from "next";

import { InformationPage } from "@/components/information/InformationPage";

export const metadata: Metadata = {
  title: "Help Center",
  description:
    "Customer help for wallets, Marketplace, Gift Vault, Bill Split, Wishlist, receipts and transaction review.",
};

const sections = [
  {
    title: "Getting started",
    bullets: [
      "Browse Marketplace products and use Wishlist without connecting a wallet.",
      "Connect a wallet when a TrustVault flow requires wallet identity, balance checks, network verification or transaction approval.",
      "For supported transaction flows, make sure the connected wallet is using Arc Testnet before approval.",
      "Review recipient addresses, amounts, network details and transaction information before signing anything in a wallet.",
    ],
  },
  {
    title: "Wallet connection and network",
    paragraphs: [
      "TrustVault keeps wallet approval under customer control. Connecting a wallet does not by itself move funds.",
      "If TrustVault reports the wrong network, use the available network switch action or switch the wallet to Arc Testnet before continuing with a supported transaction.",
    ],
    bullets: [
      "Check that the intended wallet is connected.",
      "Verify the displayed wallet address before a money action.",
      "Confirm Arc Testnet is shown as the active network.",
      "Never enter a private key, seed phrase or recovery phrase into TrustVault.",
    ],
  },
  {
    title: "Marketplace and cart",
    paragraphs: [
      "Saving a product, adding it to the cart or reviewing a product does not move funds.",
      "Supported payment actions begin later in checkout and transaction review, where the buyer can review the order, connected wallet, Arc network and transaction details before approval.",
    ],
    bullets: [
      "Use Wishlist to save products for later on the current browser or installed TrustVault app.",
      "Adding a Wishlist product to the cart does not automatically remove it from Wishlist.",
      "Review seller, quantity, price and delivery information before checkout.",
      "Use the transaction review screen before approving a supported Marketplace payment.",
    ],
  },
  {
    title: "Gift Vault",
    paragraphs: [
      "Gift Vault supports customer review before a supported wallet transaction is opened.",
      "For direct and timed gift flows, verify the recipient wallet, USDC amount, connected wallet and Arc Testnet details shown by TrustVault.",
    ],
    bullets: [
      "For a timed gift, also review the unlock date, time and timezone.",
      "The wallet may show a network fee before signing.",
      "Where TrustVault has verifiable onchain data, use the available ArcScan link to inspect the public transaction or vault state.",
      "Recipient claim availability depends on the relevant gift conditions and onchain state.",
    ],
  },
  {
    title: "Bill Split",
    paragraphs: [
      "Bill Split coordinates payment requests between an organizer and participants. Creating or viewing a request does not itself authorize a participant wallet transaction.",
      "Each participant should review the requested share and connected wallet before approving a supported payment.",
    ],
  },
  {
    title: "Receipts and ArcScan",
    paragraphs: [
      "TrustVault receipts can record transaction, network, amount and customer-facing order information.",
      "Where a confirmed onchain transaction hash is available, TrustVault may provide an ArcScan link or QR verification path for public transaction proof.",
    ],
  },
  {
    title: "If something looks wrong",
    bullets: [
      "Do not approve a wallet request if the recipient, amount or network is unexpected.",
      "Keep the TrustVault order, gift or Bill Split identifier where available.",
      "Keep the relevant transaction hash when a transaction was submitted.",
      "Use ArcScan to verify public onchain state where TrustVault provides a link.",
      "Never share a private key, seed phrase or recovery phrase as support information.",
    ],
  },
] as const;

export default function HelpPage() {
  return (
    <InformationPage
      eyebrow="Support"
      title="Help Center"
      description="Practical help for using TrustVault safely across shopping, gifting, shared payments, wallets and receipts."
      sections={sections}
      updated="24 August 2026"
      backHref="/"
      backLabel="Back to TrustVault"
    />
  );
}