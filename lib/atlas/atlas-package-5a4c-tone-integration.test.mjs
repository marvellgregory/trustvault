import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith("@/")) {
      return nextResolve(
        new URL(`../../${specifier.slice(2)}.ts`, import.meta.url).href,
        context,
      );
    }

    if (
      specifier.startsWith("./") &&
      !specifier.endsWith(".ts") &&
      context.parentURL?.includes("/lib/atlas/")
    ) {
      return nextResolve(
        `${specifier.endsWith(".js") ? specifier.slice(0, -3) : specifier}.ts`,
        context,
      );
    }

    return nextResolve(specifier, context);
  },
});

const { AtlasOrchestrator } = await import("./index.ts");

const customer = {
  customerId: "customer-tone",
  walletAddress: "0x1111111111111111111111111111111111111111",
  chainId: 5_042_002,
  expiresAt: "2099-01-01T00:00:00.000Z",
  source: "trustvault-session",
};

function collection(records) {
  return {
    authenticatedCustomerId: customer.customerId,
    source: "authenticated-cloud",
    async findAll() {
      return {
        status: "available",
        records,
      };
    },
  };
}

function context(pathname = "/dashboard") {
  return {
    pathname,
    isAuthenticated: true,
    hasConnectedWallet: true,
    authenticatedCustomer: customer,
    customerAdapters: {
      marketplaceOrders: collection([]),
      receipts: collection([]),
      billSplits: collection([]),
      gifts: {
        authenticatedCustomerId: customer.customerId,
        source: "authenticated-cloud",
        async findById() {
          return null;
        },
      },
    },
  };
}

test("5A.4C Stage 3B attaches playful tone only to safe verified guidance", async () => {
  const plan = await new AtlasOrchestrator().plan(
    "How does Gift Vault work?",
    context("/gift-vault"),
  );

  assert.equal(plan.confidence, "VERIFIED");
  assert.equal(plan.tone?.mode, "playful");
  assert.equal(plan.tone?.humourAllowed, true);
});

test("5A.4C Stage 3B keeps Marketplace guidance warm rather than playful", async () => {
  const plan = await new AtlasOrchestrator().plan(
    "How does Marketplace work?",
    context("/marketplace"),
  );

  assert.equal(plan.confidence, "VERIFIED");
  assert.equal(plan.tone?.mode, "warm");
  assert.equal(plan.tone?.humourAllowed, false);
});

test("5A.4C Stage 3B forces unavailable responses into restrained tone", async () => {
  const plan = await new AtlasOrchestrator().plan(
    "Book me a hotel",
    context(),
  );

  assert.equal(plan.confidence, "UNAVAILABLE");
  assert.equal(plan.tone?.mode, "restrained");
  assert.equal(plan.tone?.humourAllowed, false);
});

test("5A.4C Stage 3B forces security guidance into restrained tone", async () => {
  const plan = await new AtlasOrchestrator().plan(
    "Can you help with a compromised wallet?",
    context("/account"),
  );

  assert.equal(plan.tone?.mode, "restrained");
  assert.equal(plan.tone?.humourAllowed, false);
});

test("5A.4C Stage 3B tone metadata never grants execution authority", async () => {
  const plan = await new AtlasOrchestrator().plan(
    "How does Bill Split work?",
    context("/bill-split"),
  );

  assert.ok(plan.tone);
  assert.equal("toolId" in plan.tone, false);
  assert.equal("action" in plan.tone, false);
  assert.equal("risk" in plan.tone, false);
  assert.equal("requiresPrivateData" in plan.tone, false);
});
