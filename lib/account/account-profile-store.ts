import type { TrustVaultAccountProfile } from "@/lib/aws/account-types";

export type SavedAccountAddress = {
  id: string;
  label: string;
  fullName: string;
  email?: string;
  phone?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
  defaultShipping: boolean;
  defaultBilling: boolean;
};

export type SavedAccountWallet = {
  id: string;
  label: string;
  address: string;
  primary: boolean;
  connected: boolean;
  addedAt: string;
};

export type CustomerAccountProfile = {
  customerId: string;
  walletAddress: string;
  displayName: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  country: string;
  timezone: string;
  memberSince: string;
  addresses: SavedAccountAddress[];
  wallets: SavedAccountWallet[];
  preferences: {
    preferredAsset: "USDC";
    preferredNetwork: "Arc Testnet";
    emailReceipts: boolean;
    orderNotifications: boolean;
    rewardNotifications: boolean;
  };
  updatedAt: string;
};

type AccountRegistry = {
  version: 2;
  profiles: Record<string, CustomerAccountProfile>;
  updatedAt: string;
};

const PROFILE_STORAGE_PREFIX = "trustvault.account-profile.v2:";
const LEGACY_STORAGE_PREFIX = "trustvault.account-profile.v1:";
const REGISTRY_STORAGE_KEY = "trustvault.account-registry.v2";

function isBrowser() {
  return typeof window !== "undefined";
}

function normalizeWalletAddress(walletAddress: string) {
  const normalized = walletAddress.trim();

  if (!/^0x[a-fA-F0-9]{40}$/.test(normalized)) {
    throw new Error("A valid wallet address is required.");
  }

  return normalized;
}

function walletKey(walletAddress: string) {
  return normalizeWalletAddress(walletAddress).toLowerCase();
}

function profileStorageKey(walletAddress: string) {
  return `${PROFILE_STORAGE_PREFIX}${walletKey(walletAddress)}`;
}

function legacyStorageKey(walletAddress: string) {
  return `${LEGACY_STORAGE_PREFIX}${walletKey(walletAddress)}`;
}

function createCustomerId(walletAddress: string) {
  return `TV-C-${walletAddress.slice(2, 8).toUpperCase()}`;
}

function isValidSavedWallet(value: unknown): value is SavedAccountWallet {
  if (!value || typeof value !== "object") {
    return false;
  }

  const wallet = value as Partial<SavedAccountWallet>;

  return (
    typeof wallet.id === "string" &&
    typeof wallet.label === "string" &&
    typeof wallet.address === "string" &&
    /^0x[a-fA-F0-9]{40}$/.test(wallet.address) &&
    typeof wallet.primary === "boolean" &&
    typeof wallet.addedAt === "string"
  );
}

function dedupeWallets(wallets: SavedAccountWallet[]) {
  const seen = new Set<string>();
  const result: SavedAccountWallet[] = [];

  for (const wallet of wallets) {
    const key = wallet.address.toLowerCase();

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(wallet);
  }

  return result;
}

function normalizeWalletCollection(input: {
  wallets: SavedAccountWallet[];
  connectedWalletAddress: string;
}) {
  const connectedAddress = normalizeWalletAddress(
    input.connectedWalletAddress,
  );

  let wallets = dedupeWallets(
    input.wallets
      .filter(isValidSavedWallet)
      .map((wallet) => ({
        ...wallet,
        address: normalizeWalletAddress(wallet.address),
        connected:
          wallet.address.toLowerCase() === connectedAddress.toLowerCase(),
      })),
  );

  const connectedExists = wallets.some(
    (wallet) =>
      wallet.address.toLowerCase() === connectedAddress.toLowerCase(),
  );

  if (!connectedExists) {
    wallets = [
      {
        id: `wallet-${connectedAddress.toLowerCase()}`,
        label: "Connected wallet",
        address: connectedAddress,
        primary: wallets.length === 0,
        connected: true,
        addedAt: new Date().toISOString(),
      },
      ...wallets,
    ];
  }

  const firstPrimaryIndex = wallets.findIndex((wallet) => wallet.primary);
  const connectedIndex = wallets.findIndex(
    (wallet) =>
      wallet.address.toLowerCase() === connectedAddress.toLowerCase(),
  );

  const primaryIndex =
    firstPrimaryIndex >= 0
      ? firstPrimaryIndex
      : connectedIndex >= 0
        ? connectedIndex
        : 0;

  return wallets.map((wallet, index) => ({
    ...wallet,
    primary: index === primaryIndex,
    connected:
      wallet.address.toLowerCase() === connectedAddress.toLowerCase(),
  }));
}

