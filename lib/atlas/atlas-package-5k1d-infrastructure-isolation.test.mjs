import assert from "node:assert/strict";
import {
  readFile,
} from "node:fs/promises";
import test from "node:test";

import {
  createAtlasInfrastructureSnapshot,
} from "./atlas-infrastructure-contract.ts";

import {
  diagnoseAtlasInfrastructure,
} from "./atlas-infrastructure-diagnostics.ts";

const ADDRESS =
  "0x1111111111111111111111111111111111111111";

function baseInput() {
  return {
    wallet: {
      state:
        "CONNECTED_VERIFIED",
      account:
        ADDRESS,
      providerIdentityKey:
        "provider-1",
    },

    network: {
      state:
        "ARC_READY",
      chainId:
        5042002,
      expectedChainId:
        5042002,
    },

    circle: {
      state:
        "READY",
      exactProviderVerified:
        true,
      providerIdentityKey:
        "provider-1",
      bindingGeneration:
        "binding-1",
    },

    transaction: {
      state:
        "TRANSACTION_READY",
      qualificationGeneration:
        "qualification-1",
      reasons:
        [],
    },

    observedAt:
      "2026-08-31T00:00:00.000Z",
  };
}

test("5K.1D hostile wallet runtime fields are discarded from infrastructure evidence", () => {
  const input =
    baseInput();

  input.wallet.provider =
    {
      request() {
        throw new Error(
          "must never be reachable",
        );
      },
    };

  input.wallet.walletClient =
    {
      sendTransaction() {
        throw new Error(
          "must never be reachable",
        );
      },
    };

  input.wallet.signer =
    {
      sign() {
        throw new Error(
          "must never be reachable",
        );
      },
    };

  const snapshot =
    createAtlasInfrastructureSnapshot(
      input,
    );

  assert.equal(
    "provider" in snapshot.wallet,
    false,
  );

  assert.equal(
    "walletClient" in snapshot.wallet,
    false,
  );

  assert.equal(
    "signer" in snapshot.wallet,
    false,
  );
});

test("5K.1D hostile Circle adapter fields are discarded from infrastructure evidence", () => {
  const input =
    baseInput();

  input.circle.adapter =
    {
      send() {},
    };

  input.circle.revalidate =
    async () => true;

  input.circle.provider =
    {};

  const snapshot =
    createAtlasInfrastructureSnapshot(
      input,
    );

  assert.equal(
    "adapter" in snapshot.circle,
    false,
  );

  assert.equal(
    "revalidate" in snapshot.circle,
    false,
  );

  assert.equal(
    "provider" in snapshot.circle,
    false,
  );
});

test("5K.1D hostile transaction execution fields are discarded from infrastructure evidence", () => {
  const input =
    baseInput();

  input.transaction.assertCurrent =
    async () => input.transaction;

  input.transaction.execute =
    async () => "executed";

  input.transaction.broadcast =
    async () => "broadcast";

  const snapshot =
    createAtlasInfrastructureSnapshot(
      input,
    );

  assert.equal(
    "assertCurrent" in
      snapshot.transaction,
    false,
  );

  assert.equal(
    "execute" in
      snapshot.transaction,
    false,
  );

  assert.equal(
    "broadcast" in
      snapshot.transaction,
    false,
  );
});

test("5K.1D secret-bearing hostile fields are discarded", () => {
  const input =
    baseInput();

  input.wallet.privateKey =
    "private";

  input.wallet.seedPhrase =
    "seed";

  input.wallet.mnemonic =
    "mnemonic";

  const snapshot =
    createAtlasInfrastructureSnapshot(
      input,
    );

  assert.equal(
    "privateKey" in snapshot.wallet,
    false,
  );

  assert.equal(
    "seedPhrase" in snapshot.wallet,
    false,
  );

  assert.equal(
    "mnemonic" in snapshot.wallet,
    false,
  );
});

test("5K.1D caller mutation cannot add authority after snapshot creation", () => {
  const input =
    baseInput();

  const snapshot =
    createAtlasInfrastructureSnapshot(
      input,
    );

  input.wallet.providerIdentityKey =
    "attacker";

  input.circle.exactProviderVerified =
    false;

  input.transaction.state =
    "INVALIDATED";

  assert.equal(
    snapshot.wallet.providerIdentityKey,
    "provider-1",
  );

  assert.equal(
    snapshot.circle.exactProviderVerified,
    true,
  );

  assert.equal(
    snapshot.transaction.state,
    "TRANSACTION_READY",
  );
});

