import type { EIP1193Provider } from "viem";

import {
  createSerializableProviderIdentity,
  normalizeProviderMetadata,
} from "./provider-identity.js";
import type {
  Eip6963ProviderDetail,
  ProviderEventTransport,
  RegistryProviderRecord,
  SerializableProviderIdentity,
  WalletProviderRegistryListener,
  WalletProviderRegistrySnapshot,
} from "./provider-types.js";

const ANNOUNCE_EVENT = "eip6963:announceProvider";
const REQUEST_EVENT = "eip6963:requestProvider";

type MutableProviderRecord = {
  identity: SerializableProviderIdentity;
  provider: EIP1193Provider;
  aliases: SerializableProviderIdentity[];
  state: "available" | "conflicted";
  announcedAt: number;
  lastSeenAt: number;
  conflicts: Array<{
    type: "uuid-provider-mismatch";
    uuid: string;
    detectedAt: number;
  }>;
};

export interface WalletProviderRegistry {
  start(): void;
  stop(): void;
  requestAnnouncements(): void;
  select(providerId: string): RegistryProviderRecord;
  clearSelection(): void;
  getSelected(): RegistryProviderRecord | null;
  getSnapshot(): WalletProviderRegistrySnapshot;
  subscribe(listener: WalletProviderRegistryListener): () => void;
}

export function createWalletProviderRegistry(input: {
  transport: ProviderEventTransport;
  now?: () => number;
}): WalletProviderRegistry {
  const now = input.now ?? Date.now;
  const records = new Map<string, MutableProviderRecord>();
  const uuidToRecordId = new Map<string, string>();
  const providerToRecordId = new WeakMap<object, string>();
  const listeners = new Set<WalletProviderRegistryListener>();
  let active = false;
  let selectedProviderId: string | undefined;

  const notify = () => {
    for (const listener of [...listeners]) listener();
  };

  const announceListener = (event: Event) => {
    const detail = (event as Event & { detail?: unknown }).detail;
    if (!isProviderDetail(detail)) return;

    const info = normalizeProviderMetadata(detail.info);
    if (!info) return;

    const identity = createSerializableProviderIdentity(info);
    const existingIdForUuid = uuidToRecordId.get(info.uuid);

    if (existingIdForUuid) {
      const record = records.get(existingIdForUuid);
      if (!record) return;

      if (record.provider !== detail.provider) {
        record.state = "conflicted";
        record.lastSeenAt = now();
        if (!record.conflicts.some((conflict) => conflict.uuid === info.uuid)) {
          record.conflicts.push({
            type: "uuid-provider-mismatch",
            uuid: info.uuid,
            detectedAt: record.lastSeenAt,
          });
        }
        if (selectedProviderId === existingIdForUuid) selectedProviderId = undefined;
        notify();
        return;
      }

      refreshIdentity(record, info.uuid, identity, now());
      notify();
      return;
    }

    const existingIdForProvider = providerToRecordId.get(detail.provider);
    if (existingIdForProvider) {
      const record = records.get(existingIdForProvider);
      if (!record) return;

      if (!record.aliases.some((alias) => alias.uuid === info.uuid)) {
        record.aliases.push(identity);
      }
      record.lastSeenAt = now();
      uuidToRecordId.set(info.uuid, existingIdForProvider);
      notify();
      return;
    }

    const timestamp = now();
    records.set(identity.registryId, {
      identity,
      provider: detail.provider,
      aliases: [],
      state: "available",
      announcedAt: timestamp,
      lastSeenAt: timestamp,
      conflicts: [],
    });
    uuidToRecordId.set(info.uuid, identity.registryId);
    providerToRecordId.set(detail.provider, identity.registryId);
    notify();
  };

  return {
    start() {
      if (active) return;
      active = true;
      input.transport.addEventListener(ANNOUNCE_EVENT, announceListener);
      notify();
    },

    stop() {
      if (!active) return;
      input.transport.removeEventListener(ANNOUNCE_EVENT, announceListener);
      active = false;
      notify();
    },

    requestAnnouncements() {
      if (!active) {
        throw new Error("Start the wallet provider registry before requesting announcements.");
      }
      input.transport.dispatchEvent(new Event(REQUEST_EVENT));
    },

    select(providerId) {
      const record = records.get(providerId);
      if (!record) throw new Error("The requested wallet provider is unavailable.");
      if (record.state === "conflicted") {
        throw new Error("The requested wallet provider has conflicting announcements.");
      }
      selectedProviderId = providerId;
      notify();
      return freezeRecord(record);
    },

    clearSelection() {
      if (!selectedProviderId) return;
      selectedProviderId = undefined;
      notify();
    },

    getSelected() {
      if (!selectedProviderId) return null;
      const record = records.get(selectedProviderId);
      return record && record.state === "available" ? freezeRecord(record) : null;
    },

    getSnapshot() {
      return Object.freeze({
        lifecycle: active ? "active" : "idle",
        providers: Object.freeze(
          [...records.values()]
            .sort((left, right) =>
              left.identity.registryId.localeCompare(right.identity.registryId),
            )
            .map(freezeRecord),
        ),
        ...(selectedProviderId ? { selectedProviderId } : {}),
      });
    },

    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

function isProviderDetail(value: unknown): value is Eip6963ProviderDetail {
  if (!value || typeof value !== "object") return false;
  const candidate = value as { info?: unknown; provider?: unknown };
  return (
    Boolean(candidate.info) &&
    Boolean(candidate.provider) &&
    (typeof candidate.provider === "object" ||
      typeof candidate.provider === "function") &&
    typeof (candidate.provider as { request?: unknown }).request === "function"
  );
}

function refreshIdentity(
  record: MutableProviderRecord,
  uuid: string,
  identity: SerializableProviderIdentity,
  timestamp: number,
) {
  if (record.identity.uuid === uuid) {
    record.identity = identity;
  } else {
    const index = record.aliases.findIndex((alias) => alias.uuid === uuid);
    if (index >= 0) record.aliases[index] = identity;
  }
  record.lastSeenAt = timestamp;
}

function freezeRecord(record: MutableProviderRecord): RegistryProviderRecord {
  return Object.freeze({
    identity: record.identity,
    provider: record.provider,
    aliases: Object.freeze([...record.aliases]),
    state: record.state,
    announcedAt: record.announcedAt,
    lastSeenAt: record.lastSeenAt,
    conflicts: Object.freeze(
      record.conflicts.map((conflict) => Object.freeze({ ...conflict })),
    ),
  });
}
