import assert from "node:assert/strict";
import {
  readFile,
} from "node:fs/promises";
import test from "node:test";

import {
  ATLAS_INFRASTRUCTURE_CIRCLE_STATES,
  ATLAS_INFRASTRUCTURE_NETWORK_STATES,
  ATLAS_INFRASTRUCTURE_SNAPSHOT_VERSION,
  ATLAS_INFRASTRUCTURE_TRANSACTION_STATES,
  ATLAS_INFRASTRUCTURE_WALLET_STATES,
  createAtlasInfrastructureSnapshot,
} from "./atlas-infrastructure-contract.ts";

function createInput() {
  return {
    wallet: {
      state: "CONNECTED_VERIFIED",
      account:
        "0x1111111111111111111111111111111111111111",
      providerIdentityKey:
        "provider-1",
    },
    network: {
      state: "ARC_READY",
      chainId: 5042002,
      expectedChainId: 5042002,
    },
    circle: {
      state: "READY",
      exactProviderVerified: true,
      providerIdentityKey:
        "provider-1",
      bindingGeneration:
        "generation-1",
    },
    transaction: {
      state: "TRANSACTION_READY",
      qualificationGeneration:
        "qualification-1",
      reasons: [],
    },
    observedAt:
      "2026-08-31T00:00:00.000Z",
  };
}

test("5K.1A defines versioned read-only infrastructure evidence", () => {
  const snapshot =
    createAtlasInfrastructureSnapshot(
      createInput(),
    );

  assert.equal(
    snapshot.version,
    ATLAS_INFRASTRUCTURE_SNAPSHOT_VERSION,
  );

  assert.equal(
    snapshot.authority,
    "READ_ONLY_INFRASTRUCTURE_EVIDENCE",
  );
});

test("5K.1A exposes the complete wallet state surface", () => {
  assert.deepEqual(
    [...ATLAS_INFRASTRUCTURE_WALLET_STATES],
    [
      "DISCONNECTED",
      "CONNECTED_UNVERIFIED",
      "CONNECTED_VERIFIED",
      "INVALIDATED",
    ],
  );
});

test("5K.1A exposes the complete network state surface", () => {
  assert.deepEqual(
    [...ATLAS_INFRASTRUCTURE_NETWORK_STATES],
    [
      "UNKNOWN",
      "ARC_READY",
      "WRONG_NETWORK",
    ],
  );
});

test("5K.1A exposes the complete Circle state surface", () => {
  assert.deepEqual(
    [...ATLAS_INFRASTRUCTURE_CIRCLE_STATES],
    [
      "UNBOUND",
      "READY",
      "INVALIDATED",
    ],
  );
});

test("5K.1A exposes the complete transaction readiness surface", () => {
  assert.deepEqual(
    [...ATLAS_INFRASTRUCTURE_TRANSACTION_STATES],
    [
      "UNKNOWN",
      "QUALIFICATION_PENDING",
      "TRANSACTION_READY",
      "TEST_REQUIRED",
      "INCOMPATIBLE",
      "INVALIDATED",
    ],
  );
});

test("5K.1A preserves sanitized infrastructure evidence", () => {
  const snapshot =
    createAtlasInfrastructureSnapshot(
      createInput(),
    );

  assert.equal(
    snapshot.wallet.state,
    "CONNECTED_VERIFIED",
  );

  assert.equal(
    snapshot.network.state,
    "ARC_READY",
  );

  assert.equal(
    snapshot.circle.state,
    "READY",
  );

  assert.equal(
    snapshot.transaction.state,
    "TRANSACTION_READY",
  );
});

test("5K.1A snapshot is deeply immutable across infrastructure sections", () => {
  const snapshot =
    createAtlasInfrastructureSnapshot(
      createInput(),
    );

  assert.equal(
    Object.isFrozen(snapshot),
    true,
  );

  assert.equal(
    Object.isFrozen(snapshot.wallet),
    true,
  );

  assert.equal(
    Object.isFrozen(snapshot.network),
    true,
  );

  assert.equal(
    Object.isFrozen(snapshot.circle),
    true,
  );

  assert.equal(
    Object.isFrozen(snapshot.transaction),
    true,
  );

  assert.equal(
    Object.isFrozen(
      snapshot.transaction.reasons,
    ),
    true,
  );
});

test("5K.1A snapshot clones transaction reasons instead of retaining caller array authority", () => {
  const reasons = [
    "Qualification pending.",
  ];

  const input =
    createInput();

  input.transaction.reasons =
    reasons;

  const snapshot =
    createAtlasInfrastructureSnapshot(
      input,
    );

  reasons.push(
    "Caller mutation.",
  );

  assert.deepEqual(
    snapshot.transaction.reasons,
    [
      "Qualification pending.",
    ],
  );
});

test("5K.1A infrastructure snapshot exposes no provider signer adapter wallet client or callback", () => {
  const snapshot =
    createAtlasInfrastructureSnapshot(
      createInput(),
    );

  const forbiddenKeys =
    new Set([
      "provider",
      "signer",
      "adapter",
      "walletClient",
      "revalidate",
      "send",
      "execute",
      "sign",
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
        forbiddenKeys.has(key),
        false,
        `Infrastructure snapshot exposes forbidden key ${key}`,
      );

      assert.notEqual(
        typeof nested,
        "function",
        `Infrastructure snapshot exposes callback ${key}`,
      );

      inspect(
        nested,
        seen,
      );
    }
  }

  inspect(snapshot);
});

test("5K.1A production contract imports no Circle App Kit Wagmi Viem or wallet runtime", async () => {
  const source =
    await readFile(
      new URL(
        "./atlas-infrastructure-contract.ts",
        import.meta.url,
      ),
      "utf8",
    );

  const forbiddenImports = [
    "@circle-fin",
    "app-kit",
    "wagmi",
    "viem",
    "@/lib/wallet",
    "@/lib/app-kit",
  ];

  for (
    const forbidden of
      forbiddenImports
  ) {
    assert.equal(
      source.includes(forbidden),
      false,
      `Infrastructure contract contains forbidden runtime dependency ${forbidden}`,
    );
  }
});

test("5K.1A read-only evidence cannot claim external wallet execution authority", () => {
  const snapshot =
    createAtlasInfrastructureSnapshot(
      createInput(),
    );

  assert.notEqual(
    snapshot.authority,
    "EXTERNAL_USER_WALLET",
  );

  assert.notEqual(
    snapshot.authority,
    "ATLAS",
  );
});