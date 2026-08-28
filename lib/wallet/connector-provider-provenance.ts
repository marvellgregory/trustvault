import type { EIP1193Provider } from "viem";

import type { RegistryProviderRecord } from "./provider-types";

export type ConnectorProviderProvenance = Readonly<{
  provider: EIP1193Provider;
  providerIdentityKey: string;
  registeredAt: number;
  registrationStage: "TARGET_CONSTRUCTION" | "POST_CONNECT_VERIFIED";
}>;

export type ConnectorProviderProvenanceDiagnostic = Readonly<{
  registered: boolean;
  connectorToken?: string;
  providerToken?: string;
  registrationStage?: ConnectorProviderProvenance["registrationStage"];
  rejectionReason: "CONNECTOR_MISSING" | "PROVENANCE_NOT_REGISTERED" | "SELECTION_MISSING" | "PROVIDER_CONFLICT" | "IDENTITY_MISMATCH" | "PROVIDER_REFERENCE_MISMATCH" | "REGISTRY_MATCH_MISSING" | "REGISTRY_MATCH_AMBIGUOUS" | "NONE";
}>;

export type ConnectorProviderResolution = Readonly<{
  provider?: unknown;
  source: "CONNECTOR" | "VERIFIED_PROVENANCE" | "UNAVAILABLE";
  connectorShape: "MISSING" | "GET_PROVIDER_MISSING" | "GET_PROVIDER_NON_CALLABLE" | "GET_PROVIDER_CALLABLE";
  error?: string;
  diagnostic: ConnectorProviderProvenanceDiagnostic;
}>;

function asRuntimeObject(value: unknown): object | undefined {
  return (typeof value === "object" && value !== null) || typeof value === "function"
    ? value as object
    : undefined;
}

const connectorProvenance = new WeakMap<object, ConnectorProviderProvenance>();
const connectorTokens = new WeakMap<object, string>();
const providerTokens = new WeakMap<object, string>();
let nextConnectorToken = 1;
let nextProviderToken = 1;

function objectToken(target: object, tokens: WeakMap<object, string>, prefix: string, next: () => number) {
  const current = tokens.get(target);
  if (current) return current;
  const token = `${prefix}-${next()}`;
  tokens.set(target, token);
  return token;
}

export function registerConnectorProviderProvenance(input: {
  connector: object;
  record: RegistryProviderRecord;
  resolvedProvider: unknown;
  registrationStage?: "TARGET_CONSTRUCTION" | "POST_CONNECT_VERIFIED";
  now?: () => number;
}) {
  if (input.record.state !== "available" || input.record.conflicts.length > 0) {
    throw new Error("Conflicted providers cannot establish connector provenance.");
  }
  if (input.resolvedProvider !== input.record.provider) {
    throw new Error("Connector provenance requires exact provider reference equality.");
  }
  const provenance = Object.freeze({ provider: input.record.provider, providerIdentityKey: input.record.identity.registryId, registeredAt: (input.now ?? Date.now)(), registrationStage: input.registrationStage ?? "POST_CONNECT_VERIFIED" });
  connectorProvenance.set(input.connector, provenance);
  return provenance;
}

