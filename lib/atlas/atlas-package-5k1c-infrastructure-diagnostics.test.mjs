import assert from "node:assert/strict";
import {
  readFile,
} from "node:fs/promises";
import test from "node:test";

import {
  createAtlasInfrastructureSnapshot,
} from "./atlas-infrastructure-contract.ts";
import {
  ATLAS_INFRASTRUCTURE_DIAGNOSTIC_CODES,
  diagnoseAtlasInfrastructure,
} from "./atlas-infrastructure-diagnostics.ts";

function createSnapshot(
  overrides = {},
) {
  return createAtlasInfrastructureSnapshot({
    wallet: {
      state: "CONNECTED_VERIFIED",
      account:
        "0x1111111111111111111111111111111111111111",
      providerIdentityKey:
        "provider-1",
      ...(overrides.wallet ?? {}),
    },

    network: {
      state: "ARC_READY",
      chainId: 5042002,
      expectedChainId: 5042002,
      ...(overrides.network ?? {}),
    },

    circle: {
      state: "READY",
      exactProviderVerified: true,
      providerIdentityKey:
        "provider-1",
      bindingGeneration:
        "binding-1",
      ...(overrides.circle ?? {}),
    },

    transaction: {
      state: "TRANSACTION_READY",
      qualificationGeneration:
        "qualification-1",
      reasons: [],
      ...(overrides.transaction ?? {}),
    },

    observedAt:
      "2026-08-31T00:00:00.000Z",
  });
}

test("5K.1C exposes the complete diagnostic code surface", () => {
  assert.deepEqual(
    [...ATLAS_INFRASTRUCTURE_DIAGNOSTIC_CODES],
    [
      "WALLET_DISCONNECTED",
      "WALLET_UNVERIFIED",
      "WALLET_INVALIDATED",
      "NETWORK_UNKNOWN",
      "WRONG_NETWORK",
      "CIRCLE_UNBOUND",
      "CIRCLE_INVALIDATED",
      "TRANSACTION_QUALIFICATION_PENDING",
      "TRANSACTION_TEST_REQUIRED",
      "TRANSACTION_INCOMPATIBLE",
      "TRANSACTION_INVALIDATED",
      "TRANSACTION_UNKNOWN",
    ],
  );
});

test("5K.1C reports fully consistent infrastructure as ready for preparation", () => {
  const result =
    diagnoseAtlasInfrastructure(
      createSnapshot(),
    );

  assert.equal(
    result.preparation,
    "READY_FOR_PREPARATION",
  );

  assert.equal(
    result.walletReady,
    true,
  );

  assert.equal(
    result.networkReady,
    true,
  );

  assert.equal(
    result.circleReady,
    true,
  );

  assert.equal(
    result.transactionReady,
    true,
  );

  assert.deepEqual(
    result.diagnostics,
    [],
  );
});

test("5K.1C disconnected wallet blocks preparation", () => {
  const result =
    diagnoseAtlasInfrastructure(
      createSnapshot({
        wallet: {
          state: "DISCONNECTED",
        },
      }),
    );

  assert.equal(
    result.preparation,
    "NOT_READY_FOR_PREPARATION",
  );

  assert.equal(
    result.walletReady,
    false,
  );

  assert.equal(
    result.diagnostics[0]?.code,
    "WALLET_DISCONNECTED",
  );
});

test("5K.1C unverified wallet blocks preparation", () => {
  const result =
    diagnoseAtlasInfrastructure(
      createSnapshot({
        wallet: {
          state: "CONNECTED_UNVERIFIED",
        },
      }),
    );

  assert.equal(
    result.walletReady,
    false,
  );

  assert.equal(
    result.diagnostics[0]?.code,
    "WALLET_UNVERIFIED",
  );
});

test("5K.1C wrong network blocks preparation even when transaction claims ready", () => {
  const result =
    diagnoseAtlasInfrastructure(
      createSnapshot({
        network: {
          state: "WRONG_NETWORK",
          chainId: 1,
        },
      }),
    );

  assert.equal(
    result.transactionReady,
    true,
  );

  assert.equal(
    result.networkReady,
    false,
  );

  assert.equal(
    result.preparation,
    "NOT_READY_FOR_PREPARATION",
  );

  assert.equal(
    result.diagnostics.some(
      (entry) =>
        entry.code ===
        "WRONG_NETWORK",
    ),
    true,
  );
});

test("5K.1C Arc-ready label still fails closed when chain IDs disagree", () => {
  const result =
    diagnoseAtlasInfrastructure(
      createSnapshot({
        network: {
          state: "ARC_READY",
          chainId: 1,
          expectedChainId: 5042002,
        },
      }),
    );

  assert.equal(
    result.networkReady,
    false,
  );

  assert.equal(
    result.preparation,
    "NOT_READY_FOR_PREPARATION",
  );
});

