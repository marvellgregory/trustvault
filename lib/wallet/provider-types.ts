import type { EIP1193Provider } from "viem";

export type WalletProviderSource = "eip6963" | "legacy";

export type Eip6963ProviderInfo = Readonly<{
  uuid: string;
  name: string;
  icon: string;
  rdns: string;
}>;

export type Eip6963ProviderDetail = Readonly<{
  info: Eip6963ProviderInfo;
  provider: EIP1193Provider;
}>;

export type SerializableProviderIdentity = Readonly<{
  registryId: string;
  source: WalletProviderSource;
  uuid?: string;
  rdns?: string;
  name: string;
  icon?: string;
}>;

export type RegistryProviderState = "available" | "conflicted";

export type ProviderConflict = Readonly<{
  type: "uuid-provider-mismatch";
  uuid: string;
  detectedAt: number;
}>;

export type RegistryProviderRecord = Readonly<{
  identity: SerializableProviderIdentity;
  provider: EIP1193Provider;
  aliases: readonly SerializableProviderIdentity[];
  state: RegistryProviderState;
  announcedAt: number;
  lastSeenAt: number;
  conflicts: readonly ProviderConflict[];
}>;

export type WalletProviderRegistrySnapshot = Readonly<{
  lifecycle: "idle" | "active";
  providers: readonly RegistryProviderRecord[];
  selectedProviderId?: string;
}>;

export interface ProviderEventTransport {
  addEventListener(
    type: string,
    listener: (event: Event) => void,
  ): void;
  removeEventListener(
    type: string,
    listener: (event: Event) => void,
  ): void;
  dispatchEvent(event: Event): boolean;
}

export type WalletProviderRegistryListener = () => void;