export function inspectConnectorProviderProvenance(input: {
  connector?: object;
  selectedProvider?: RegistryProviderRecord | null;
  registryProviders: readonly RegistryProviderRecord[];
}): ConnectorProviderProvenanceDiagnostic {
  const connectorToken = input.connector ? objectToken(input.connector, connectorTokens, "connector", () => nextConnectorToken++) : undefined;
  if (!input.connector) return Object.freeze({ registered: false, rejectionReason: "CONNECTOR_MISSING" as const });
  const provenance = connectorProvenance.get(input.connector);
  if (!provenance) return Object.freeze({ registered: false, connectorToken, rejectionReason: "PROVENANCE_NOT_REGISTERED" as const });
  const providerToken = objectToken(provenance.provider, providerTokens, "provider", () => nextProviderToken++);
  const selected = input.selectedProvider;
  if (!selected) return Object.freeze({ registered: true, connectorToken, providerToken, registrationStage: provenance.registrationStage, rejectionReason: "SELECTION_MISSING" as const });
  if (selected.state !== "available" || selected.conflicts.length > 0) return Object.freeze({ registered: true, connectorToken, providerToken, registrationStage: provenance.registrationStage, rejectionReason: "PROVIDER_CONFLICT" as const });
  if (selected.identity.registryId !== provenance.providerIdentityKey) return Object.freeze({ registered: true, connectorToken, providerToken, registrationStage: provenance.registrationStage, rejectionReason: "IDENTITY_MISMATCH" as const });
  if (selected.provider !== provenance.provider) return Object.freeze({ registered: true, connectorToken, providerToken, registrationStage: provenance.registrationStage, rejectionReason: "PROVIDER_REFERENCE_MISMATCH" as const });
  const exactMatches = input.registryProviders.filter((record) => record.identity.registryId === provenance.providerIdentityKey && record.provider === provenance.provider && record.state === "available" && record.conflicts.length === 0);
  if (exactMatches.length !== 1) return Object.freeze({ registered: true, connectorToken, providerToken, registrationStage: provenance.registrationStage, rejectionReason: exactMatches.length === 0 ? "REGISTRY_MATCH_MISSING" as const : "REGISTRY_MATCH_AMBIGUOUS" as const });
  return Object.freeze({ registered: true, connectorToken, providerToken, registrationStage: provenance.registrationStage, rejectionReason: "NONE" as const });
}

export function resolveConnectorProviderProvenance(input: {
  connector?: object;
  selectedProvider?: RegistryProviderRecord | null;
  registryProviders: readonly RegistryProviderRecord[];
}) {
  const diagnostic = inspectConnectorProviderProvenance(input);
  if (!input.connector || diagnostic.rejectionReason !== "NONE") return null;
  const provenance = connectorProvenance.get(input.connector);
  return provenance ?? null;
}

export async function resolveConnectorProvider(input: {
  connector?: unknown;
  selectedProvider?: RegistryProviderRecord | null;
  registryProviders: readonly RegistryProviderRecord[];
}): Promise<ConnectorProviderResolution> {
  const connector = asRuntimeObject(input.connector);
  const provenanceInput = { connector, selectedProvider: input.selectedProvider, registryProviders: input.registryProviders };
  if (!connector) return Object.freeze({ source: "UNAVAILABLE" as const, connectorShape: "MISSING" as const, diagnostic: inspectConnectorProviderProvenance(provenanceInput) });

  let getProvider: unknown;
  try {
    getProvider = (connector as { getProvider?: unknown }).getProvider;
  } catch (error) {
    const provenance = resolveConnectorProviderProvenance(provenanceInput);
    return Object.freeze({ provider: provenance?.provider, source: provenance ? "VERIFIED_PROVENANCE" as const : "UNAVAILABLE" as const, connectorShape: "GET_PROVIDER_MISSING" as const, error: error instanceof Error ? error.message : "Connector provider property access failed.", diagnostic: inspectConnectorProviderProvenance(provenanceInput) });
  }

  const connectorShape = getProvider === undefined ? "GET_PROVIDER_MISSING" as const : typeof getProvider === "function" ? "GET_PROVIDER_CALLABLE" as const : "GET_PROVIDER_NON_CALLABLE" as const;
  if (typeof getProvider !== "function") {
    const provenance = resolveConnectorProviderProvenance(provenanceInput);
    return Object.freeze({ provider: provenance?.provider, source: provenance ? "VERIFIED_PROVENANCE" as const : "UNAVAILABLE" as const, connectorShape, error: connectorShape === "GET_PROVIDER_NON_CALLABLE" ? "Connector getProvider is not callable." : undefined, diagnostic: inspectConnectorProviderProvenance(provenanceInput) });
  }

  try {
    const provider = await getProvider.call(connector);
    return Object.freeze({ provider, source: provider ? "CONNECTOR" as const : "UNAVAILABLE" as const, connectorShape, diagnostic: inspectConnectorProviderProvenance(provenanceInput) });
  } catch (error) {
    const provenance = resolveConnectorProviderProvenance(provenanceInput);
    return Object.freeze({ provider: provenance?.provider, source: provenance ? "VERIFIED_PROVENANCE" as const : "UNAVAILABLE" as const, connectorShape, error: error instanceof Error ? error.message : "Connector provider resolution failed.", diagnostic: inspectConnectorProviderProvenance(provenanceInput) });
  }
}

export function clearConnectorProviderProvenance(connector: object) {
  connectorProvenance.delete(connector);
}
