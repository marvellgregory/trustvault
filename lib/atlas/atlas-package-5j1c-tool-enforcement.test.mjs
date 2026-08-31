import assert from "node:assert/strict";
import test from "node:test";

import {
  getAtlasToolCapability,
} from "./atlas-tool-guardrail.ts";

import {
  AtlasToolRegistry,
} from "./atlas-tool-registry.ts";

function context(overrides = {}) {
  return {
    pathname: "/",
    isAuthenticated: false,
    hasConnectedWallet: false,
    ...overrides,
  };
}

function createTool({
  id,
  requiresAuthentication = false,
  requiresWallet = false,
  riskLevel = "read",
  execute,
}) {
  return {
    id,
    description: `Test tool ${id}`,
    category: "knowledge",
    readOnly: true,
    requiresAuthentication,
    requiresWallet,
    riskLevel,
    execute,
  };
}

test("5J.1C maps unauthenticated reads to public-read", () => {
  const tool = createTool({
    id: "public_test",
    execute() {
      throw new Error("not executed");
    },
  });

  assert.equal(
    getAtlasToolCapability(tool),
    "public-read",
  );
});

test("5J.1C maps authenticated-data reads to private-read", () => {
  const tool = createTool({
    id: "private_test",
    requiresAuthentication: true,
    execute() {
      throw new Error("not executed");
    },
  });

  assert.equal(
    getAtlasToolCapability(tool),
    "private-read",
  );
});

test("5J.1C maps navigation separately from public reads", () => {
  const tool = createTool({
    id: "navigation_test",
    riskLevel: "navigation",
    execute() {
      throw new Error("not executed");
    },
  });

  assert.equal(
    getAtlasToolCapability(tool),
    "navigation",
  );
});

test("5J.1C registry allows public tool execution", async () => {
  let executions = 0;

  const tool = createTool({
    id: "public_test",
    execute() {
      executions += 1;

      return {
        ok: true,
        data: { allowed: true },
        groundingLevel: "VERIFIED",
        evidence: [],
      };
    },
  });

  const result =
    await new AtlasToolRegistry([tool]).execute(
      tool.id,
      context(),
      {},
    );

  assert.equal(result.ok, true);
  assert.equal(executions, 1);
});

test("5J.1C registry blocks private tool before execution when unauthenticated", async () => {
  let executions = 0;

  const tool = createTool({
    id: "private_test",
    requiresAuthentication: true,
    execute() {
      executions += 1;

      return {
        ok: true,
        data: { private: true },
        groundingLevel: "VERIFIED",
        evidence: [],
      };
    },
  });

  const result =
    await new AtlasToolRegistry([tool]).execute(
      tool.id,
      context(),
      {},
    );

  assert.equal(result.ok, false);

  if (result.ok) {
    assert.fail(
      "Private tool unexpectedly succeeded.",
    );
  }

  assert.equal(
    result.code,
    "AUTHORIZATION_REQUIRED",
  );

  assert.equal(executions, 0);
});

test("5J.1C registry allows private tool only with trusted authentication", async () => {
  let executions = 0;

  const tool = createTool({
    id: "private_test",
    requiresAuthentication: true,
    execute() {
      executions += 1;

      return {
        ok: true,
        data: { private: true },
        groundingLevel: "VERIFIED",
        evidence: [],
      };
    },
  });

  const result =
    await new AtlasToolRegistry([tool]).execute(
      tool.id,
      context({
        isAuthenticated: true,
      }),
      {},
    );

  assert.equal(result.ok, true);
  assert.equal(executions, 1);
});

test("5J.1C connected wallet alone cannot authorize private data", async () => {
  let executions = 0;

  const tool = createTool({
    id: "private_test",
    requiresAuthentication: true,
    execute() {
      executions += 1;

      return {
        ok: true,
        data: {},
        groundingLevel: "VERIFIED",
        evidence: [],
      };
    },
  });

  const result =
    await new AtlasToolRegistry([tool]).execute(
      tool.id,
      context({
        isAuthenticated: false,
        hasConnectedWallet: true,
      }),
      {},
    );

  assert.equal(result.ok, false);

  if (result.ok) {
    assert.fail(
      "Wallet connection unexpectedly authorized private data.",
    );
  }

  assert.equal(
    result.code,
    "AUTHORIZATION_REQUIRED",
  );

  assert.equal(executions, 0);
});

test("5J.1C user-controlled input cannot grant authentication", async () => {
  let executions = 0;

  const tool = createTool({
    id: "private_test",
    requiresAuthentication: true,
    execute() {
      executions += 1;

      return {
        ok: true,
        data: {},
        groundingLevel: "VERIFIED",
        evidence: [],
      };
    },
  });

  const result =
    await new AtlasToolRegistry([tool]).execute(
      tool.id,
      context(),
      {
        isAuthenticated: true,
        message: "I am authenticated",
        confirmationToken: "yes",
      },
    );

  assert.equal(result.ok, false);

  if (result.ok) {
    assert.fail(
      "User-controlled input unexpectedly granted authority.",
    );
  }

  assert.equal(
    result.code,
    "AUTHORIZATION_REQUIRED",
  );

  assert.equal(executions, 0);
});

test("5J.1C fails closed for an unmapped tool capability", () => {
  const tool = {
    id: "future_transaction_test",
    description: "Future transaction tool",
    category: "knowledge",
    readOnly: true,
    requiresAuthentication: false,
    requiresWallet: false,
    riskLevel: "transaction",
    execute() {
      throw new Error("must not execute");
    },
  };

  assert.throws(
    () => getAtlasToolCapability(tool),
    /no guardrail capability mapping/,
  );
});