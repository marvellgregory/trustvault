export type TrustVaultAccountSchemaVersion = 1;

export type TrustVaultAccountStatus =
  | "ACTIVE"
  | "SUSPENDED"
  | "DELETED";

export type TrustVaultNotificationPreferences = Readonly<{
  email: boolean;
  orders: boolean;
  rewards: boolean;
}>;

export type TrustVaultAccountProfile = Readonly<{
  // Durable IDs are assigned by the future authenticated backend, never
  // copied from a wallet-derived or browser-local customer ID.
  customerId: string;
  schemaVersion: TrustVaultAccountSchemaVersion;
  status: TrustVaultAccountStatus;
  displayName?: string;
  email?: string;
  phone?: string;
  country?: string;
  timezone?: string;
  preferredCurrency: "USDC";
  notificationPreferences?: TrustVaultNotificationPreferences;
  createdAt: string;
  updatedAt: string;
  lastSeenAt?: string;
}>;

export type TrustVaultWalletRole =
  | "PRIMARY"
  | "SECONDARY";

export type TrustVaultWalletAssociationStatus =
  | "UNVERIFIED"
  | "VERIFIED"
  | "REVOKED";

export type TrustVaultWalletVerificationMethod =
  "WALLET_SIGNATURE";

export type TrustVaultWalletAssociation = Readonly<{
  address: string;
  normalizedAddress: string;
  label?: string;
  role: TrustVaultWalletRole;
  // Address presence or wallet connection never implies verification.
  associationStatus: TrustVaultWalletAssociationStatus;
  verificationMethod?: TrustVaultWalletVerificationMethod;
  verifiedAt?: string;
  linkedAt: string;
  updatedAt: string;
}>;

export type TrustVaultAccountProfileResponse = Readonly<{
  profile: TrustVaultAccountProfile;
  wallets: readonly TrustVaultWalletAssociation[];
}>;