function readRegistry(): AccountRegistry {
  const empty: AccountRegistry = {
    version: 2,
    profiles: {},
    updatedAt: new Date(0).toISOString(),
  };

  if (!isBrowser()) {
    return empty;
  }

  try {
    const raw = window.localStorage.getItem(REGISTRY_STORAGE_KEY);

    if (!raw) {
      return empty;
    }

    const parsed = JSON.parse(raw) as Partial<AccountRegistry>;

    if (!parsed || typeof parsed !== "object") {
      return empty;
    }

    return {
      version: 2,
      profiles:
        parsed.profiles && typeof parsed.profiles === "object"
          ? parsed.profiles
          : {},
      updatedAt:
        typeof parsed.updatedAt === "string"
          ? parsed.updatedAt
          : empty.updatedAt,
    };
  } catch {
    return empty;
  }
}

function writeRegistry(profile: CustomerAccountProfile) {
  if (!isBrowser()) {
    return;
  }

  const registry = readRegistry();
  const key = walletKey(profile.walletAddress);

  const nextRegistry: AccountRegistry = {
    version: 2,
    profiles: {
      ...registry.profiles,
      [key]: profile,
    },
    updatedAt: new Date().toISOString(),
  };

  window.localStorage.setItem(
    REGISTRY_STORAGE_KEY,
    JSON.stringify(nextRegistry),
  );
}

