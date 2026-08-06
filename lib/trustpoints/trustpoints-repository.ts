import type {
  AwardMarketplaceTrustPointsInput,
  TrustPointsBalance,
  TrustPointsEntry,
} from "@/lib/trustpoints/trustpoints-types";

export const TRUSTPOINTS_UPDATED_EVENT =
  "trustvault:trustpoints-updated";

const STORAGE_KEY =
  "trustvault.trustpoints.v1";

function isBrowser() {
  return typeof window !== "undefined";
}

function createEntryId() {
  return `trustpoints-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

function readEntries():
  TrustPointsEntry[] {
  if (!isBrowser()) {
    return [];
  }

  try {
    const storedValue =
      window.localStorage.getItem(
        STORAGE_KEY,
      );

    if (!storedValue) {
      return [];
    }

    const parsedValue: unknown =
      JSON.parse(storedValue);

    return Array.isArray(
      parsedValue,
    )
      ? parsedValue as TrustPointsEntry[]
      : [];
  } catch {
    return [];
  }
}

function writeEntries(
  entries: TrustPointsEntry[],
) {
  if (!isBrowser()) {
    throw new Error(
      "TrustPoints storage is unavailable during server rendering.",
    );
  }

  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(entries),
  );

  window.dispatchEvent(
    new CustomEvent(
      TRUSTPOINTS_UPDATED_EVENT,
    ),
  );
}

function calculateBalance(
  customerId: string,
): TrustPointsBalance {
  const customerEntries =
    readEntries().filter(
      (entry) =>
        entry.customerId ===
        customerId,
    );

  const confirmed =
    customerEntries
      .filter(
        (entry) =>
          entry.status ===
          "confirmed",
      )
      .reduce(
        (total, entry) =>
          total +
          entry.points,
        0,
      );

  const pending =
    customerEntries
      .filter(
        (entry) =>
          entry.status ===
          "pending",
      )
      .reduce(
        (total, entry) =>
          total +
          entry.points,
        0,
      );

  const lifetimeEarned =
    customerEntries
      .filter(
        (entry) =>
          entry.status ===
            "confirmed" &&
          entry.points > 0,
      )
      .reduce(
        (total, entry) =>
          total +
          entry.points,
        0,
      );

  const lifetimeRedeemed =
    Math.abs(
      customerEntries
        .filter(
          (entry) =>
            entry.status ===
              "confirmed" &&
            entry.points < 0,
        )
        .reduce(
          (total, entry) =>
            total +
            entry.points,
          0,
        ),
    );

  return {
    customerId,

    confirmed,
    pending,
    lifetimeEarned,
    lifetimeRedeemed,

    updatedAt:
      new Date().toISOString(),
  };
}

export const browserTrustPointsRepository = {
  async findAllForCustomer(
    customerId: string,
  ) {
    return readEntries()
      .filter(
        (entry) =>
          entry.customerId ===
          customerId,
      )
      .sort((first, second) =>
        second.createdAt.localeCompare(
          first.createdAt,
        ),
      );
  },

  async findBySourceKey(
    sourceKey: string,
  ) {
    return (
      readEntries().find(
        (entry) =>
          entry.sourceKey ===
          sourceKey,
      ) ?? null
    );
  },

  async getBalance(
    customerId: string,
  ) {
    return calculateBalance(
      customerId,
    );
  },

  async awardMarketplacePurchase(
    input:
      AwardMarketplaceTrustPointsInput,
  ) {
    const sourceKey =
      `marketplace-order:${input.orderId}:confirmed`;

    const existing =
      readEntries().find(
        (entry) =>
          entry.sourceKey ===
          sourceKey,
      );

    if (existing) {
      return {
        entry:
          existing,

        balance:
          calculateBalance(
            input.customerId,
          ),

        created:
          false,
      };
    }

    const amount =
      Number(
        input.amountUsdc,
      );

    if (
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      throw new Error(
        "A valid Marketplace purchase amount is required to award TrustPoints.",
      );
    }

    const points =
      Math.floor(amount);

    const now =
      new Date().toISOString();

    const entry: TrustPointsEntry = {
      id:
        createEntryId(),

      customerId:
        input.customerId,

      walletAddress:
        input.walletAddress,

      type:
        "marketplace-purchase",

      status:
        "confirmed",

      points,

      reason:
        `Confirmed Marketplace purchase ${input.orderNumber}`,

      sourceKey,

      orderId:
        input.orderId,

      orderNumber:
        input.orderNumber,

      transactionHash:
        input.transactionHash,

      createdAt:
        now,

      confirmedAt:
        now,

      metadata: {
        amountUsdc:
          input.amountUsdc,

        rewardRate:
          "1 point per completed USDC",
      },
    };

    const entries = [
      ...readEntries(),
      entry,
    ];

    writeEntries(
      entries,
    );

    return {
      entry,

      balance:
        calculateBalance(
          input.customerId,
        ),

      created:
        true,
    };
  },

  async clear() {
    if (!isBrowser()) {
      throw new Error(
        "TrustPoints storage is unavailable during server rendering.",
      );
    }

    window.localStorage.removeItem(
      STORAGE_KEY,
    );

    window.dispatchEvent(
      new CustomEvent(
        TRUSTPOINTS_UPDATED_EVENT,
      ),
    );
  },
};

export function subscribeToTrustPointsUpdates(
  listener: () => void,
) {
  if (!isBrowser()) {
    return () => {};
  }

  window.addEventListener(
    TRUSTPOINTS_UPDATED_EVENT,
    listener,
  );

  return () => {
    window.removeEventListener(
      TRUSTPOINTS_UPDATED_EVENT,
      listener,
    );
  };
}
