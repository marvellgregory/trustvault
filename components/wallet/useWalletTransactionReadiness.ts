"use client";

import { useEffect, useMemo, useState } from "react";
import { getAccount } from "wagmi/actions";
import { useConfig } from "wagmi";
import { arcTestnet } from "viem/chains";

import { useCircleProviderBinding } from "./useCircleProviderBinding";
import { getActiveWalletProviderRegistry, useWalletProviderRegistry } from "./useWalletProviderRegistry";
import { useWalletIdentityReconciliation } from "./useWalletIdentityReconciliation";
import { useWalletQualificationHarness } from "./useWalletQualificationHarness";
import { createQualificationGeneration, deriveTransactionReadiness, verifyCircleAccountPreflight, type TransactionReadiness, type WalletQualificationEvidenceV1 } from "@/lib/wallet/wallet-qualification";

export function useWalletTransactionReadiness(qualification?: WalletQualificationEvidenceV1 | null) {
  const config = useConfig();
  const registry = useWalletProviderRegistry();
  const reconciliation = useWalletIdentityReconciliation();
  const circleBinding = useCircleProviderBinding();
  const [readiness, setReadiness] = useState<TransactionReadiness>(() => Object.freeze({ status: "QUALIFICATION_PENDING", evaluatedAt: new Date().toISOString(), reasons: Object.freeze(["Runtime verification is pending."]) }));
  const generation = useMemo(() => createQualificationGeneration({ registryId: registry.selectedProviderRecord?.identity.registryId, providerLastSeenAt: registry.selectedProviderRecord?.lastSeenAt, connectorUid: reconciliation.currentProvider?.identity.registryId, circleBindingGeneration: circleBinding.evidence.bindingGeneration }), [circleBinding.evidence.bindingGeneration, reconciliation.currentProvider?.identity.registryId, registry.selectedProviderRecord]);
  const harnessQualification = useWalletQualificationHarness(registry.selectedProviderRecord?.provider, generation);
  const currentQualification = qualification ?? harnessQualification;

  useEffect(() => {
    let current = true;
    void (async () => {
      const account = getAccount(config);
      const activeProvider = await account.connector?.getProvider();
      const activeRegistry = getActiveWalletProviderRegistry();
      const selectedRecord = activeRegistry?.getSelected();
      const preflight = currentQualification?.status === "QUALIFIED" ? await verifyCircleAccountPreflight(circleBinding, account.address) : false;
      const next = deriveTransactionReadiness({ registryActive: activeRegistry?.getSnapshot().lifecycle === "active", selectedRecord, selectedRegistryId: activeRegistry?.getSnapshot().selectedProviderId, selectionExplicit: Boolean(activeRegistry?.getSnapshot().selectedProviderId), expectedProvider: reconciliation.currentProvider?.provider, activeWagmiProvider: activeProvider, verifiedAccount: reconciliation.identityVerified ? account.address : undefined, activeAccount: account.address, identityVerified: reconciliation.status === "IDENTITY_VERIFIED", activeChainId: account.chainId, requiredChainId: arcTestnet.id, circleBinding, circleAccountPreflightValid: preflight, qualification: currentQualification, currentQualificationGeneration: generation });
      if (current) setReadiness(next);
    })();
    return () => { current = false; };
  }, [circleBinding, config, currentQualification, generation, reconciliation]);

  return readiness;
}
