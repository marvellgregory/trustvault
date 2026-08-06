import type {
  CreateWalletCustomerInput,
  CustomerId,
  CustomerIdentity,
  CustomerIdentityType,
  CustomerProfile,
  LinkCustomerIdentityInput,
  UpdateCustomerProfileInput,
} from "@/lib/account/customer-types";

export const CUSTOMER_UPDATED_EVENT =
  "trustvault:customer-updated";

const STORAGE_KEY =
  "trustvault.customers.v1";

function isBrowser() {
  return typeof window !== "undefined";
}

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

function normalizeIdentityValue(
  type: CustomerIdentityType,
  value: string,
) {
  const normalized =
    value.trim().toLowerCase();

  if (
    type === "wallet" &&
    !/^0x[a-f0-9]{40}$/.test(normalized)
  ) {
    throw new Error(
      "A valid EVM wallet address is required.",
    );
  }

  if (
    type === "email" &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      normalized,
    )
  ) {
    throw new Error(
      "A valid email address is required.",
    );
  }

  if (!normalized) {
    throw new Error(
      "An identity value is required.",
    );
  }

  return normalized;
}

function readCustomers(): Record<
  CustomerId,
  CustomerProfile
> {
  if (!isBrowser()) {
    return {};
  }

  try {
    const storedValue =
      window.localStorage.getItem(
        STORAGE_KEY,
      );

    if (!storedValue) {
      return {};
    }

    const parsedValue: unknown =
      JSON.parse(storedValue);

    if (
      typeof parsedValue !== "object" ||
      parsedValue === null ||
      Array.isArray(parsedValue)
    ) {
      return {};
    }

    return parsedValue as Record<
      CustomerId,
      CustomerProfile
    >;
  } catch {
    return {};
  }
}

function saveCustomers(
  customers: Record<
    CustomerId,
    CustomerProfile
  >,
) {
  if (!isBrowser()) {
    throw new Error(
      "Customer storage is unavailable during server rendering.",
    );
  }

  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(customers),
  );
}

function broadcastCustomerUpdate(
  customer: CustomerProfile,
) {
  if (!isBrowser()) {
    return;
  }

  window.dispatchEvent(
    new CustomEvent(
      CUSTOMER_UPDATED_EVENT,
      {
        detail: customer,
      },
    ),
  );
}

function saveCustomer(
  customer: CustomerProfile,
) {
  const customers =
    readCustomers();

  customers[customer.id] =
    customer;

  saveCustomers(customers);
  broadcastCustomerUpdate(
    customer,
  );

  return customer;
}

function createIdentity(
  type: CustomerIdentityType,
  value: string,
  verified: boolean,
): CustomerIdentity {
  const now =
    new Date().toISOString();

  return {
    id:
      createId("identity"),

    type,
    value:
      value.trim(),

    normalizedValue:
      normalizeIdentityValue(
        type,
        value,
      ),

    verified,
    linkedAt:
      now,
    lastUsedAt:
      now,
  };
}

function findCustomerByIdentity(
  type: CustomerIdentityType,
  value: string,
) {
  const normalizedValue =
    normalizeIdentityValue(
      type,
      value,
    );

  return (
    Object.values(
      readCustomers(),
    ).find((customer) =>
      customer.identities.some(
        (identity) =>
          identity.type === type &&
          identity.normalizedValue ===
            normalizedValue,
      ),
    ) ?? null
  );
}

