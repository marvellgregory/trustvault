export type CandidateWalletMetadata = Readonly<{
  key: string;
  displayName: string;
  aliases: readonly string[];
  rdnsHints: readonly string[];
  testingStatus: "UNTESTED";
  notes: string;
}>;

export const CANDIDATE_WALLET_CATALOGUE: readonly CandidateWalletMetadata[] = Object.freeze([
  ["metamask", "MetaMask"],
  ["trust-wallet", "Trust Wallet"],
  ["phantom", "Phantom"],
  ["bitget-wallet", "Bitget Wallet"],
  ["binance-wallet", "Binance Wallet"],
  ["bybit-wallet", "Bybit Wallet"],
].map(([key, displayName]) => Object.freeze({
  key,
  displayName,
  aliases: Object.freeze([]),
  rdnsHints: Object.freeze([]),
  testingStatus: "UNTESTED" as const,
  notes: "Candidate metadata is informational and never establishes provider identity or qualification.",
})));

export function isCandidateDetectedByDisplayName(
  candidate: CandidateWalletMetadata,
  announcedNames: readonly string[],
) {
  return announcedNames.some((name) => name.toLowerCase() === candidate.displayName.toLowerCase());
}
