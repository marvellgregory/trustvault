import { arcTestnet } from "viem/chains";

export const ARC_TESTNET_CHAIN_ID = 5_042_002 as const;
export const ARC_TESTNET_EXPLORER_URL = "https://testnet.arcscan.app" as const;
export const ARC_TESTNET_USDC_ADDRESS = "0x3600000000000000000000000000000000000000" as const;

export const ARC_TESTNET_ASSETS = Object.freeze({
  chain: arcTestnet,
  chainId: ARC_TESTNET_CHAIN_ID,
  explorerUrl: ARC_TESTNET_EXPLORER_URL,
  nativeUsdc: Object.freeze({ symbol: "USDC", decimals: 18, purpose: "native-balance-and-gas" as const }),
  linkedUsdc: Object.freeze({ address: ARC_TESTNET_USDC_ADDRESS, symbol: "USDC", decimals: 6, purpose: "erc20-operations" as const }),
});

if (arcTestnet.id !== ARC_TESTNET_CHAIN_ID || arcTestnet.nativeCurrency.symbol !== "USDC" || arcTestnet.nativeCurrency.decimals !== 18) {
  throw new Error("Installed Arc Testnet chain metadata does not match TrustVault's canonical asset definition.");
}
