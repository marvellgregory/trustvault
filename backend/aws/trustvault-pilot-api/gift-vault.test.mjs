import assert from "node:assert/strict";
import {
  createRequire,
} from "node:module";
import test from "node:test";

const require =
  createRequire(
    import.meta.url,
  );

const {
  GiftVaultError,
  countWords,
  getGiftVault,
  saveGiftVault,
  validateGiftVaultForPersistence,
} =
  require("./gift-vault.cjs");

const CUSTOMER_ID =
  "tvc_11111111111111111111111111111111";

const SENDER =
  "0x1111111111111111111111111111111111111111";

const RECIPIENT =
  "0x2222222222222222222222222222222222222222";

const STRANGER =
  "0x3333333333333333333333333333333333333333";

const TX_HASH =
  `0x${"a".repeat(64)}`;

const NOW =
  new Date(
    "2026-08-22T01:45:00.000Z",
  );

const senderSession = {
  customerId:
    CUSTOMER_ID,

  walletAddress:
    SENDER,

  chainId:
    5_042_002,
};

const recipientSession = {
  customerId:
    "tvc_22222222222222222222222222222222",

  walletAddress:
    RECIPIENT,

  chainId:
    5_042_002,
};

function validGift() {
  return {
    id: "123",
    recipientAddress:
      RECIPIENT,

    amountBaseUnits:
      "12500000",

    unlockTimestamp:
      "1787625000",

    transactionHash:
      TX_HASH,

    message:
      "Happy birthday. This gift will unlock when the time arrives.",
  };
}

function storedGiftItem(
  gift = {
    ...validGift(),

    senderAddress:
      SENDER,

    createdAt:
      NOW.toISOString(),

    updatedAt:
      NOW.toISOString(),
  },
) {
  return {
    PK: {
      S:
        `GIFT_VAULT#${gift.id}`,
    },

    SK: {
      S: "METADATA",
    },

    entityType: {
      S: "GIFT_VAULT",
    },

    customerId: {
      S: CUSTOMER_ID,
    },

    giftId: {
      S: gift.id,
    },

    senderAddress: {
      S:
        gift.senderAddress,
    },

    recipientAddress: {
      S:
        gift.recipientAddress,
    },

    giftJson: {
      S:
        JSON.stringify(gift),
    },
  };
}

test(
  "Gift Vault ownership is derived from authenticated session",
  () => {
    const result =
      validateGiftVaultForPersistence(
        senderSession,
        validGift(),
      );

    assert.equal(
      result.customerId,
      CUSTOMER_ID,
    );

    assert.equal(
      result.gift.senderAddress,
      SENDER,
    );

    assert.equal(
      result.gift.recipientAddress,
      RECIPIENT,
    );
  },
);

test(
  "Gift Vault rejects unauthenticated persistence",
  () => {
    assert.throws(
      () =>
        validateGiftVaultForPersistence(
          {},
          validGift(),
        ),

      (error) =>
        error instanceof
          GiftVaultError &&
        error.statusCode ===
          401 &&
        error.code ===
          "GIFT_VAULT_AUTHENTICATION_REQUIRED",
    );
  },
);

test(
  "Gift Vault rejects browser supplied ownership fields",
  () => {
    const input = {
      ...validGift(),

      customerId:
        "tvc_attacker",

      senderAddress:
        STRANGER,
    };

    assert.throws(
      () =>
        validateGiftVaultForPersistence(
          senderSession,
          input,
        ),

      (error) =>
        error instanceof
          GiftVaultError &&
        error.statusCode ===
          400 &&
        error.code ===
          "INVALID_GIFT_VAULT",
    );
  },
);

test(
  "Gift Vault message accepts 500 words and rejects 501",
  () => {
    assert.equal(
      countWords(
        Array(500)
          .fill("gift")
          .join(" "),
      ),
      500,
    );

    validateGiftVaultForPersistence(
      senderSession,
      {
        ...validGift(),

        message:
          Array(500)
            .fill("gift")
            .join(" "),
      },
    );

    assert.throws(
      () =>
        validateGiftVaultForPersistence(
          senderSession,
          {
            ...validGift(),

            message:
              Array(501)
                .fill("gift")
                .join(" "),
          },
        ),

      (error) =>
        error instanceof
          GiftVaultError &&
        error.code ===
          "GIFT_VAULT_MESSAGE_TOO_LONG",
    );
  },
);

