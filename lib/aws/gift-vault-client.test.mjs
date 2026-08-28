import assert from "node:assert/strict";
import test, { afterEach } from "node:test";

process.env.NEXT_PUBLIC_TRUSTVAULT_API_BASE_URL =
  "https://api.trustvault.test/";

const {
  fetchGiftVault,
  persistGiftVault,
} = await import("./gift-vault-client.ts");

const originalFetch =
  globalThis.fetch;

afterEach(() => {
  globalThis.fetch =
    originalFetch;
});

const confirmedGift = {
  giftId: "127",
  txHash:
    "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  explorerUrl:
    "https://testnet.arcscan.app/tx/0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  amount: "12.5",
  amountBaseUnits: "12500000",
  unlockTimestamp: 1_800_000_000,
  contractAddress:
    "0x98a85fc032a985e3a267573cce57378c464ffb86",
  blockNumber: "9001",
};

const persistedGift = {
  id: "127",
  senderAddress:
    "0x1111111111111111111111111111111111111111",
  recipientAddress:
    "0x2222222222222222222222222222222222222222",
  amountBaseUnits: "12500000",
  unlockTimestamp: "1800000000",
  transactionHash:
    "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  message: "Happy birthday. Enjoy your Gift Vault.",
  createdAt: "2026-08-22T02:00:00.000Z",
  updatedAt: "2026-08-22T02:00:00.000Z",
};

function jsonResponse(
  body,
  {
    status = 200,
  } = {},
) {
  return new Response(
    JSON.stringify(body),
    {
      status,
      headers: {
        "content-type":
          "application/json",
      },
    },
  );
}

test(
  "persists confirmed Gift Vault metadata with authenticated credentials",
  async () => {
    let requestUrl;
    let requestOptions;

    globalThis.fetch =
      async (url, options) => {
        requestUrl = String(url);
        requestOptions = options;

        return jsonResponse(
          {
            giftVault:
              persistedGift,
          },
          {
            status: 201,
          },
        );
      };

    const result =
      await persistGiftVault(
        confirmedGift,
        {
          recipientAddress:
            persistedGift.recipientAddress,
          message:
            persistedGift.message,
        },
      );

    assert.equal(
      result.ok,
      true,
    );

    if (!result.ok) {
      assert.fail(
        "Expected persistence success.",
      );
    }

    assert.deepEqual(
      result.gift,
      persistedGift,
    );

    assert.equal(
      requestUrl,
      "https://api.trustvault.test/gift-vault/gifts/127",
    );

    assert.equal(
      requestOptions.method,
      "PUT",
    );

    assert.equal(
      requestOptions.credentials,
      "include",
    );

    const body =
      JSON.parse(
        requestOptions.body,
      );

    assert.deepEqual(
      body,
      {
        id: "127",
        recipientAddress:
          persistedGift.recipientAddress,
        amountBaseUnits:
          "12500000",
        unlockTimestamp:
          "1800000000",
        transactionHash:
          confirmedGift.txHash,
        message:
          persistedGift.message,
      },
    );
  },
);

test(
  "never sends browser supplied sender or customer identity",
  async () => {
    let requestBody;

    globalThis.fetch =
      async (_url, options) => {
        requestBody =
          JSON.parse(
            options.body,
          );

        return jsonResponse(
          {
            giftVault:
              persistedGift,
          },
          {
            status: 201,
          },
        );
      };

    const result =
      await persistGiftVault(
        confirmedGift,
        {
          recipientAddress:
            persistedGift.recipientAddress,
          message: "Private note",
        },
      );

    assert.equal(
      result.ok,
      true,
    );

    assert.equal(
      Object.hasOwn(
        requestBody,
        "senderAddress",
      ),
      false,
    );

    assert.equal(
      Object.hasOwn(
        requestBody,
        "customerId",
      ),
      false,
    );

    assert.equal(
      Object.hasOwn(
        requestBody,
        "walletAddress",
      ),
      false,
    );

    assert.equal(
      Object.hasOwn(
        requestBody,
        "signature",
      ),
      false,
    );

    assert.equal(
      Object.hasOwn(
        requestBody,
        "privateKey",
      ),
      false,
    );
  },
);

test(
  "retrieves private Gift Vault metadata with authenticated credentials",
  async () => {
    let requestUrl;
    let requestOptions;

    globalThis.fetch =
      async (url, options) => {
        requestUrl =
          String(url);

        requestOptions =
          options;

        return jsonResponse(
          {
            giftVault:
              persistedGift,
          },
        );
      };

    const result =
      await fetchGiftVault(
        "127",
      );

    assert.equal(
      result.ok,
      true,
    );

    if (!result.ok) {
      assert.fail(
        "Expected retrieval success.",
      );
    }

    assert.deepEqual(
      result.gift,
      persistedGift,
    );

    assert.equal(
      requestUrl,
      "https://api.trustvault.test/gift-vault/gifts/127",
    );

    assert.equal(
      requestOptions.method,
      "GET",
    );

    assert.equal(
      requestOptions.credentials,
      "include",
    );
  },
);

test(
  "preserves authenticated session failures from the backend",
  async () => {
    globalThis.fetch =
      async () =>
        jsonResponse(
          {
            error: {
              code:
                "SESSION_MISSING",
              message:
                "An authenticated session is required.",
            },
          },
          {
            status: 401,
          },
        );

    const result =
      await fetchGiftVault(
        "127",
      );

    assert.deepEqual(
      result,
      {
        ok: false,
        status: 401,
        code:
          "SESSION_MISSING",
        message:
          "An authenticated session is required.",
      },
    );
  },
);

test(
  "preserves Gift Vault validation errors",
  async () => {
    globalThis.fetch =
      async () =>
        jsonResponse(
          {
            error: {
              code:
                "GIFT_VAULT_MESSAGE_TOO_LONG",
              message:
                "Gift Vault message cannot exceed 500 words.",
            },
          },
          {
            status: 400,
          },
        );

    const result =
      await persistGiftVault(
        confirmedGift,
        {
          recipientAddress:
            persistedGift.recipientAddress,
          message:
            "invalid test message",
        },
      );

    assert.deepEqual(
      result,
      {
        ok: false,
        status: 400,
        code:
          "GIFT_VAULT_MESSAGE_TOO_LONG",
        message:
          "Gift Vault message cannot exceed 500 words.",
      },
    );
  },
);

test(
  "rejects malformed successful persistence responses",
  async () => {
    globalThis.fetch =
      async () =>
        jsonResponse(
          {
            giftVault: {
              id: "127",
            },
          },
          {
            status: 201,
          },
        );

    const result =
      await persistGiftVault(
        confirmedGift,
        {
          recipientAddress:
            persistedGift.recipientAddress,
          message:
            persistedGift.message,
        },
      );

    assert.deepEqual(
      result,
      {
        ok: false,
        status: 201,
        code:
          "INVALID_GIFT_VAULT_RESPONSE",
        message:
          "TrustVault received an invalid Gift Vault persistence response.",
      },
    );
  },
);

test(
  "returns a safe failure when the persistence service is unreachable",
  async () => {
    globalThis.fetch =
      async () => {
        throw new Error(
          "network unavailable",
        );
      };

    const result =
      await persistGiftVault(
        confirmedGift,
        {
          recipientAddress:
            persistedGift.recipientAddress,
          message:
            persistedGift.message,
        },
      );

    assert.deepEqual(
      result,
      {
        ok: false,
        status: null,
        code:
          "GIFT_VAULT_NETWORK_ERROR",
        message:
          "TrustVault could not reach the Gift Vault persistence service.",
      },
    );
  },
);
