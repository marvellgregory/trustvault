"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  createWalletProviderRegistry,
  type WalletProviderRegistry,
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
  const registryRef = useRef<WalletProviderRegistry | null>(null);
  const [snapshot, setSnapshot] =
    useState<WalletProviderRegistrySnapshot>(EMPTY_SNAPSHOT);

  useEffect(() => {
    const activeRegistry = activateWalletProviderRegistry({
      transport: createWindowTransport(),
      onSnapshot: setSnapshot,
    });
    registryRef.current = activeRegistry.registry;

    return () => {
      registryRef.current = null;
      activeRegistry.dispose();
    };
  }, []);

  const selectProvider = useCallback((providerId: string) => {
    const selected = registryRef.current?.select(providerId);
    if (!selected) throw new Error("Wallet provider discovery is not active.");
    return selected.identity;
  }, []);

  const clearSelection = useCallback(() => {
    registryRef.current?.clearSelection();
  }, []);

  return {
    snapshot,
    providers: createWalletChooserProviderItems(snapshot),
    selectedProvider:
      snapshot.providers.find(
        (record) => record.identity.registryId === snapshot.selectedProviderId,
      )?.identity ?? null,
    selectProvider,
    clearSelection,
  };
}
