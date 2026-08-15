"use client";

import { useEffect, useState } from "react";
import { useAccount } from "wagmi";

import { useWalletProviderRegistry } from "@/components/wallet/useWalletProviderRegistry";
import {
  reconcileWalletIdentity,
  type WalletIdentityReconciliation,
} from "@/lib/wallet/reconnection-policy";
import type { RegistryProviderRecord } from "@/lib/wallet/provider-types";

type ConnectorLike = Readonly<{
  id?: string;
  getProvider?: () => Promise<unknown>;
}>;

export async function reconcileActiveConnector(input: {
  connected: boolean;
  connector?: ConnectorLike;
  registryProviders: readonly RegistryProviderRecord[];
  selectedProvider?: RegistryProviderRecord | null;
  freshSelection: boolean;
}): Promise<WalletIdentityReconciliation> {
  let activeProvider: unknown;
  if (input.connected && input.connector?.getProvider) {
    try {
      activeProvider = await input.connector.getProvider();
    } catch {
      activeProvider = undefined;
    }
  }
  return reconcileWalletIdentity({ ...input, connectorId: input.connector?.id, activeProvider });
}

export function useWalletIdentityReconciliation() {
  const { isConnected, connector } = useAccount();
  const registry = useWalletProviderRegistry();
  const [result, setResult] = useState<WalletIdentityReconciliation>(() =>
    reconcileWalletIdentity({ connected: false, registryProviders: [], freshSelection: false }),
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
