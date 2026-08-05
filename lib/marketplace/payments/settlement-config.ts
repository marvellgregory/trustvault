import { isAddress } from "viem";

const configuredSettlementWallet =
  process.env
    .NEXT_PUBLIC_MARKETPLACE_SETTLEMENT_WALLET
    ?.trim();

export type MarketplaceSettlementConfig = {
  walletAddress?: `0x${string}`;
  configured: boolean;
  valid: boolean;
};

export function getMarketplaceSettlementConfig():
  MarketplaceSettlementConfig {
  if (!configuredSettlementWallet) {
    return {
      configured: false,
      valid: false,
    };
  }

  if (!isAddress(configuredSettlementWallet)) {
    return {
      configured: true,
      valid: false,
    };
  }

  return {
    walletAddress:
      configuredSettlementWallet,
    configured: true,
    valid: true,
  };
}

export function requireMarketplaceSettlementWallet():
  `0x${string}` {
  const config =
    getMarketplaceSettlementConfig();

  if (!config.configured) {
    throw new Error(
      "The Marketplace settlement wallet has not been configured.",
    );
  }

  if (
    !config.valid ||
    !config.walletAddress
  ) {
    throw new Error(
      "The configured Marketplace settlement wallet is invalid.",
    );
  }

  return config.walletAddress;
}

export function validateSettlementWalletForBuyer(
  buyerWallet: string,
) {
  const settlementWallet =
    requireMarketplaceSettlementWallet();

  if (
    settlementWallet.toLowerCase() ===
    buyerWallet.toLowerCase()
  ) {
    throw new Error(
      "The buyer wallet and Marketplace settlement wallet must be different.",
    );
  }

  return settlementWallet;
}
