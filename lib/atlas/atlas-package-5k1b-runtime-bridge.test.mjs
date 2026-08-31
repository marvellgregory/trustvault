import assert from "node:assert/strict";
import {
  readFile,
} from "node:fs/promises";
import test from "node:test";

import {
  createAtlasInfrastructureSnapshotFromTrustedEvidence,
} from "../infrastructure/atlas-infrastructure-runtime-bridge.ts";

const ACCOUNT =
  "0x1111111111111111111111111111111111111111";

function createEvidence() {
  return {
    wallet: {
      schemaVersion: 1,
      sessionId: "session-1",
      provider: {
        registryId: "provider-1",
        source: "eip6963",
        name: "Test Wallet",
      },
      providerSelection: "selected",
      address: ACCOUNT,
      connection: "connected",
      chain: {
        chainId: 5042002,
        expectedArcChainId: 5042002,
        known: true,
        arcReady: true,
      },
      capabilities: {
        canRequestAccounts: "supported",
        canSwitchChain: "supported",
        canAddChain: "supported",
        canSendTransaction: "supported",
        canWriteContract: "supported",
        circleAdapterAvailable: "supported",
        supportsArcTestnet: "supported",
        qualifiedForTrustVault: "supported",
      },
      qualification: {
        status: "QUALIFIED",
        providerIdentityKey: "provider-1",
        qualificationGeneration:
          "qualification-1",
        reasons: [],
      },
      identityVerification: {
        status: "VERIFIED",
        providerIdentityKey:
          "provider-1",
        evidence:
          "EXPLICIT_SELECTION_AND_PROVIDER_REFERENCE",
        verifiedAt:
          "2026-08-31T00:00:00.000Z",
      },
      circleEvidence: {
        status: "CIRCLE_READY",
        providerIdentityKey:
          "provider-1",
        account: ACCOUNT,
        chainId: 5042002,
        bindingGeneration:
          "binding-1",
        exactProviderVerified: true,
      },
      state:
        "TRUSTVAULT_QUALIFIED",
      createdAt:
        "2026-08-31T00:00:00.000Z",
      updatedAt:
        "2026-08-31T00:00:00.000Z",
    },

    circle: {
      status: "CIRCLE_READY",
      providerIdentityKey:
        "provider-1",
      providerName:
        "Test Wallet",
      account: ACCOUNT,
      chainId: 5042002,
      bindingGeneration:
        "binding-1",
      exactProviderVerified: true,
      boundAt:
        "2026-08-31T00:00:00.000Z",
    },

    transaction: {
      status: "TRANSACTION_READY",
      providerIdentityKey:
        "provider-1",
      account: ACCOUNT,
      chainId: 5042002,
      qualificationGeneration:
        "qualification-1",
      evaluatedAt:
        "2026-08-31T00:00:00.000Z",
      reasons: [],
    },

    observedAt:
      "2026-08-31T00:00:01.000Z",
  };
}

