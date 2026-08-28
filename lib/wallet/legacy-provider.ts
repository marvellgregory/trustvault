import type { EIP1193Provider } from "viem";

import type {
  RegistryProviderRecord,
  SerializableProviderIdentity,
} from "./provider-types.js";

export type LegacyFallbackEvaluation = Readonly<{
  eligible: boolean;
  reason:
    | "eligible"
    | "eip6963-provider-available"
    | "no-legacy-provider"
    | "ambiguous-legacy-providers";
}>;

export function createLegacyProviderRecord(input: {
  provider: EIP1193Provider;
  registryId: string;
  now?: number;
}): RegistryProviderRecord {
  const registryId = input.registryId.trim();

  if (!registryId) {
    throw new Error("A non-empty registry ID is required for a legacy provider.");
  }

  const identity: SerializableProviderIdentity = Object.freeze({
    registryId: `legacy:${registryId}`,
    source: "legacy",
    name: "Legacy injected wallet",
  });
  const timestamp = input.now ?? Date.now();

  return Object.freeze({
    identity,
    provider: input.provider,
    aliases: Object.freeze([]),
    state: "available",
    announcedAt: timestamp,
    lastSeenAt: timestamp,
    conflicts: Object.freeze([]),
  });
}

export function evaluateLegacyFallback(input: {
  usableEip6963ProviderCount: number;
  legacyProviders: readonly EIP1193Provider[];
}): LegacyFallbackEvaluation {
  if (input.usableEip6963ProviderCount > 0) {
    return Object.freeze({
      eligible: false,
      reason: "eip6963-provider-available",
    });
  }

  if (input.legacyProviders.length === 0) {
    return Object.freeze({ eligible: false, reason: "no-legacy-provider" });
  }

  if (input.legacyProviders.length > 1) {
    return Object.freeze({
      eligible: false,
      reason: "ambiguous-legacy-providers",
    });
  }

  return Object.freeze({ eligible: true, reason: "eligible" });
}
