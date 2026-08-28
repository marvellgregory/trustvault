import assert from "node:assert/strict";
import test from "node:test";

const {
  createGiftVaultPersistenceInput,
  syncConfirmedGiftVault,
} = await import("./gift-vault-sync.ts");

const confirmed = {
  giftId: "42",
  txHash:
    "0x1111111111111111111111111111111111111111111111111111111111111111",
  explorerUrl:
    "https://testnet.arcscan.app/tx/0x1111111111111111111111111111111111111111111111111111111111111111",
  approvalTxHash:
    "0x2222222222222222222222222222222222222222222222222222222222222222",
  amount: "12.5",
  amountBaseUnits: "12500000",
  unlockTimestamp: 1_800_000_000,
  contractAddress:
    "0x3333333333333333333333333333333333333333",
  blockNumber: "12345",
};

const data = {
  recipientName: "Recipient",
  walletAddress:
    "0x4444444444444444444444444444444444444444",
  amount: "12.5",
  unlockDate: "2027-01-15",
  unlockTime: "10:30",
  timeZone: "Asia/Kolkata",
  message: "A private Gift Vault message.",
};

test(
  "builds persistence input only from recipient address and private message",
  () => {
    assert.deepEqual(
      createGiftVaultPersistenceInput(data),
      {
        recipientAddress: data.walletAddress,
        message: data.message,
      },
    );
  },
);

test(
  "persists an already confirmed Gift Vault without creating another transaction",
  async () => {
    const calls = [];

    const result =
      await syncConfirmedGiftVault(
        confirmed,
        data,
        {
          persist: async (
            receivedConfirmed,
            receivedInput,
          ) => {
            calls.push({
              confirmed: receivedConfirmed,
              input: receivedInput,
            });

            return {
              ok: true,
              gift: {
                id: confirmed.giftId,
                senderAddress:
                  "0x5555555555555555555555555555555555555555",
                recipientAddress:
                  data.walletAddress,
                amountBaseUnits:
                  confirmed.amountBaseUnits,
                unlockTimestamp:
                  String(
                    confirmed.unlockTimestamp,
                  ),
                transactionHash:
                  confirmed.txHash,
                message:
                  data.message,
                createdAt:
                  "2030-01-01T00:00:00.000Z",
                updatedAt:
                  "2030-01-01T00:00:00.000Z",
              },
            };
          },
        },
      );

    assert.equal(calls.length, 1);

    assert.equal(
      calls[0].confirmed,
      confirmed,
    );

    assert.deepEqual(
      calls[0].input,
      {
        recipientAddress:
          data.walletAddress,
        message:
          data.message,
      },
    );

    assert.equal(result.ok, true);
  },
);

test(
  "preserves persistence failure without changing confirmed transaction data",
  async () => {
    const result =
      await syncConfirmedGiftVault(
        confirmed,
        data,
        {
          persist: async () => ({
            ok: false,
            status: 503,
            code:
              "GIFT_VAULT_API_ERROR",
            message:
              "Persistence temporarily unavailable.",
          }),
        },
      );

    assert.equal(result.ok, false);

    if (result.ok) {
      throw new Error(
        "Expected persistence failure.",
      );
    }

    assert.equal(
      result.code,
      "GIFT_VAULT_API_ERROR",
    );

    assert.equal(
      confirmed.giftId,
      "42",
    );

    assert.equal(
      confirmed.txHash,
      "0x1111111111111111111111111111111111111111111111111111111111111111",
    );
  },
);
