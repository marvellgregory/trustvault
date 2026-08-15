"use client";

import { useCallback, useRef, useState } from "react";
import { getConnections } from "wagmi/actions";
import { useAccount, useConfig, useConnect } from "wagmi";
import { arcTestnet } from "viem/chains";

import {
  getActiveWalletProviderRegistry,
  useWalletProviderRegistry,
} from "@/components/wallet/useWalletProviderRegistry";
import {
  completeBinding,
  connectingBinding,
  failedBinding,
  invalidateBinding,
  selectedBinding,
  type SelectedProviderBinding,
} from "@/lib/wallet/selected-provider-binding";
import {
  assertConnectableProviderRecord,
  createSelectedProviderConnector,
  createSelectedProviderConnectorId,
} from "@/lib/wallet/selected-provider-connector";

export function useSelectedProviderConnection() {
  const registryState = useWalletProviderRegistry();
  const config = useConfig();
  const account = useAccount();
  const { connectAsync } = useConnect();
  const [attemptBinding, setAttemptBinding] = useState<SelectedProviderBinding>({ phase: "DETECTED" });
  const activeAttempt = useRef<string | null>(null);
  const pending = useRef(false);

  const selected = registryState.selectedProviderRecord;
  const binding = selected && attemptBinding.selectedRegistryId !== selected.identity.registryId
    ? selectedBinding(selected)
    : attemptBinding;

  const selectProvider = useCallback((providerId: string) => {
    activeAttempt.current = null;
    const identity = registryState.selectProvider(providerId);
    const record = getActiveWalletProviderRegistry()?.getSelected();
    if (!record) throw new Error("Selected provider disappeared.");
    setAttemptBinding(selectedBinding(record));
    return identity;
  }, [registryState]);

  const clearSelection = useCallback(() => {
    activeAttempt.current = null;
    registryState.clearSelection();
    setAttemptBinding({ phase: "DETECTED" });
  }, [registryState]);

  const connectSelected = useCallback(async () => {
    if (pending.current) return;
    const registry = getActiveWalletProviderRegistry();
    const snapshot = registry?.getSnapshot();
    const expected = registry?.getSelected();
    const record = assertConnectableProviderRecord({
      record: expected,
      selectedRegistryId: snapshot?.selectedProviderId,
      expectedRecord: selected ?? undefined,
    });
    const connectorId = createSelectedProviderConnectorId(record.identity.registryId);
    const attemptId = crypto.randomUUID();
    const started = connectingBinding(selectedBinding(record), attemptId, connectorId, new Date().toISOString());
    activeAttempt.current = attemptId;
    pending.current = true;
    setAttemptBinding(started);

    try {
      if (account.isConnected && account.connector) {
        const activeProvider = await account.connector.getProvider();
        if (activeProvider !== record.provider) {
          const invalid = invalidateBinding(started, "PROVIDER_MISMATCH", "Another wallet is currently connected. Disconnect it before connecting the selected wallet.");
          setAttemptBinding(invalid);
          return invalid;
        }
        const adopted = completeBinding({ binding: started, attemptId, expectedProvider: record.provider, activeProvider, returnedAccount: account.address, activeAccount: account.address, chainId: account.chainId ?? 0, arcChainId: arcTestnet.id });
        setAttemptBinding(adopted);
        return adopted;
      }

      const connector = createSelectedProviderConnector(record);
      const result = await connectAsync({ connector });
      const currentRegistry = getActiveWalletProviderRegistry();
      const current = currentRegistry?.getSelected();
      if (activeAttempt.current !== attemptId || current?.provider !== record.provider || current?.identity.registryId !== record.identity.registryId) {
        const stale = invalidateBinding(started, "STALE", "The selected wallet changed while authorization was pending.");
        setAttemptBinding(stale);
        return stale;
      }
      const connection = getConnections(config).find((item) => item.connector.id === connectorId);
      const activeProvider = await connection?.connector.getProvider();
      const completed = completeBinding({ binding: started, attemptId, expectedProvider: record.provider, activeProvider, returnedAccount: result.accounts[0], activeAccount: connection?.accounts[0], chainId: result.chainId, arcChainId: arcTestnet.id });
      setAttemptBinding(completed);
      return completed;
    } catch (error) {
      const failed = activeAttempt.current === attemptId
        ? failedBinding(started, error)
        : invalidateBinding(started, "STALE", "This connection attempt is no longer current.");
      setAttemptBinding(failed);
      return failed;
    } finally {
      if (activeAttempt.current === attemptId) activeAttempt.current = null;
      pending.current = false;
    }
  }, [account.address, account.chainId, account.connector, account.isConnected, config, connectAsync, selected]);

  return { ...registryState, binding, selectProvider, clearSelection, connectSelected };
}
