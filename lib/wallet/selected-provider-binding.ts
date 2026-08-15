import type { RegistryProviderRecord, SerializableProviderIdentity } from "./provider-types";

export type SelectedProviderBindingPhase =
  | "DETECTED" | "SELECTED" | "CONNECTING" | "CONNECTED" | "ARC_READY"
  | "REJECTED" | "FAILED" | "INVALIDATED";

export type SelectedProviderBinding = Readonly<{
  phase: SelectedProviderBindingPhase;
  attemptId?: string;
  selectedRegistryId?: string;
  selectedProvider?: SerializableProviderIdentity;
  expectedProviderIdentityKey?: string;
  startedAt?: string;
  account?: `0x${string}`;
  chainId?: number;
  connectorId?: string;
  failure?: Readonly<{ kind: "REJECTED" | "RESOURCE_UNAVAILABLE" | "FAILED" | "STALE" | "PROVIDER_MISMATCH" | "ACCOUNT_MISMATCH"; message: string }>;
}>;

export function selectedBinding(record: RegistryProviderRecord): SelectedProviderBinding {
  if (record.state !== "available") return Object.freeze({ phase: "INVALIDATED", failure: { kind: "PROVIDER_MISMATCH" as const, message: "Provider conflict." } });
  return Object.freeze({ phase: "SELECTED", selectedRegistryId: record.identity.registryId, selectedProvider: Object.freeze({ ...record.identity }), expectedProviderIdentityKey: record.identity.registryId });
}

export function connectingBinding(binding: SelectedProviderBinding, attemptId: string, connectorId: string, startedAt: string): SelectedProviderBinding {
  if (binding.phase !== "SELECTED" && binding.phase !== "REJECTED" && binding.phase !== "FAILED") throw new Error("A selected provider is required before connecting.");
  return Object.freeze({ ...binding, phase: "CONNECTING", attemptId, connectorId, startedAt, failure: undefined });
}

export function classifyConnectionError(error: unknown): "REJECTED" | "RESOURCE_UNAVAILABLE" | "FAILED" {
  const code = typeof error === "object" && error !== null && "code" in error ? Number((error as { code?: unknown }).code) : undefined;
  if (code === 4001) return "REJECTED";
  if (code === -32002 || code === -32004) return "RESOURCE_UNAVAILABLE";
  return "FAILED";
}

export function failedBinding(binding: SelectedProviderBinding, error: unknown): SelectedProviderBinding {
  const kind = classifyConnectionError(error);
  return Object.freeze({ ...binding, phase: kind === "REJECTED" ? "REJECTED" : "FAILED", failure: { kind, message: error instanceof Error ? error.message : "Wallet connection failed." } });
}

export function invalidateBinding(binding: SelectedProviderBinding, kind: "STALE" | "PROVIDER_MISMATCH" | "ACCOUNT_MISMATCH", message: string): SelectedProviderBinding {
  return Object.freeze({ ...binding, phase: "INVALIDATED", failure: { kind, message } });
}

export function completeBinding(input: { binding: SelectedProviderBinding; attemptId: string; expectedProvider: unknown; activeProvider: unknown; returnedAccount?: string; activeAccount?: string; chainId: number; arcChainId: number }): SelectedProviderBinding {
  const { binding } = input;
  if (binding.phase !== "CONNECTING" || binding.attemptId !== input.attemptId) return invalidateBinding(binding, "STALE", "This connection result belongs to a stale attempt.");
  if (input.expectedProvider !== input.activeProvider) return invalidateBinding(binding, "PROVIDER_MISMATCH", "The active connector resolved a different provider.");
  const returned = input.returnedAccount?.toLowerCase();
  const active = input.activeAccount?.toLowerCase();
  if (!returned || !active || returned !== active) return invalidateBinding(binding, "ACCOUNT_MISMATCH", "The connected account did not match Wagmi state.");
  return Object.freeze({ ...binding, phase: input.chainId === input.arcChainId ? "ARC_READY" : "CONNECTED", account: input.activeAccount as `0x${string}`, chainId: input.chainId, failure: undefined });
}
