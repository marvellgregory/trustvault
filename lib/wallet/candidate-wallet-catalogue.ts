import type { RegistryProviderRecord, SerializableProviderIdentity } from "./provider-types";

export type WalletProductionAvailability = "ENABLED" | "COMING_SOON" | "ARC_UNAVAILABLE";

export type CandidateWalletMetadata = Readonly<{
  key: string;
  displayName: string;
  aliases: readonly string[];
  rdnsHints: readonly string[];
  testingStatus: "UNTESTED";
  productionAvailability: WalletProductionAvailability;
  qualificationPolicyVersion: "2026-08-17";
  userFacingReason: string;
  notes: string;
}>;

export const CANDIDATE_WALLET_CATALOGUE: readonly CandidateWalletMetadata[] = Object.freeze(([
  ["metamask", "MetaMask", ["io.metamask"], "ENABLED", "Supported and tested"],
  ["binance-wallet", "Binance Wallet", ["com.binance.wallet"], "ENABLED", "Supported and tested"],
  ["bitget-wallet", "Bitget Wallet", ["com.bitget.web3"], "ENABLED", "Supported and tested"],
  ["trust-wallet", "Trust Wallet", ["com.trustwallet.app"], "COMING_SOON", "Coming soon"],
  ["phantom", "Phantom", ["app.phantom"], "ARC_UNAVAILABLE", "Arc support unavailable"],
  ["bybit-wallet", "Bybit Wallet", ["com.bybit"], "COMING_SOON", "Coming soon"],
] satisfies readonly [string, string, readonly string[], WalletProductionAvailability, string][]).map(([key, displayName, rdnsHints, productionAvailability, userFacingReason]) => Object.freeze({
  key,
  displayName,
  aliases: Object.freeze([]),
  rdnsHints: Object.freeze(rdnsHints),
  testingStatus: "UNTESTED" as const,
  productionAvailability,
  qualificationPolicyVersion: "2026-08-17" as const,
  userFacingReason,
  notes: "Family metadata gates presentation only and never establishes runtime provider identity or transaction readiness.",
})));

export function classifyWalletFamily(identity: SerializableProviderIdentity) {
  const name = identity.name.toLowerCase();
  const rdns = identity.rdns?.toLowerCase();
  if (!rdns) return null;
  const matches = CANDIDATE_WALLET_CATALOGUE.filter((candidate) =>
    [candidate.displayName, ...candidate.aliases].some((value) => value.toLowerCase() === name) && candidate.rdnsHints.some((value) => value.toLowerCase() === rdns),
  );
  return matches.length === 1 ? matches[0] : null;
}

export function getProductionWalletPolicy(record: RegistryProviderRecord) {
  const family = classifyWalletFamily(record.identity);
  return Object.freeze({ family, actionable: record.state === "available" && record.conflicts.length === 0 && family?.productionAvailability === "ENABLED" });
}

export function assertProductionWalletActionable(record: RegistryProviderRecord) {
  if (!getProductionWalletPolicy(record).actionable) throw new Error("This wallet is not currently available for production connection.");
  return record;
}

export function isCandidateDetectedByDisplayName(
  candidate: CandidateWalletMetadata,
  announcedNames: readonly string[],
) {
  return announcedNames.some((name) => name.toLowerCase() === candidate.displayName.toLowerCase());
}
