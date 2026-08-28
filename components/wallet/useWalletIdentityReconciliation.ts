"use client";

import { useEffect, useState } from "react";
import { useAccount } from "wagmi";

import { useWalletProviderRegistry } from "@/components/wallet/useWalletProviderRegistry";
import {
  reconcileWalletIdentity,
  type WalletIdentityReconciliation,
} from "@/lib/wallet/reconnection-policy";
import type { RegistryProviderRecord } from "@/lib/wallet/provider-types";
import { resolveConnectorProvider } from "@/lib/wallet/connector-provider-provenance";

type ConnectorLike = Readonly<{
  id?: string;
  getProvider?: () => Promise<unknown>;
}>;

export type WalletIdentityReconciliationDiagnostic = WalletIdentityReconciliation & Readonly<{
  providerResolution: "CONNECTOR" | "VERIFIED_PROVENANCE" | "UNAVAILABLE";
  connectorProviderShape: "MISSING" | "GET_PROVIDER_MISSING" | "GET_PROVIDER_NON_CALLABLE" | "GET_PROVIDER_CALLABLE";
  providerResolutionError?: string;
  connectorRuntimeToken?: string;
  providerRuntimeToken?: string;
  provenanceRegistered: boolean;
  provenanceRegistrationStage?: "TARGET_CONSTRUCTION" | "POST_CONNECT_VERIFIED";
  provenanceRejectionReason: string;
}>;

export async function reconcileActiveConnector(input: {
  connected: boolean;
  connector?: ConnectorLike;
  registryProviders: readonly RegistryProviderRecord[];
  selectedProvider?: RegistryProviderRecord | null;
  freshSelection: boolean;
}): Promise<WalletIdentityReconciliationDiagnostic> {
  const resolved = await resolveConnectorProvider({ connector: input.connected ? input.connector : undefined, selectedProvider: input.selectedProvider, registryProviders: input.registryProviders });
  const diagnostic = resolved.diagnostic;
  return Object.freeze({ ...reconcileWalletIdentity({ ...input, connectorId: input.connector?.id, activeProvider: resolved.provider }), providerResolution: resolved.source, connectorProviderShape: resolved.connectorShape, ...(resolved.error ? { providerResolutionError: resolved.error } : {}), ...(diagnostic.connectorToken ? { connectorRuntimeToken: diagnostic.connectorToken } : {}), ...(diagnostic.providerToken ? { providerRuntimeToken: diagnostic.providerToken } : {}), provenanceRegistered: diagnostic.registered, ...(diagnostic.registrationStage ? { provenanceRegistrationStage: diagnostic.registrationStage } : {}), provenanceRejectionReason: diagnostic.rejectionReason });
}

export function useWalletIdentityReconciliation() {
  const { isConnected, connector } = useAccount();
  const registry = useWalletProviderRegistry();
  const [result, setResult] = useState<WalletIdentityReconciliationDiagnostic>(() =>
    Object.freeze({ ...reconcileWalletIdentity({ connected: false, registryProviders: [], freshSelection: false }), providerResolution: "UNAVAILABLE", connectorProviderShape: "MISSING", provenanceRegistered: false, provenanceRejectionReason: "CONNECTOR_MISSING" }),
  );

  useEffect(() => {
    let current = true;
    void reconcileActiveConnector({
      connected: isConnected,
      connector,
      registryProviders: registry.snapshot.providers,
      selectedProvider: registry.selectedProviderRecord,
      freshSelection: Boolean(registry.snapshot.selectedProviderId),
    }).then((next) => {
      if (current) setResult(next);
    });
    return () => { current = false; };
  }, [connector, isConnected, registry.selectedProviderRecord, registry.snapshot]);

  return result;
}