test("5K.1C Circle ready label still fails closed without exact provider verification", () => {
  const result =
    diagnoseAtlasInfrastructure(
      createSnapshot({
        circle: {
          state: "READY",
          exactProviderVerified: false,
        },
      }),
    );

  assert.equal(
    result.circleReady,
    false,
  );

  assert.equal(
    result.preparation,
    "NOT_READY_FOR_PREPARATION",
  );

  assert.equal(
    result.diagnostics.some(
      (entry) =>
        entry.code ===
        "CIRCLE_INVALIDATED",
    ),
    true,
  );
});

test("5K.1C transaction qualification state returns safe prerequisite diagnostics", () => {
  const result =
    diagnoseAtlasInfrastructure(
      createSnapshot({
        transaction: {
          state:
            "QUALIFICATION_PENDING",
          reasons: [
            "Wallet identity is not verified.",
          ],
        },
      }),
    );

  assert.equal(
    result.transactionReady,
    false,
  );

  assert.equal(
    result.diagnostics.some(
      (entry) =>
        entry.code ===
        "TRANSACTION_QUALIFICATION_PENDING",
    ),
    true,
  );
});

test("5K.1C preserves trusted readiness reason as diagnostic explanation", () => {
  const result =
    diagnoseAtlasInfrastructure(
      createSnapshot({
        transaction: {
          state: "TEST_REQUIRED",
          reasons: [
            "TrustVault qualification testing is required.",
          ],
        },
      }),
    );

  const entry =
    result.diagnostics.find(
      (diagnostic) =>
        diagnostic.code ===
        "TRANSACTION_TEST_REQUIRED",
    );

  assert.equal(
    entry?.message,
    "TrustVault qualification testing is required.",
  );
});

test("5K.1C result is immutable and read-only", () => {
  const result =
    diagnoseAtlasInfrastructure(
      createSnapshot(),
    );

  assert.equal(
    Object.isFrozen(result),
    true,
  );

  assert.equal(
    Object.isFrozen(
      result.diagnostics,
    ),
    true,
  );

  assert.equal(
    result.authority,
    "READ_ONLY_INFRASTRUCTURE_DIAGNOSTICS",
  );
});

test("5K.1C ready-for-preparation never claims execution authority", () => {
  const result =
    diagnoseAtlasInfrastructure(
      createSnapshot(),
    );

  assert.equal(
    result.preparation,
    "READY_FOR_PREPARATION",
  );

  assert.notEqual(
    result.authority,
    "EXTERNAL_USER_WALLET",
  );

  assert.notEqual(
    result.authority,
    "ATLAS",
  );
});

test("5K.1C diagnostic output contains no execution runtime objects or callbacks", () => {
  const result =
    diagnoseAtlasInfrastructure(
      createSnapshot(),
    );

  const forbidden =
    new Set([
      "provider",
      "signer",
      "adapter",
      "walletClient",
      "revalidate",
      "assertCurrent",
      "execute",
      "broadcast",
      "privateKey",
      "seedPhrase",
      "mnemonic",
    ]);

  function inspect(
    value,
    seen = new Set(),
  ) {
    if (
      value === null ||
      typeof value !== "object"
    ) {
      assert.notEqual(
        typeof value,
        "function",
      );

      return;
    }

    if (seen.has(value)) {
      return;
    }

    seen.add(value);

    for (
      const [key, nested] of
        Object.entries(value)
    ) {
      assert.equal(
        forbidden.has(key),
        false,
        `Diagnostics expose forbidden key ${key}`,
      );

      assert.notEqual(
        typeof nested,
        "function",
        `Diagnostics expose callback ${key}`,
      );

      inspect(
        nested,
        seen,
      );
    }
  }

  inspect(result);
});

test("5K.1C production diagnostics depend only on the sanitized Atlas infrastructure contract", async () => {
  const source =
    await readFile(
      new URL(
        "./atlas-infrastructure-diagnostics.ts",
        import.meta.url,
      ),
      "utf8",
    );

  const forbiddenImports = [
    "@/lib/wallet",
    "@/lib/app-kit",
    "@/lib/infrastructure",
    "@circle-fin",
    "wagmi",
    "viem",
  ];

  for (
    const forbidden of
      forbiddenImports
  ) {
    assert.equal(
      source.includes(forbidden),
      false,
      `Diagnostics contain forbidden dependency ${forbidden}`,
    );
  }

  const forbiddenRuntimeSymbols = [
    "CircleProviderBinding",
    "TransactionReadinessAuthority",
    "createCircleAdapterForOperation",
    "createTransactionReadinessAuthority",
    "assertCurrent",
    "walletClient",
    "writeContract",
    "sendTransaction",
  ];

  for (
    const forbidden of
      forbiddenRuntimeSymbols
  ) {
    assert.equal(
      source.includes(forbidden),
      false,
      `Diagnostics contain forbidden runtime symbol ${forbidden}`,
    );
  }
});