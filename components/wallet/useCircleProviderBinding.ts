"use client";

import { useMemo } from "react";
import { getAccount } from "wagmi/actions";
import { useAccount, useConfig } from "wagmi";
import { arcTestnet } from "viem/chains";

import { getActiveWalletProviderRegistry, useWalletProviderRegistry } from "@/components/wallet/useWalletProviderRegistry";
import { useWalletIdentityReconciliation } from "@/components/wallet/useWalletIdentityReconciliation";
import { CIRCLE_UNBOUND, createCircleProviderBinding } from "@/lib/app-kit/circle-provider-binding";
import { resolveConnectorProvider } from "@/lib/wallet/connector-provider-provenance";

function bindingGeneration(input: { registryId?: string; providerLastSeenAt?: number; connectorUid?: string; account?: string; chainId?: number }) {
  return [input.registryId, input.providerLastSeenAt, input.connectorUid, input.account?.toLowerCase(), input.chainId].join(":");
}

export function useCircleProviderBinding() {
  const config = useConfig();
  const account = useAccount();
  const registry = useWalletProviderRegistry();
  const reconciliation = useWalletIdentityReconciliation();

  return useMemo(() => {
    const record = reconciliation.currentProvider;
    if (reconciliation.status !== "IDENTITY_VERIFIED" || !record || !account.address || !account.chainId || !account.connector) return CIRCLE_UNBOUND;
    const generation = bindingGeneration({ registryId: record.identity.registryId, providerLastSeenAt: record.lastSeenAt, connectorUid: account.connector.uid, account: account.address, chainId: account.chainId });
    const revalidate = async () => {
      const liveAccount = getAccount(config);
      const activeRegistry = getActiveWalletProviderRegistry();
      const snapshot = activeRegistry?.getSnapshot();
      const selectedRecord = activeRegistry?.getSelected();
      const activeProvider = (await resolveConnectorProvider({ connector: liveAccount.connector, selectedProvider: selectedRecord, registryProviders: snapshot?.providers ?? [] })).provider;
      const currentGeneration = bindingGeneration({ registryId: selectedRecord?.identity.registryId, providerLastSeenAt: selectedRecord?.lastSeenAt, connectorUid: liveAccount.connector?.uid, account: liveAccount.address, chainId: liveAccount.chainId });
      return { registryActive: snapshot?.lifecycle === "active", selectedRegistryId: snapshot?.selectedProviderId, selectedRecord, verifiedProvider: record.provider, activeWagmiProvider: activeProvider, identityVerified: reconciliation.status === "IDENTITY_VERIFIED", connected: liveAccount.isConnected, expectedAccount: account.address, activeAccount: liveAccount.address, expectedChainId: account.chainId, activeChainId: liveAccount.chainId, requiredChainId: arcTestnet.id, bindingGeneration: generation, currentGeneration };
    };
    return createCircleProviderBinding({ registryActive: registry.snapshot.lifecycle === "active", selectedRegistryId: registry.snapshot.selectedProviderId, selectedRecord: registry.selectedProviderRecord, verifiedProvider: record.provider, activeWagmiProvider: record.provider, identityVerified: true, connected: account.isConnected, expectedAccount: account.address, activeAccount: account.address, expectedChainId: account.chainId, activeChainId: account.chainId, requiredChainId: arcTestnet.id, bindingGeneration: generation, currentGeneration: generation, revalidate });
  }, [account.address, account.chainId, account.connector, account.isConnected, config, reconciliation, registry.selectedProviderRecord, registry.snapshot]);
}