test("5K.1D diagnostic readiness never converts into wallet execution authority", () => {
  const snapshot =
    createAtlasInfrastructureSnapshot(
      baseInput(),
    );

  const result =
    diagnoseAtlasInfrastructure(
      snapshot,
    );

  assert.equal(
    result.preparation,
    "READY_FOR_PREPARATION",
  );

  assert.equal(
    result.authority,
    "READ_ONLY_INFRASTRUCTURE_DIAGNOSTICS",
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

test("5K.1D diagnostic output cannot expose injected runtime authority", () => {
  const input =
    baseInput();

  input.wallet.provider =
    {};
  input.wallet.walletClient =
    {};
  input.circle.adapter =
    {};
  input.transaction.execute =
    () => {};

  const result =
    diagnoseAtlasInfrastructure(
      createAtlasInfrastructureSnapshot(
        input,
      ),
    );

  const serialized =
    JSON.stringify(result);

  for (
    const forbidden of [
      "walletClient",
      "adapter",
      "privateKey",
      "seedPhrase",
      "mnemonic",
      "assertCurrent",
      "broadcast",
    ]
  ) {
    assert.equal(
      serialized.includes(forbidden),
      false,
      `Diagnostics leaked ${forbidden}`,
    );
  }
});

test("5K.1D Atlas infrastructure production code contains no wallet execution imports", async () => {
  const files = [
    "./atlas-infrastructure-contract.ts",
    "./atlas-infrastructure-diagnostics.ts",
  ];

  const forbidden = [
    "@/lib/wallet",
    "@/lib/app-kit",
    "@/lib/infrastructure",
    "@circle-fin",
    "wagmi",
    "viem",
  ];

  for (
    const file of files
  ) {
    const source =
      await readFile(
        new URL(
          file,
          import.meta.url,
        ),
        "utf8",
      );

    for (
      const value of forbidden
    ) {
      assert.equal(
        source.includes(value),
        false,
        `${file} contains forbidden import ${value}`,
      );
    }
  }
});

test("5K.1D infrastructure bridge cannot import provider binding or execution authority", async () => {
  const source =
    await readFile(
      new URL(
        "../infrastructure/atlas-infrastructure-runtime-bridge.ts",
        import.meta.url,
      ),
      "utf8",
    );

  const forbidden = [
    "CircleProviderBinding",
    "TransactionReadinessAuthority",
    "createCircleAdapterForOperation",
    "createConnectedAppKitAdapter",
    "createTransactionReadinessAuthority",
    "assertCurrent",
    "walletClient",
    "writeContract",
    "sendTransaction",
  ];

  for (
    const value of forbidden
  ) {
    assert.equal(
      source.includes(value),
      false,
      `Bridge contains forbidden runtime authority ${value}`,
    );
  }
});

test("5K.1D infrastructure surfaces expose only read-only authority labels", () => {
  const snapshot =
    createAtlasInfrastructureSnapshot(
      baseInput(),
    );

  const diagnostics =
    diagnoseAtlasInfrastructure(
      snapshot,
    );

  assert.equal(
    snapshot.authority,
    "READ_ONLY_INFRASTRUCTURE_EVIDENCE",
  );

  assert.equal(
    diagnostics.authority,
    "READ_ONLY_INFRASTRUCTURE_DIAGNOSTICS",
  );
});

test("5K.1D infrastructure evidence contains no functions recursively", () => {
  const input =
    baseInput();

  input.wallet.callback =
    () => {};

  input.circle.callback =
    () => {};

  input.transaction.callback =
    () => {};

  const snapshot =
    createAtlasInfrastructureSnapshot(
      input,
    );

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
      const nested of
        Object.values(value)
    ) {
      assert.notEqual(
        typeof nested,
        "function",
      );

      inspect(
        nested,
        seen,
      );
    }
  }

  inspect(snapshot);
});

test("5K.1D preparation readiness cannot manufacture signing broadcast or autonomous authority", () => {
  const result =
    diagnoseAtlasInfrastructure(
      createAtlasInfrastructureSnapshot(
        baseInput(),
      ),
    );

  const forbiddenKeys =
    [
      "sign",
      "signTransaction",
      "sendTransaction",
      "writeContract",
      "broadcast",
      "execute",
      "provider",
      "walletClient",
      "signer",
    ];

  function inspect(
    value,
    seen = new Set(),
  ) {
    if (
      value === null ||
      typeof value !== "object"
    ) {
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
        forbiddenKeys.includes(key),
        false,
        `Infrastructure diagnostics expose ${key}`,
      );

      inspect(
        nested,
        seen,
      );
    }
  }

  inspect(result);
});