export const browserCustomerRepository = {
  async findById(
    customerId: CustomerId,
  ) {
    return (
      readCustomers()[
        customerId
      ] ?? null
    );
  },

  async findByWallet(
    walletAddress: string,
  ) {
    return findCustomerByIdentity(
      "wallet",
      walletAddress,
    );
  },

  async findByEmail(
    email: string,
  ) {
    return findCustomerByIdentity(
      "email",
      email,
    );
  },

  async findAll() {
    return Object.values(
      readCustomers(),
    ).sort((first, second) =>
      second.updatedAt.localeCompare(
        first.updatedAt,
      ),
    );
  },

  async getOrCreateByWallet(
    input: CreateWalletCustomerInput,
  ) {
    const existing =
      findCustomerByIdentity(
        "wallet",
        input.walletAddress,
      );

    const now =
      new Date().toISOString();

    if (existing) {
      return saveCustomer({
        ...existing,

        displayName:
          existing.displayName ??
          input.displayName,

        email:
          existing.email ??
          input.email,

        lastSeenAt:
          now,
        updatedAt:
          now,

        identities:
          existing.identities.map(
            (identity) =>
              identity.type ===
                "wallet" &&
              identity.normalizedValue ===
                input.walletAddress
                  .trim()
                  .toLowerCase()
                ? {
                    ...identity,
                    lastUsedAt:
                      now,
                  }
                : identity,
          ),
      });
    }

    const walletIdentity =
      createIdentity(
        "wallet",
        input.walletAddress,
        true,
      );

    const customer: CustomerProfile = {
      id:
        createId("customer"),

      displayName:
        input.displayName?.trim() ||
        undefined,

      email:
        input.email?.trim() ||
        undefined,

      identities: [
        walletIdentity,
      ],

      addresses: [],

      preferences: {
        preferredCurrency:
          "USDC",

        emailNotifications:
          true,

        orderNotifications:
          true,

        rewardsNotifications:
          true,
      },

      createdAt:
        now,
      updatedAt:
        now,
      lastSeenAt:
        now,
    };

    return saveCustomer(
      customer,
    );
  },

  async updateProfile(
    input: UpdateCustomerProfileInput,
  ) {
    const customer =
      readCustomers()[
        input.customerId
      ];

    if (!customer) {
      throw new Error(
        "Customer profile not found.",
      );
    }

    const now =
      new Date().toISOString();

    return saveCustomer({
      ...customer,

      displayName:
        input.displayName?.trim() ||
        undefined,

      email:
        input.email?.trim() ||
        undefined,

      phone:
        input.phone?.trim() ||
        undefined,

      avatarUrl:
        input.avatarUrl?.trim() ||
        undefined,

      bio:
        input.bio?.trim() ||
        undefined,

      country:
        input.country?.trim() ||
        undefined,

      timezone:
        input.timezone?.trim() ||
        undefined,

      preferences: {
        ...customer.preferences,
        ...input.preferences,
      },

      updatedAt:
        now,
      lastSeenAt:
        now,
    });
  },

  async linkIdentity(
    input: LinkCustomerIdentityInput,
  ) {
    const customers =
      readCustomers();

    const customer =
      customers[
        input.customerId
      ];

    if (!customer) {
      throw new Error(
        "Customer profile not found.",
      );
    }

    const normalizedValue =
      normalizeIdentityValue(
        input.type,
        input.value,
      );

    const identityOwner =
      Object.values(
        customers,
      ).find(
        (candidate) =>
          candidate.id !==
            customer.id &&
          candidate.identities.some(
            (identity) =>
              identity.type ===
                input.type &&
              identity.normalizedValue ===
                normalizedValue,
          ),
      );

    if (identityOwner) {
      throw new Error(
        "This identity is already linked to another TrustVault customer.",
      );
    }

    const existingIdentity =
      customer.identities.find(
        (identity) =>
          identity.type ===
            input.type &&
          identity.normalizedValue ===
            normalizedValue,
      );

    const now =
      new Date().toISOString();

    const identities =
      existingIdentity
        ? customer.identities.map(
            (identity) =>
              identity.id ===
              existingIdentity.id
                ? {
                    ...identity,

                    verified:
                      input.verified ??
                      identity.verified,

                    lastUsedAt:
                      now,
                  }
                : identity,
          )
        : [
            ...customer.identities,

            createIdentity(
              input.type,
              input.value,
              input.verified ??
                false,
            ),
          ];

    return saveCustomer({
      ...customer,
      identities,
      updatedAt:
        now,
      lastSeenAt:
        now,
    });
  },

  async remove(
    customerId: CustomerId,
  ) {
    const customers =
      readCustomers();

    delete customers[
      customerId
    ];

    saveCustomers(customers);
  },

  async clear() {
    if (!isBrowser()) {
      throw new Error(
        "Customer storage is unavailable during server rendering.",
      );
    }

    window.localStorage.removeItem(
      STORAGE_KEY,
    );
  },
};

export function subscribeToCustomerUpdates(
  listener: (
    customer: CustomerProfile,
  ) => void,
) {
  if (!isBrowser()) {
    return () => {};
  }

  const handleUpdate = (
    event: Event,
  ) => {
    listener(
      (
        event as CustomEvent<
          CustomerProfile
        >
      ).detail,
    );
  };

  window.addEventListener(
    CUSTOMER_UPDATED_EVENT,
    handleUpdate,
  );

  return () => {
    window.removeEventListener(
      CUSTOMER_UPDATED_EVENT,
      handleUpdate,
    );
  };
}
