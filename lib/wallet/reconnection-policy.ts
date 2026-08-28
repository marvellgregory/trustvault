import type { RegistryProviderRecord } from "./provider-types.js";

export const TARGETED_CONNECTOR_ID_PREFIX =
  "trustvault:selected:eip6963:" as const;

export type ReconnectedConnectorKind = "generic" | "targeted";

export type WalletIdentityReconciliation = Readonly<{
  status:
    | "DISCONNECTED"
    | "IDENTITY_UNVERIFIED"
    | "CURRENT_PROVIDER_IDENTIFIED"
    | "IDENTITY_VERIFIED"
    | "IDENTITY_INVALIDATED";
  reason:
    | "NOT_CONNECTED"
    | "ACTIVE_PROVIDER_MISSING"
    | "NO_REFERENCE_MATCH"
    | "AMBIGUOUS_REFERENCE_MATCH"
    | "CONFLICTED_PROVIDER"
    | "FRESH_SELECTION_REQUIRED"
    | "EXACT_SELECTION_REFERENCE_MATCH"
    | "SELECTED_PROVIDER_MISMATCH";
  connectorKind: ReconnectedConnectorKind;
  currentProvider?: RegistryProviderRecord;
  selectedProvider?: RegistryProviderRecord;
  identityVerified: boolean;
}>;

export function classifyConnectorKind(connectorId?: string): ReconnectedConnectorKind {
  return connectorId?.startsWith(TARGETED_CONNECTOR_ID_PREFIX)
    ? "targeted"
    : "generic";
}

export function reconcileWalletIdentity(input: {
  connected: boolean;
  connectorId?: string;
  activeProvider?: unknown;
  registryProviders: readonly RegistryProviderRecord[];
  selectedProvider?: RegistryProviderRecord | null;
  freshSelection: boolean;
}): WalletIdentityReconciliation {
  const connectorKind = classifyConnectorKind(input.connectorId);
  const base = { connectorKind, identityVerified: false } as const;

  if (!input.connected) {
    return Object.freeze({ ...base, status: "DISCONNECTED", reason: "NOT_CONNECTED" });
  }
  if (!input.activeProvider) {
    return Object.freeze({
      ...base,
      status: "IDENTITY_UNVERIFIED",
      reason: "ACTIVE_PROVIDER_MISSING",
    });
  }

  const matches = input.registryProviders.filter(
    (record) => record.provider === input.activeProvider,
  );
  if (matches.length === 0) {
    return Object.freeze({
      ...base,
      status: "IDENTITY_UNVERIFIED",
      reason: "NO_REFERENCE_MATCH",
    });
  }
  if (matches.length > 1) {
    return Object.freeze({
      ...base,
      status: "IDENTITY_UNVERIFIED",
      reason: "AMBIGUOUS_REFERENCE_MATCH",
    });
  }

  const currentProvider = matches[0];
  if (currentProvider.state === "conflicted") {
    return Object.freeze({
      ...base,
      status: "IDENTITY_INVALIDATED",
      reason: "CONFLICTED_PROVIDER",
      currentProvider,
    });
  }

  const selectedProvider = input.selectedProvider ?? undefined;
  if (!selectedProvider || !input.freshSelection) {
    return Object.freeze({
      ...base,
      status: "CURRENT_PROVIDER_IDENTIFIED",
      reason: "FRESH_SELECTION_REQUIRED",
      currentProvider,
    });
  }

  if (
    selectedProvider.state !== "available" ||
    selectedProvider.identity.registryId !== currentProvider.identity.registryId ||
    selectedProvider.provider !== input.activeProvider
  ) {
    return Object.freeze({
      ...base,
      status: "IDENTITY_INVALIDATED",
      reason: "SELECTED_PROVIDER_MISMATCH",
      currentProvider,
      selectedProvider,
    });
  }

  return Object.freeze({
    connectorKind,
    identityVerified: true,
    status: "IDENTITY_VERIFIED",
    reason: "EXACT_SELECTION_REFERENCE_MATCH",
    currentProvider,
    selectedProvider,
  });
}
