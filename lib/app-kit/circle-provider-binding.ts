import { createViemAdapterFromProvider } from "@circle-fin/adapter-viem-v2";
import type { EIP1193Provider } from "viem";

import type { RegistryProviderRecord } from "@/lib/wallet/provider-types";

export type CircleReadiness = "CIRCLE_UNBOUND" | "CIRCLE_READY" | "CIRCLE_INVALIDATED";

export type CircleBindingEvidence = Readonly<{
  status: CircleReadiness;
  providerIdentityKey?: string;
  providerName?: string;
  account?: `0x${string}`;
  chainId?: number;
  bindingGeneration?: string;
  exactProviderVerified: boolean;
  boundAt?: string;
  invalidationReason?: string;
}>;

export type CircleProviderBinding = Readonly<{
  evidence: CircleBindingEvidence;
  provider?: EIP1193Provider;
  revalidate?: () => Promise<CircleBindingValidationInput>;
}>;

export type CircleBindingValidationInput = Readonly<{
  registryActive: boolean;
  selectedRegistryId?: string;
  selectedRecord?: RegistryProviderRecord | null;
  verifiedProvider?: EIP1193Provider;
  activeWagmiProvider?: unknown;
  identityVerified: boolean;
  connected: boolean;
  expectedAccount?: `0x${string}`;
  activeAccount?: `0x${string}`;
  expectedChainId?: number;
  activeChainId?: number;
  requiredChainId: number;
  bindingGeneration: string;
  currentGeneration: string;
}>;

export const CIRCLE_UNBOUND: CircleProviderBinding = Object.freeze({
  evidence: Object.freeze({ status: "CIRCLE_UNBOUND", exactProviderVerified: false }),
});

export function validateCircleBinding(input: CircleBindingValidationInput): CircleBindingEvidence {
  const invalid = (reason: string): CircleBindingEvidence => Object.freeze({ status: "CIRCLE_INVALIDATED", exactProviderVerified: false, invalidationReason: reason });
  const record = input.selectedRecord;
  if (!input.identityVerified) return invalid("Wallet identity is unverified.");
  if (!input.connected) return invalid("Wallet is disconnected.");
  if (!input.registryActive || !record) return invalid("Selected provider is unavailable.");
  if (record.state !== "available" || record.conflicts.length > 0) return invalid("Selected provider is conflicted.");
  if (record.identity.registryId !== input.selectedRegistryId) return invalid("Selected provider identity changed.");
  if (record.provider !== input.verifiedProvider || record.provider !== input.activeWagmiProvider) return invalid("Exact provider reference mismatch.");
  if (!input.expectedAccount || !input.activeAccount || input.expectedAccount.toLowerCase() !== input.activeAccount.toLowerCase()) return invalid("Connected account mismatch.");
  if (input.expectedChainId !== input.activeChainId || input.activeChainId !== input.requiredChainId) return invalid("Connected chain mismatch.");
  if (input.bindingGeneration !== input.currentGeneration) return invalid("Circle binding generation is stale.");
  return Object.freeze({ status: "CIRCLE_READY", providerIdentityKey: record.identity.registryId, providerName: record.identity.name, account: input.activeAccount, chainId: input.activeChainId, bindingGeneration: input.bindingGeneration, exactProviderVerified: true, boundAt: new Date().toISOString() });
}

export function createCircleProviderBinding(input: CircleBindingValidationInput & { revalidate: () => Promise<CircleBindingValidationInput> }): CircleProviderBinding {
  const evidence = validateCircleBinding(input);
  if (evidence.status !== "CIRCLE_READY" || !input.verifiedProvider) return Object.freeze({ evidence });
  return Object.freeze({ evidence, provider: input.verifiedProvider, revalidate: input.revalidate });
}

export async function createCircleAdapterForOperation(
  binding: CircleProviderBinding,
  factory: typeof createViemAdapterFromProvider = createViemAdapterFromProvider,
) {
  if (binding.evidence.status !== "CIRCLE_READY" || !binding.provider || !binding.revalidate) throw new Error("Circle is not ready for the verified wallet.");
  const current = await binding.revalidate();
  const evidence = validateCircleBinding(current);
  if (evidence.status !== "CIRCLE_READY" || current.verifiedProvider !== binding.provider) throw new Error(evidence.invalidationReason ?? "Circle provider binding is invalid.");
  const accounts = await binding.provider.request({ method: "eth_accounts" });
  if (!Array.isArray(accounts) || !accounts.some((account) => typeof account === "string" && account.toLowerCase() === evidence.account?.toLowerCase())) {
    throw new Error("The verified Circle provider no longer exposes the authorized account.");
  }
  const adapter = await factory({ provider: binding.provider });
  return Object.freeze({ adapter, evidence: Object.freeze({ ...evidence, adapterCreatedAt: new Date().toISOString() }) });
}

export function sanitizeCircleBinding(binding: CircleProviderBinding): CircleBindingEvidence {
  return Object.freeze({ ...binding.evidence });
}
