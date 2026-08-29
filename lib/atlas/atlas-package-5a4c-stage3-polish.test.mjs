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

const {
  AtlasOrchestrator,
} = await import("./index.ts");

const {
  createAtlasSuggestions,
} = await import("./atlas-suggestions.ts");

const customer = {
  customerId: "customer-stage3-polish",
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

test("5A.4C Stage 3 polish deduplicates Bill Split suggestions by navigation target", () => {
  const suggestions = createAtlasSuggestions({
    intent: "bill-split",
    pathname: "/bill-split",
    actions: [
      {
        type: "navigate",
        label: "Open Bill Split",
        route: "/bill-split",
      },
      {
        type: "ask-atlas",
        label: "How does Bill Split work?",
        prompt: "How does Bill Split work in TrustVault?",
      },
      {
        type: "navigate",
        label: "Open Receipts",
        route: "/receipts",
      },
    ],
  });

  const billSplitRoutes = suggestions.filter(
    (item) =>
      item.action.type === "navigate" &&
      item.action.route === "/bill-split",
  );

  assert.equal(billSplitRoutes.length, 1);
});

test("5A.4C Stage 3 polish keeps a distinct contextual suggestion when destination differs", () => {
  const suggestions = createAtlasSuggestions({
    intent: "gift",
    pathname: "/gift-vault",
    actions: [
      {
        type: "navigate",
        label: "Open Gift Vault",
        route: "/gift-vault",
      },
      {
        type: "ask-atlas",
        label: "How does gifting work?",
        prompt: "How does Gift Vault gifting work in TrustVault?",
      },
    ],
  });

  assert.ok(
    suggestions.some(
      (item) =>
        item.action.type === "navigate" &&
        item.action.route === "/gift-vault/manage",
    ),
  );
});

test("5A.4C Stage 3 polish gives compromised-wallet questions restrained actionable guidance", async () => {
  const plan = await new AtlasOrchestrator().plan(
    "Can you help with a compromised wallet?",
    context("/account"),
  );

  assert.equal(plan.confidence, "VERIFIED");
  assert.equal(plan.issueCategory, "security");
  assert.equal(plan.tone?.mode, "restrained");
  assert.equal(plan.tone?.humourAllowed, false);

  assert.match(plan.answer, /avoid approving new signing requests/i);
  assert.match(plan.answer, /wallet provider's trusted security or recovery guidance/i);
  assert.match(plan.answer, /does not hold your private keys/i);
  assert.doesNotMatch(plan.answer, /detective|surprise|jargon/i);
});

test("5A.4C Stage 3 polish does not change ordinary wallet education into a security warning", async () => {
  const plan = await new AtlasOrchestrator().plan(
    "Why does TrustVault need me to connect a wallet?",
    context("/account"),
  );

  assert.equal(plan.confidence, "VERIFIED");
  assert.notEqual(plan.issueCategory, "security");
  assert.doesNotMatch(plan.answer, /compromised|recovery guidance/i);
});

test("5A.4C Stage 3 polish preserves Bill Split playful guidance while removing duplicate chip", async () => {
  const plan = await new AtlasOrchestrator().plan(
    "How does Bill Split work?",
    context("/bill-split"),
  );

  assert.equal(plan.tone?.mode, "playful");
  assert.equal(plan.tone?.humourAllowed, true);
  assert.match(plan.answer, /who still owes what/i);

  const billSplitSuggestions = plan.suggestions.filter(
    (item) =>
      item.action.type === "navigate" &&
      item.action.route === "/bill-split",
  );

  assert.equal(billSplitSuggestions.length, 1);
});
