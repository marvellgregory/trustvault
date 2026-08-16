import type { CircleProviderBinding } from "../app-kit/circle-provider-binding";
import type { RegistryProviderRecord } from "./provider-types";

export type TransactionReadinessStatus =
  | "QUALIFICATION_PENDING"
  | "TRANSACTION_READY"
  | "TEST_REQUIRED"
  | "INCOMPATIBLE"
  | "INVALIDATED";

export type WalletQualificationEvidenceV1 = Readonly<{
  status: "QUALIFIED" | "TEST_REQUIRED" | "INCOMPATIBLE";
  providerIdentityKey: string;
  qualificationGeneration: string;
  evaluatedAt: string;
  suiteVersion?: string;
  reasons: readonly string[];
}>;

export type TransactionReadiness = Readonly<{
  status: TransactionReadinessStatus;
  providerIdentityKey?: string;
  account?: `0x${string}`;
  chainId?: number;
  qualificationGeneration?: string;
  evaluatedAt: string;
  reasons: readonly string[];
}>;

export type TransactionReadinessInput = Readonly<{
  registryActive: boolean;
  selectedRecord?: RegistryProviderRecord | null;
  selectedRegistryId?: string;
  selectionExplicit: boolean;
  expectedProvider?: unknown;
  activeWagmiProvider?: unknown;
  verifiedAccount?: `0x${string}`;
  activeAccount?: `0x${string}`;
  identityVerified: boolean;
  activeChainId?: number;
  requiredChainId: number;
  circleBinding: CircleProviderBinding;
  circleAccountPreflightValid: boolean;
  qualification?: WalletQualificationEvidenceV1 | null;
  currentQualificationGeneration: string;
}>;

export function createQualificationGeneration(input: { registryId?: string; providerLastSeenAt?: number; connectorUid?: string; account?: string; chainId?: number; circleBindingGeneration?: string }) {
  return [input.registryId, input.providerLastSeenAt, input.connectorUid, input.account?.toLowerCase(), input.chainId, input.circleBindingGeneration].join(":");
}

const result = (status: TransactionReadinessStatus, reasons: readonly string[], input: TransactionReadinessInput): TransactionReadiness => Object.freeze({
  status,
  ...(input.selectedRecord ? { providerIdentityKey: input.selectedRecord.identity.registryId } : {}),
  ...(input.activeAccount ? { account: input.activeAccount } : {}),
  ...(input.activeChainId ? { chainId: input.activeChainId } : {}),
  qualificationGeneration: input.currentQualificationGeneration,
  evaluatedAt: new Date().toISOString(),
  reasons: Object.freeze([...reasons]),
});

export function deriveTransactionReadiness(input: TransactionReadinessInput): TransactionReadiness {
  const record = input.selectedRecord;
  if (!input.registryActive || !record) return result("INVALIDATED", ["Authoritative registry or selected provider is unavailable."], input);
  if (record.state !== "available" || record.conflicts.length > 0) return result("INVALIDATED", ["Selected provider is conflicted."], input);
  if (!input.selectionExplicit || record.identity.registryId !== input.selectedRegistryId) return result("INVALIDATED", ["A fresh explicit selection is required."], input);
  if (record.provider !== input.expectedProvider || record.provider !== input.activeWagmiProvider) return result("INVALIDATED", ["Exact provider reference verification failed."], input);
  if (!input.identityVerified) return result("QUALIFICATION_PENDING", ["Wallet identity is not verified."], input);
  if (!input.verifiedAccount || !input.activeAccount || input.verifiedAccount.toLowerCase() !== input.activeAccount.toLowerCase()) return result("INVALIDATED", ["Connected account mismatch."], input);
  if (input.activeChainId !== input.requiredChainId) return result("QUALIFICATION_PENDING", ["Arc Testnet is required."], input);
  if (input.circleBinding.evidence.status !== "CIRCLE_READY" || input.circleBinding.provider !== record.provider || !input.circleBinding.evidence.exactProviderVerified) return result("QUALIFICATION_PENDING", ["Verified Circle readiness is required."], input);
  const qualification = input.qualification;
  if (!qualification || qualification.status === "TEST_REQUIRED") return result("TEST_REQUIRED", ["TrustVault qualification testing is required."], input);
  if (qualification.status === "INCOMPATIBLE") return result("INCOMPATIBLE", qualification.reasons, input);
  if (qualification.providerIdentityKey !== record.identity.registryId || qualification.qualificationGeneration !== input.currentQualificationGeneration) return result("INVALIDATED", ["Qualification evidence is stale or belongs to another provider."], input);
  if (!input.circleAccountPreflightValid) return result("INVALIDATED", ["Circle authorized-account preflight is invalid."], input);
  return result("TRANSACTION_READY", [], input);
}

export async function verifyCircleAccountPreflight(binding: CircleProviderBinding, expectedAccount?: string) {
  if (binding.evidence.status !== "CIRCLE_READY" || !binding.provider || !binding.revalidate || !expectedAccount) return false;
  const current = await binding.revalidate();
  if (current.activeWagmiProvider !== binding.provider || current.verifiedProvider !== binding.provider) return false;
  const accounts = await binding.provider.request({ method: "eth_accounts" });
  return Array.isArray(accounts) && accounts.some((account) => typeof account === "string" && account.toLowerCase() === expectedAccount.toLowerCase());
}

export function createSerializableReadinessSnapshot(readiness: TransactionReadiness): TransactionReadiness {
  return Object.freeze({
    ...readiness,
    status: readiness.status === "TRANSACTION_READY" ? "QUALIFICATION_PENDING" : readiness.status,
    reasons: Object.freeze(readiness.status === "TRANSACTION_READY" ? ["Fresh runtime provider verification is required after reload."] : [...readiness.reasons]),
  });
}