function parseStoredProfile(
  raw: string | null,
): Partial<CustomerAccountProfile> | null {
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<CustomerAccountProfile>;

    if (!parsed || typeof parsed !== "object") {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function mergeProfileWithFallback(input: {
  stored: Partial<CustomerAccountProfile> | null;
  fallback: CustomerAccountProfile;
  connectedWalletAddress: string;
  displayName?: string;
  email?: string;
}) {
  const { stored, fallback, connectedWalletAddress } = input;

  if (!stored) {
    return fallback;
  }

  const storedWallets = Array.isArray(stored.wallets)
    ? stored.wallets.filter(isValidSavedWallet)
    : [];

  return {
    ...fallback,
    ...stored,
    walletAddress: fallback.walletAddress,
    // The authenticated server identity is authoritative over legacy browser IDs.
    customerId: fallback.customerId,
    displayName:
      stored.displayName ||
      input.displayName ||
      fallback.displayName,
    email:
      stored.email ||
      input.email ||
      fallback.email,
    addresses: Array.isArray(stored.addresses)
      ? stored.addresses
      : [],
    wallets: normalizeWalletCollection({
      wallets:
        storedWallets.length > 0
          ? storedWallets
          : fallback.wallets,
      connectedWalletAddress,
    }),
    preferences: {
      ...fallback.preferences,
      ...(stored.preferences ?? {}),
    },
  } satisfies CustomerAccountProfile;
}

export function createDefaultCustomerAccountProfile(input: {
  walletAddress: string;
  customerId?: string;
  displayName?: string;
  email?: string;
}): CustomerAccountProfile {
  const walletAddress = normalizeWalletAddress(input.walletAddress);
  const now = new Date().toISOString();

  return {
    customerId: input.customerId ?? createCustomerId(walletAddress),
    walletAddress,
    displayName: input.displayName ?? "",
    email: input.email ?? "",
    phone: "",
    city: "",
    state: "",
    country: "",
    timezone: "",
    memberSince: now,
    addresses: [],
    wallets: [
      {
        id: `wallet-${walletAddress.toLowerCase()}`,
        label: "Primary wallet",
        address: walletAddress,
        primary: true,
        connected: true,
        addedAt: now,
      },
    ],
    preferences: {
      preferredAsset: "USDC",
      preferredNetwork: "Arc Testnet",
      emailReceipts: true,
      orderNotifications: true,
      rewardNotifications: true,
    },
    updatedAt: now,
  };
}

export function loadCustomerAccountProfile(input: {
  walletAddress: string;
  customerId: string;
  displayName?: string;
  email?: string;
  durableProfile?: TrustVaultAccountProfile;
}) {
  const fallback = createDefaultCustomerAccountProfile(input);

  if (!isBrowser()) {
    return input.durableProfile
      ? mergeDurableCustomerAccountProfile(fallback, input.durableProfile)
      : fallback;
  }

  const key = walletKey(input.walletAddress);

  const directV2 = parseStoredProfile(
    window.localStorage.getItem(profileStorageKey(input.walletAddress)),
  );

  const registry = readRegistry();
  const registryProfile =
    registry.profiles[key] &&
    typeof registry.profiles[key] === "object"
      ? registry.profiles[key]
      : null;

  const legacyV1 = parseStoredProfile(
    window.localStorage.getItem(legacyStorageKey(input.walletAddress)),
  );

  const candidates = [directV2, registryProfile, legacyV1].filter(
    (candidate): candidate is Partial<CustomerAccountProfile> =>
      Boolean(candidate),
  );

  if (candidates.length === 0) {
    return input.durableProfile
      ? mergeDurableCustomerAccountProfile(fallback, input.durableProfile)
      : fallback;
  }

  const candidate = candidates.reduce((best, current) => {
    const bestTime = Date.parse(best.updatedAt ?? "") || 0;
    const currentTime = Date.parse(current.updatedAt ?? "") || 0;

    return currentTime >= bestTime ? current : best;
  });

  const loaded = mergeProfileWithFallback({
    stored: candidate,
    fallback,
    connectedWalletAddress: input.walletAddress,
    displayName: input.displayName,
    email: input.email,
  });

  // Self-heal older or registry-only records into both V2 locations.
  try {
    window.localStorage.setItem(
      profileStorageKey(loaded.walletAddress),
      JSON.stringify(loaded),
    );
    writeRegistry(loaded);
  } catch {
    // Loading should still succeed if browser storage is temporarily unavailable.
  }

  return input.durableProfile
    ? mergeDurableCustomerAccountProfile(loaded, input.durableProfile)
    : loaded;
}

export function mergeDurableCustomerAccountProfile(
  localProfile: CustomerAccountProfile,
  durableProfile: TrustVaultAccountProfile,
): CustomerAccountProfile {
  return {
    ...localProfile,
    customerId: durableProfile.customerId,
    displayName: durableProfile.displayName ?? "",
    email: durableProfile.email ?? "",
    phone: durableProfile.phone ?? "",
    country: durableProfile.country ?? "",
    timezone: durableProfile.timezone ?? "",
    memberSince: durableProfile.createdAt,
    updatedAt: durableProfile.updatedAt,
    preferences: {
      ...localProfile.preferences,
      emailReceipts: durableProfile.notificationPreferences?.email ?? localProfile.preferences.emailReceipts,
      orderNotifications: durableProfile.notificationPreferences?.orders ?? localProfile.preferences.orderNotifications,
      rewardNotifications: durableProfile.notificationPreferences?.rewards ?? localProfile.preferences.rewardNotifications,
    },
  };
}

export function saveCustomerAccountProfile(
  profile: CustomerAccountProfile,
) {
  if (!isBrowser()) {
    throw new Error(
      "Customer profile storage is only available in the browser.",
    );
  }

  const walletAddress = normalizeWalletAddress(profile.walletAddress);

  const wallets = normalizeWalletCollection({
    wallets: profile.wallets,
    connectedWalletAddress: walletAddress,
  });

  const saved: CustomerAccountProfile = {
    ...profile,
    walletAddress,
    wallets,
    updatedAt: new Date().toISOString(),
  };

  const serialized = JSON.stringify(saved);

  // Primary V2 record.
  window.localStorage.setItem(
    profileStorageKey(walletAddress),
    serialized,
  );

  // Redundant account registry copy for recovery after reload/reconnect.
  writeRegistry(saved);

  // Keep the old V1 key in sync during this migration window so yesterday's
  // account UI cannot accidentally fall back to stale data.
  window.localStorage.setItem(
    legacyStorageKey(walletAddress),
    serialized,
  );

  return saved;
}

export function createSavedAddressId() {
  return `address-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

export function createSavedWalletId() {
  return `saved-wallet-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}
