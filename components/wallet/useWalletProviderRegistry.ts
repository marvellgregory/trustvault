"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";

import {
  createWalletProviderRegistry,
} from "@/lib/wallet/provider-registry";
import type {
  ProviderEventTransport,
  RegistryProviderRecord,
  SerializableProviderIdentity,
  WalletProviderRegistrySnapshot,
} from "@/lib/wallet/provider-types";
import type { WalletSessionState } from "@/lib/wallet/session-types";

const EMPTY_SNAPSHOT: WalletProviderRegistrySnapshot = Object.freeze({
  lifecycle: "idle",
  providers: Object.freeze([]),
});

let sharedActivation: ReturnType<typeof activateWalletProviderRegistry> | null = null;
let sharedSnapshot = EMPTY_SNAPSHOT;
let sharedConsumers = 0;
const sharedListeners = new Set<() => void>();

function publishSharedSnapshot(snapshot: WalletProviderRegistrySnapshot) {
  sharedSnapshot = snapshot;
  for (const listener of sharedListeners) listener();
}

function subscribeShared(listener: () => void) {
  sharedListeners.add(listener);
  return () => sharedListeners.delete(listener);
}

function acquireSharedRegistry() {
  sharedConsumers += 1;
  if (!sharedActivation) {
    sharedActivation = activateWalletProviderRegistry({
      transport: createWindowTransport(),
      onSnapshot: publishSharedSnapshot,
    });
  }
  return () => {
    sharedConsumers -= 1;
    if (sharedConsumers === 0 && sharedActivation) {
      sharedActivation.dispose();
      sharedActivation = null;
      publishSharedSnapshot(EMPTY_SNAPSHOT);
    }
  };
}

export type WalletChooserProviderItem = Readonly<{
  identity: SerializableProviderIdentity;
  record: RegistryProviderRecord;
  selected: boolean;
  selectable: boolean;
  status: WalletSessionState;
}>;

export function createWalletChooserProviderItems(
  snapshot: WalletProviderRegistrySnapshot,
): readonly WalletChooserProviderItem[] {
  return Object.freeze(
    snapshot.providers.map((record) =>
      Object.freeze({
        identity: record.identity,
        record,
        selected: snapshot.selectedProviderId === record.identity.registryId,
        selectable: record.state === "available",
        status: "DETECTED" as const,
      }),
    ),
  );
}

export function activateWalletProviderRegistry(input: {
  transport: ProviderEventTransport;
  onSnapshot: (snapshot: WalletProviderRegistrySnapshot) => void;
}) {
  const registry = createWalletProviderRegistry({ transport: input.transport });
  const publish = () => input.onSnapshot(registry.getSnapshot());
  const unsubscribe = registry.subscribe(publish);

  registry.start();
  registry.requestAnnouncements();
  publish();

  return Object.freeze({
    registry,
    dispose() {
      unsubscribe();
      registry.stop();
    },
  });
}

function createWindowTransport(): ProviderEventTransport {
  return {
    addEventListener(type, listener) {
      window.addEventListener(type, listener as EventListener);
    },
    removeEventListener(type, listener) {
      window.removeEventListener(type, listener as EventListener);
    },
    dispatchEvent(event) {
      return window.dispatchEvent(event);
    },
  };
}

export function useWalletProviderRegistry() {
  const snapshot = useSyncExternalStore(
    subscribeShared,
    () => sharedSnapshot,
    () => EMPTY_SNAPSHOT,
  );

  useEffect(() => {
    return acquireSharedRegistry();
  }, []);

  const selectProvider = useCallback((providerId: string) => {
    const selected = sharedActivation?.registry.select(providerId);
    if (!selected) throw new Error("Wallet provider discovery is not active.");
    return selected.identity;
  }, []);

  const clearSelection = useCallback(() => {
    sharedActivation?.registry.clearSelection();
  }, []);

  return {
    snapshot,
    providers: createWalletChooserProviderItems(snapshot),
    selectedProviderRecord:
      snapshot.providers.find(
        (record) => record.identity.registryId === snapshot.selectedProviderId,
      ) ?? null,
    selectedProvider:
      snapshot.providers.find(
        (record) => record.identity.registryId === snapshot.selectedProviderId,
      )?.identity ?? null,
    selectProvider,
    clearSelection,
  };
}
