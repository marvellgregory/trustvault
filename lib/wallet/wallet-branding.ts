export const CUSTOMER_SUPPORTED_WALLET_KEYS = [
  "metamask",
  "binance-wallet",
  "bitget-wallet",
] as const;

export type CustomerSupportedWalletKey =
  (typeof CUSTOMER_SUPPORTED_WALLET_KEYS)[number];

export function getWalletLogoSrc(
  walletKey: string | null | undefined,
): string | undefined {
  switch (walletKey) {
    case "metamask":
      return "/images/wallets/metamask.png";
    case "binance-wallet":
      return "/images/wallets/binance-wallet.png";
    case "bitget-wallet":
      return "/images/wallets/bitget-wallet.png";
    case "trust-wallet":
      return "/images/wallets/trust-wallet.png";
    default:
      return undefined;
  }
}