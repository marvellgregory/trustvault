"use client";

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { getAccount } from "wagmi/actions";
import { useConfig } from "wagmi";
import { arcTestnet } from "viem/chains";

import { useCircleProviderBinding } from "./useCircleProviderBinding";
import { useWalletIdentityReconciliation } from "./useWalletIdentityReconciliation";
import { getActiveWalletProviderRegistry, useWalletProviderRegistry } from "./useWalletProviderRegistry";
import { developmentQualificationHarness } from "@/lib/wallet/qualification-harness";
import { createQualificationExecutionController } from "@/lib/wallet/qualification-execution";
import { createQualificationGeneration } from "@/lib/wallet/wallet-qualification";

export function useWalletQualificationExecution() {
  const config = useConfig();
  const registry = useWalletProviderRegistry();
  const reconciliation = useWalletIdentityReconciliation();
  const circleBinding = useCircleProviderBinding();
  const [runtimeStore] = useState(() => {
    let current = { registry, reconciliation, circleBinding };
    return { get: () => current, set: (next: typeof current) => { current = next; } };
  });
  useEffect(() => {
    runtimeStore.set({ registry, reconciliation, circleBinding });
  }, [circleBinding, reconciliation, registry, runtimeStore]);

  const controller = useMemo(() => createQualificationExecutionController({
    enabled: process.env.NODE_ENV === "development",
    async getRuntimeEvidence() {
      const live = runtimeStore.get();
      const account = getAccount(config);
      let activeProvider: unknown;
      try {
        activeProvider = await account.connector?.getProvider();
      } catch {
        activeProvider = undefined;
      }
      const activeRegistry = getActiveWalletProviderRegistry();
      const snapshot = activeRegistry?.getSnapshot();
      const selectedRecord = activeRegistry?.getSelected();
      const registryGeneration = [snapshot?.lifecycle, snapshot?.selectedProviderId, selectedRecord?.lastSeenAt, selectedRecord?.state, selectedRecord?.conflicts.length].join(":");
      const qualificationGeneration = createQualificationGeneration({ registryId: selectedRecord?.identity.registryId, providerLastSeenAt: selectedRecord?.lastSeenAt, connectorUid: live.reconciliation.currentProvider?.identity.registryId, circleBindingGeneration: live.circleBinding.evidence.bindingGeneration });
      return { registryActive: snapshot?.lifecycle === "active", registryGeneration, selectedRegistryId: snapshot?.selectedProviderId, selectedRecord, activeWagmiProvider: activeProvider, identityVerified: live.reconciliation.status === "IDENTITY_VERIFIED", connected: account.isConnected, verifiedAccount: live.reconciliation.identityVerified ? account.address : undefined, activeAccount: account.address, chainId: account.chainId, requiredChainId: arcTestnet.id, circleStatus: live.circleBinding.evidence.status, circleProvider: live.circleBinding.provider, circleBindingGeneration: live.circleBinding.evidence.bindingGeneration, qualificationGeneration };
    },
    recordEvidence(entry) { developmentQualificationHarness.record(entry); },
  }), [config, runtimeStore]);

  const snapshot = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot);
  const run = useCallback(() => controller.run(), [controller]);
  const recordUnsupportedNetwork = useCallback((message: string) => controller.run({ unsupportedNetworkObservation: message }), [controller]);
  return { snapshot, run, recordUnsupportedNetwork, available: process.env.NODE_ENV === "development", selectedProvider: registry.selectedProvider };
}
