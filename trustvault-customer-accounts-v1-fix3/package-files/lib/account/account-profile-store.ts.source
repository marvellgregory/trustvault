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

function isValidSavedWallet(
  wallet: unknown,
): wallet is SavedAccountWallet {
  if (!wallet || typeof wallet !== "object") {
    return false;
  }

  const candidate = wallet as Partial<SavedAccountWallet>;

  return (
    typeof candidate.id === "string" &&
    typeof candidate.label === "string" &&
    typeof candidate.address === "string" &&
    /^0x[a-fA-F0-9]{40}$/.test(candidate.address) &&
    typeof candidate.primary === "boolean" &&
    typeof candidate.connected === "boolean" &&
    typeof candidate.addedAt === "string"
  );
}

function dedupeWallets(
  wallets: SavedAccountWallet[],
) {
  return Array.from(
    new Map(
      wallets.map((wallet) => [
        wallet.address.toLowerCase(),
        wallet,
      ]),
    ).values(),
  );
}

function normalizeWalletCollection(input: {
  wallets: SavedAccountWallet[];
  connectedWalletAddress: string;
}) {
  const connectedWalletAddress =
    normalizeWalletAddress(
      input.connectedWalletAddress,
    );

  const deduped =
    dedupeWallets(input.wallets);

  const connectedIndex =
    deduped.findIndex(
      (wallet) =>
        wallet.address.toLowerCase() ===
        connectedWalletAddress.toLowerCase(),
    );

  const withConnectedWallet =
    connectedIndex >= 0
      ? deduped
      : [
          {
            id: `wallet-${connectedWalletAddress.toLowerCase()}`,
            label: "Connected wallet",
            address: connectedWalletAddress,
            primary: deduped.length === 0,
            connected: true,
            addedAt: new Date().toISOString(),
          },
          ...deduped,
        ];

  const primaryIndexes =
    withConnectedWallet
      .map((wallet, index) =>
        wallet.primary ? index : -1,
      )
      .filter((index) => index >= 0);

  const preferredPrimaryIndex =
    primaryIndexes.length > 0
      ? primaryIndexes[0]
      : withConnectedWallet.findIndex(
          (wallet) =>
            wallet.address.toLowerCase() ===
            connectedWalletAddress.toLowerCase(),
        );

  return withConnectedWallet.map(
    (wallet, index) => ({
      ...wallet,
      primary: index === preferredPrimaryIndex,
      connected:
        wallet.address.toLowerCase() ===
        connectedWalletAddress.toLowerCase(),
    }),
  );
}

export function createDefaultCustomerAccountProfile(input: {
  walletAddress: string;
  displayName?: string;
  email?: string;
}): CustomerAccountProfile {
  const walletAddress =
    normalizeWalletAddress(
      input.walletAddress,
    );

  const now = new Date().toISOString();

  return {
    customerId:
      createCustomerId(walletAddress),
    walletAddress,
    displayName:
      input.displayName ?? "",
    email:
      input.email ?? "",
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
  const fallback =
    createDefaultCustomerAccountProfile(
      input,
    );

  if (!isBrowser()) {
    return fallback;
  }

  try {
    const stored =
      window.localStorage.getItem(
        storageKey(
          input.walletAddress,
        ),
      );

    if (!stored) {
      return fallback;
    }

    const parsed =
      JSON.parse(stored) as Partial<CustomerAccountProfile>;

    const parsedWallets =
      Array.isArray(parsed.wallets)
        ? parsed.wallets.filter(
            isValidSavedWallet,
          )
        : [];

    const wallets =
      normalizeWalletCollection({
        wallets:
          parsedWallets.length > 0
            ? parsedWallets
            : fallback.wallets,
        connectedWalletAddress:
          fallback.walletAddress,
      });

    return {
      ...fallback,
      ...parsed,
      walletAddress:
        fallback.walletAddress,
      customerId:
        parsed.customerId ||
        fallback.customerId,
      displayName:
        parsed.displayName ||
        input.displayName ||
        fallback.displayName,
      email:
        parsed.email ||
        input.email ||
        fallback.email,
      addresses:
        Array.isArray(parsed.addresses)
          ? parsed.addresses
          : [],
      wallets,
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

  const validWallets =
    profile.wallets
      .filter(
        isValidSavedWallet,
      )
      .map((wallet) => ({
        ...wallet,
        address:
          normalizeWalletAddress(
            wallet.address,
          ),
      }));

  const wallets =
    normalizeWalletCollection({
      wallets:
        validWallets.length > 0
          ? validWallets
          : createDefaultCustomerAccountProfile({
              walletAddress,
              displayName:
                profile.displayName,
              email:
                profile.email,
            }).wallets,
      connectedWalletAddress:
        walletAddress,
    });

  const saved: CustomerAccountProfile = {
    ...profile,
    walletAddress,
    wallets,
    updatedAt:
      new Date().toISOString(),
  };

  window.localStorage.setItem(
    storageKey(
      saved.walletAddress,
    ),
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