test(
  "Gift Vault rejects invalid onchain identifiers and transaction data",
  () => {
    for (const override of [
      {
        id: "0",
      },
      {
        recipientAddress:
          "not-a-wallet",
      },
      {
        amountBaseUnits:
          "0",
      },
      {
        unlockTimestamp:
          "-1",
      },
      {
        transactionHash:
          "0x1234",
      },
    ]) {
      assert.throws(
        () =>
          validateGiftVaultForPersistence(
            senderSession,
            {
              ...validGift(),
              ...override,
            },
          ),

        (error) =>
          error instanceof
            GiftVaultError &&
          error.statusCode ===
            400,
      );
    }
  },
);

test(
  "authenticated sender persists immutable Gift Vault metadata",
  async () => {
    const writes = [];

    const saved =
      await saveGiftVault(
        senderSession,
        validGift(),
        {
          now: () =>
            NOW,

          getItem:
            async () => ({}),

          putItem:
            async (input) => {
              writes.push(
                input,
              );

              return {};
            },
        },
      );

    assert.equal(
      writes.length,
      1,
    );

    assert.equal(
      writes[0].TableName,
      "TrustVaultPilot",
    );

    assert.equal(
      writes[0].Item.PK.S,
      "GIFT_VAULT#123",
    );

    assert.equal(
      writes[0].Item.SK.S,
      "METADATA",
    );

    assert.equal(
      writes[0]
        .Item
        .senderAddress
        .S,
      SENDER,
    );

    assert.equal(
      saved.message,
      validGift().message,
    );

    assert.equal(
      saved.createdAt,
      NOW.toISOString(),
    );
  },
);

test(
  "repeating identical Gift Vault persistence is idempotent",
  async () => {
    const existing = {
      ...validGift(),

      senderAddress:
        SENDER,

      createdAt:
        NOW.toISOString(),

      updatedAt:
        NOW.toISOString(),
  };

    let writes = 0;

    const result =
      await saveGiftVault(
        senderSession,
        validGift(),
        {
          getItem:
            async () => ({
              Item:
                storedGiftItem(
                  existing,
                ),
            }),

          putItem:
            async () => {
              writes += 1;
              return {};
            },
        },
      );

    assert.equal(
      writes,
      0,
    );

    assert.equal(
      result.id,
      "123",
    );
  },
);

test(
  "sender and recipient can read private Gift Vault metadata while stranger receives not found",
  async () => {
    const gift = {
      ...validGift(),

      senderAddress:
        SENDER,

      createdAt:
        NOW.toISOString(),

      updatedAt:
        NOW.toISOString(),
    };

    const dependency = {
      getItem:
        async (input) => {
          assert.equal(
            input.Key.PK.S,
            "GIFT_VAULT#123",
          );

          assert.equal(
            input.Key.SK.S,
            "METADATA",
          );

          return {
            Item:
              storedGiftItem(
                gift,
              ),
          };
        },
    };

    const senderRead =
      await getGiftVault(
        senderSession,
        "123",
        dependency,
      );

    assert.equal(
      senderRead.message,
      gift.message,
    );

    const recipientRead =
      await getGiftVault(
        recipientSession,
        "123",
        dependency,
      );

    assert.equal(
      recipientRead.message,
      gift.message,
    );

    await assert.rejects(
      () =>
        getGiftVault(
          {
            customerId:
              "tvc_33333333333333333333333333333333",

            walletAddress:
              STRANGER,

            chainId:
              5_042_002,
          },

          "123",
          dependency,
        ),

      (error) =>
        error instanceof
          GiftVaultError &&
        error.statusCode ===
          404 &&
        error.code ===
          "GIFT_VAULT_NOT_FOUND",
    );
  },
);

console.log(
  "Package 7A.1 Gift Vault private metadata tests loaded.",
);
