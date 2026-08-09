import type { Metadata } from "next";
import {
  Geist,
  Geist_Mono,
} from "next/font/google";
import { headers } from "next/headers";
import {
  cookieToInitialState,
} from "wagmi";

import { Providers } from "@/app/providers";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { Navigation } from "@/components/layout/Navigation";
import { wagmiConfig } from "@/lib/web3/config";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "TrustVault",
    template: "%s | TrustVault",
  },
  description:
    "A consumer-friendly Arc Testnet experience for programmable gifting, Marketplace payments and shared USDC transactions.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieHeader =
    (await headers()).get("cookie");

  const initialState =
    cookieToInitialState(
      wagmiConfig,
      cookieHeader,
    );

  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-white text-zinc-950">
        <Providers
          initialState={initialState}
        >
          <Header />
          <Navigation />
          <div className="flex-1">
            {children}
          </div>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}

