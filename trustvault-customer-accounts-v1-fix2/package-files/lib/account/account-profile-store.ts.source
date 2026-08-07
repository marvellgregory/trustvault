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
  memberSince: string;
  addresses: SavedAccountAddress[];
  wallets: SavedAccountWallet[];
  preferences: {
    preferredAsset: "USDC";
    preferredNetwork: "Arc Testnet";
    emailReceipts: boolean;
  };
  updatedAt: string;
};

const STORAGE_PREFIX = "trustvault.account-profile.v1:";

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

function storageKey(walletAddress: string) {
  return `${STORAGE_PREFIX}${normalizeWalletAddress(walletAddress).toLowerCase()}`;
}

function createCustomerId(walletAddress: string) {
  return `TV-C-${walletAddress.slice(2, 8).toUpperCase()}`;
}

export function createDefaultCustomerAccountProfile(input: {
  walletAddress: string;
  displayName?: string;
  email?: string;
}): CustomerAccountProfile {
  const walletAddress = normalizeWalletAddress(input.walletAddress);
  const now = new Date().toISOString();

  return {
    customerId: createCustomerId(walletAddress),
    walletAddress,
    displayName: input.displayName ?? "",
    email: input.email ?? "",
    phone: "",
    city: "",
    state: "",
    country: "",
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
    },
    updatedAt: now,
  };
}

export function loadCustomerAccountProfile(input: {
  walletAddress: string;
  displayName?: string;
  email?: string;
}) {
  const fallback = createDefaultCustomerAccountProfile(input);

  if (!isBrowser()) {
    return fallback;
  }

  try {
    const stored = window.localStorage.getItem(
      storageKey(input.walletAddress),
    );

    if (!stored) {
      return fallback;
    }

    const parsed = JSON.parse(stored) as Partial<CustomerAccountProfile>;

    const wallets = Array.isArray(parsed.wallets)
      ? parsed.wallets
      : fallback.wallets;

    const connectedWallet = fallback.wallets[0];
    const withoutConnected = wallets.filter(
      (wallet) =>
        wallet.address.toLowerCase() !==
        connectedWallet.address.toLowerCase(),
    );

    return {
      ...fallback,
      ...parsed,
      walletAddress: fallback.walletAddress,
      customerId: parsed.customerId || fallback.customerId,
      displayName:
        parsed.displayName ||
        input.displayName ||
        fallback.displayName,
      email:
        parsed.email ||
        input.email ||
        fallback.email,
      addresses: Array.isArray(parsed.addresses)
        ? parsed.addresses
        : [],
      wallets: [
        connectedWallet,
        ...withoutConnected.map((wallet) => ({
          ...wallet,
          primary: false,
          connected: false,
        })),
      ],
      preferences: {
        ...fallback.preferences,
        ...(parsed.preferences ?? {}),
      },
    } satisfies CustomerAccountProfile;
  } catch {
    return fallback;
  }
}

export function saveCustomerAccountProfile(
  profile: CustomerAccountProfile,
) {
  if (!isBrowser()) {
    throw new Error(
      "Customer profile storage is only available in the browser.",
    );
  }

  const walletAddress =
    normalizeWalletAddress(
      profile.walletAddress,
    );

  const uniqueWallets = Array.from(
    new Map(
      profile.wallets
        .filter((wallet) =>
          /^0x[a-fA-F0-9]{40}$/.test(
            wallet.address,
          ),
        )
        .map((wallet) => [
          wallet.address.toLowerCase(),
          wallet,
        ]),
    ).values(),
  );

  const saved: CustomerAccountProfile = {
    ...profile,
    walletAddress,
    wallets: uniqueWallets.map((wallet) => ({
      ...wallet,
      primary:
        wallet.address.toLowerCase() ===
        walletAddress.toLowerCase(),
      connected:
        wallet.address.toLowerCase() ===
        walletAddress.toLowerCase(),
    })),
    updatedAt: new Date().toISOString(),
  };

  window.localStorage.setItem(
    storageKey(saved.walletAddress),
    JSON.stringify(saved),
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