test("5K.1B maps consistent trusted runtime evidence into a ready Atlas snapshot", () => {
  const snapshot =
    createAtlasInfrastructureSnapshotFromTrustedEvidence(
      createEvidence(),
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

  assert.equal(
    snapshot.authority,
    "READ_ONLY_INFRASTRUCTURE_EVIDENCE",
  );
});

test("5K.1B preserves only matching verified account evidence", () => {
  const evidence =
    createEvidence();

  evidence.transaction.account =
    "0x2222222222222222222222222222222222222222";

  const snapshot =
    createAtlasInfrastructureSnapshotFromTrustedEvidence(
      evidence,
    );

  assert.equal(
    snapshot.wallet.account,
    undefined,
  );

  assert.equal(
    snapshot.transaction.state,
    "INVALIDATED",
  );
});

test("5K.1B rejects mismatched provider identity for ready evidence", () => {
  const evidence =
    createEvidence();

  evidence.transaction.providerIdentityKey =
    "provider-2";

  const snapshot =
    createAtlasInfrastructureSnapshotFromTrustedEvidence(
      evidence,
    );

  assert.equal(
    snapshot.wallet.providerIdentityKey,
    undefined,
  );

  assert.equal(
    snapshot.transaction.state,
    "INVALIDATED",
  );
});

test("5K.1B rejects unverified wallet identity for ready evidence", () => {
  const evidence =
    createEvidence();

  evidence.wallet.identityVerification = {
    status: "UNVERIFIED",
    reason: "AUTOMATIC_RECONNECT",
  };

  const snapshot =
    createAtlasInfrastructureSnapshotFromTrustedEvidence(
      evidence,
    );

  assert.equal(
    snapshot.wallet.state,
    "CONNECTED_UNVERIFIED",
  );

  assert.equal(
    snapshot.transaction.state,
    "INVALIDATED",
  );
});

test("5K.1B maps wrong Arc network without granting readiness", () => {
  const evidence =
    createEvidence();

  evidence.wallet.chain.chainId =
    1;

  evidence.wallet.chain.arcReady =
    false;

  const snapshot =
    createAtlasInfrastructureSnapshotFromTrustedEvidence(
      evidence,
    );

  assert.equal(
    snapshot.network.state,
    "WRONG_NETWORK",
  );

  assert.equal(
    snapshot.transaction.state,
    "INVALIDATED",
  );
});

test("5K.1B maps disconnected wallet without retaining ready authority", () => {
  const evidence =
    createEvidence();

  evidence.wallet.connection =
    "disconnected";

  delete evidence.wallet.address;

  const snapshot =
    createAtlasInfrastructureSnapshotFromTrustedEvidence(
      evidence,
    );

  assert.equal(
    snapshot.wallet.state,
    "DISCONNECTED",
  );

  assert.equal(
    snapshot.transaction.state,
    "INVALIDATED",
  );
});

test("5K.1B maps invalidated Circle evidence without retaining transaction readiness", () => {
  const evidence =
    createEvidence();

  evidence.circle.status =
    "CIRCLE_INVALIDATED";

  evidence.circle.exactProviderVerified =
    false;

  const snapshot =
    createAtlasInfrastructureSnapshotFromTrustedEvidence(
      evidence,
    );

  assert.equal(
    snapshot.circle.state,
    "INVALIDATED",
  );

  assert.equal(
    snapshot.transaction.state,
    "INVALIDATED",
  );
});

test("5K.1B preserves non-ready transaction states without manufacturing readiness", () => {
  const evidence =
    createEvidence();

  evidence.transaction.status =
    "TEST_REQUIRED";

  evidence.transaction.reasons = [
    "TrustVault qualification testing is required.",
  ];

  const snapshot =
    createAtlasInfrastructureSnapshotFromTrustedEvidence(
      evidence,
    );

  assert.equal(
    snapshot.transaction.state,
    "TEST_REQUIRED",
  );

  assert.deepEqual(
    snapshot.transaction.reasons,
    [
      "TrustVault qualification testing is required.",
    ],
  );
});

test("5K.1B transaction ready remains evidence and never becomes execution authority", () => {
  const snapshot =
    createAtlasInfrastructureSnapshotFromTrustedEvidence(
      createEvidence(),
    );

  assert.equal(
    snapshot.transaction.state,
    "TRANSACTION_READY",
  );

  assert.equal(
    snapshot.authority,
    "READ_ONLY_INFRASTRUCTURE_EVIDENCE",
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

test("5K.1B output contains no provider adapter signer wallet client callback or runtime authority", () => {
  const snapshot =
    createAtlasInfrastructureSnapshotFromTrustedEvidence(
      createEvidence(),
    );

  const forbidden =
    new Set([
      "provider",
      "adapter",
      "signer",
      "walletClient",
      "revalidate",
      "assertCurrent",
      "send",
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
        `Snapshot exposes forbidden key ${key}`,
      );

      assert.notEqual(
        typeof nested,
        "function",
        `Snapshot exposes callback ${key}`,
      );

      inspect(
        nested,
        seen,
      );
    }
  }

  inspect(snapshot);
});

test("5K.1B production bridge imports Circle evidence only and no provider binding or execution runtime", async () => {
  const source =
    await readFile(
      new URL(
        "../infrastructure/atlas-infrastructure-runtime-bridge.ts",
        import.meta.url,
      ),
      "utf8",
    );

  assert.equal(
    source.includes(
      "CircleProviderBinding",
    ),
    false,
  );

  assert.equal(
    source.includes(
      "TransactionReadinessAuthority",
    ),
    false,
  );

  const forbidden = [
    "@circle-fin",
    "wagmi",
    "viem",
    "browser-wallet",
    "createCircleAdapterForOperation",
    "createConnectedAppKitAdapter",
    "createTransactionReadinessAuthority",
    "assertCurrent",
  ];

  for (const value of forbidden) {
    assert.equal(
      source.includes(value),
      false,
      `Bridge contains forbidden runtime dependency ${value}`,
    );
  }
});