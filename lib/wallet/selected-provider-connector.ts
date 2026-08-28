import { injected } from "wagmi/connectors";

import type { RegistryProviderRecord } from "./provider-types";
import { registerConnectorProviderProvenance } from "./connector-provider-provenance";

export const SELECTED_PROVIDER_CONNECTOR_PREFIX =
  "trustvault:selected:eip6963:" as const;

export function createSelectedProviderConnectorId(registryId: string): string {
  const stableIdentity = registryId.startsWith("eip6963:")
    ? registryId.slice("eip6963:".length)
    : registryId;
  if (!/^[a-zA-Z0-9._:-]+$/.test(stableIdentity)) {
    throw new Error("Selected provider registry identity is invalid.");
  }
  return `${SELECTED_PROVIDER_CONNECTOR_PREFIX}${stableIdentity}`;
}

export function assertConnectableProviderRecord(input: {
  record?: RegistryProviderRecord | null;
  selectedRegistryId?: string;
  expectedRecord?: RegistryProviderRecord;
}): RegistryProviderRecord {
  const { record } = input;
  if (!record) throw new Error("The selected provider is no longer available.");
  if (record.state !== "available" || record.conflicts.length > 0) {
    throw new Error("The selected provider has conflicting announcements.");
  }
  if (record.identity.registryId !== input.selectedRegistryId) {
    throw new Error("The registry selection changed before connection.");
  }
  const expected = input.expectedRecord;
  if (
    expected &&
    (record.provider !== expected.provider ||
      record.identity.registryId !== expected.identity.registryId ||
      record.identity.uuid !== expected.identity.uuid ||
      record.identity.rdns !== expected.identity.rdns)
  ) {
    throw new Error("The selected provider identity changed before connection.");
  }
  return record;
}

export function createSelectedProviderConnector(record: RegistryProviderRecord) {
  const connectorFactory = injected({ shimDisconnect: true, target: createSelectedProviderTarget(record) });
  return (config: Parameters<typeof connectorFactory>[0]) => {
    const connector = connectorFactory(config);
    registerConnectorProviderProvenance({ connector, record, resolvedProvider: record.provider, registrationStage: "TARGET_CONSTRUCTION" });
    return connector;
  };
}

export function createSelectedProviderTarget(record: RegistryProviderRecord) {
  const selected = assertConnectableProviderRecord({
    record,
    selectedRegistryId: record.identity.registryId,
    expectedRecord: record,
  });
  return Object.freeze({
    id: createSelectedProviderConnectorId(selected.identity.registryId),
    name: selected.identity.name,
    ...(selected.identity.icon ? { icon: selected.identity.icon } : {}),
    provider: selected.provider,
  });
}
