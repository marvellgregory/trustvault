import type { Metadata } from "next";

import { InformationPage } from "@/components/information/InformationPage";

export const metadata: Metadata = {
  title: "Responsible Disclosure",
  description:
    "How to responsibly report a potential TrustVault security vulnerability without exposing customer secrets or creating unnecessary harm.",
};

const sections = [
  {
    title: "Reporting a potential vulnerability",
    paragraphs: [
      "If a potential TrustVault security issue is discovered, report it privately through the current published email contact before sharing technical details publicly.",
    ],
    bullets: [
      "Email: marvellgregory85@gmail.com",
      "Describe the affected page, route, component or transaction flow.",
      "Provide clear reproduction steps where doing so does not put customers, wallets or third parties at risk.",
      "Explain the observed behavior and the expected behavior.",
      "Include a public transaction hash or public blockchain reference only when relevant.",
    ],
  },
  {
    title: "Do not send wallet secrets",
    paragraphs: [
      "A security report must never include a private key, seed phrase, recovery phrase, password or signing credential.",
      "TrustVault does not require wallet secrets in order to review a security report.",
    ],
  },
  {
    title: "Please avoid harmful testing",
    paragraphs: [
      "Security research should avoid accessing another person's private data, disrupting availability, attempting unauthorized fund movement or deliberately creating harm.",
      "If testing could affect another customer, wallet, seller or service, stop and report the issue using the available contact channel.",
    ],
  },
  {
    title: "Useful report details",
    bullets: [
      "Affected URL or TrustVault feature.",
      "Browser, wallet and device information when relevant.",
      "Steps needed to reproduce the behavior.",
      "Screenshots that do not expose secrets.",
      "Relevant public transaction or explorer references.",
      "A concise explanation of potential impact.",
    ],
  },
  {
    title: "Disclosure expectations",
    paragraphs: [
      "Please allow reasonable time for an issue to be reviewed and addressed before publishing vulnerability details that could put customers or systems at risk.",
      "TrustVault may request additional non-sensitive technical information when needed to reproduce the report.",
    ],
  },
  {
    title: "Current program status",
    paragraphs: [
      "This page provides a responsible reporting path. It does not represent a bug bounty, paid reward program, security certification or independent security audit.",
      "No reward, payment or recognition should be assumed unless it has been explicitly agreed separately.",
    ],
  },
] as const;

export default function ResponsibleDisclosurePage() {
  return (
    <InformationPage
      eyebrow="Security reporting"
      title="Responsible Disclosure"
      description="A clear path for reporting potential security issues without exposing wallet secrets or creating unnecessary risk."
      sections={sections}
      updated="24 August 2026"
      backHref="/"
      backLabel="Back to TrustVault"
    />
  );
}