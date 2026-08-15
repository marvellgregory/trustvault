import type { SerializableProviderIdentity } from "./provider-types.js";

export type WalletSessionState =
  | "DETECTED"
  | "CONNECTED"
  | "ARC_READY"
  | "COMPATIBLE"
  | "TRUSTVAULT_QUALIFIED"
  | "INVALIDATED";

export type WalletConnectionState =
  | "disconnected"
  | "connecting"
  | "connected";

export type ProviderSelectionState = "detected" | "selected" | "unavailable";

export type CapabilitySupport = "supported" | "unsupported" | "unknown";

export type WalletCapabilityName =
  | "canRequestAccounts"
  | "canSwitchChain"
  | "canAddChain"
  | "canSendTransaction"
  | "canWriteContract"
  | "circleAdapterAvailable"
  | "supportsArcTestnet"
  | "qualifiedForTrustVault";

export type WalletCapabilities = Readonly<
  Record<WalletCapabilityName, CapabilitySupport>
>;

export type WalletQualificationStatus =
  | "UNTESTED"
  | "TESTING"
  | "QUALIFIED"
  | "FAILED"
  | "BLOCKED";

export type WalletQualificationState = Readonly<{
  status: WalletQualificationStatus;
  providerIdentityKey: string;
  suiteVersion?: string;
  walletVersion?: string;
  platform?: string;
  evaluatedAt?: string;
  reasons: readonly string[];
}>;

export type WalletConnectionIdentity = Readonly<{
  registryId: string;
  source: SerializableProviderIdentity["source"];
  uuid?: string;
  rdns?: string;
  name: string;
  icon?: string;
}>;

export type WalletChainState = Readonly<{
  chainId?: number;
  expectedArcChainId: number;
  known: boolean;
  arcReady: boolean;
}>;

export type WalletSessionBindings = Readonly<{
  wagmi?: Readonly<{
    providerIdentityKey: string;
    account?: `0x${string}`;
    chainId?: number;
    connectorId?: string;
  }>;
  viem?: Readonly<{
    providerIdentityKey: string;
    account?: `0x${string}`;
    chainId?: number;
  }>;
  circle?: Readonly<{
    providerIdentityKey: string;
  }>;
}>;

export type WalletSession = Readonly<{
  sessionId: string;
  provider: WalletConnectionIdentity;
  providerSelection: ProviderSelectionState;
  address?: `0x${string}`;
  connection: WalletConnectionState;
  chain: WalletChainState;
  capabilities: WalletCapabilities;
  qualification: WalletQualificationState;
  bindings: WalletSessionBindings;
  state: WalletSessionState;
  createdAt: string;
  updatedAt: string;
}>;

export type SerializableWalletSessionSnapshot = Readonly<{
  schemaVersion: 1;
  sessionId: string;
  provider: WalletConnectionIdentity;
  providerSelection: ProviderSelectionState;
  address?: `0x${string}`;
  connection: WalletConnectionState;
  chain: WalletChainState;
  capabilities: WalletCapabilities;
  qualification: WalletQualificationState;
  state: WalletSessionState;
  createdAt: string;
  updatedAt: string;
}>;
