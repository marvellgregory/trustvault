import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { registerHooks } from "node:module";
import test from "node:test";

registerHooks({
  resolve(specifier, context, nextResolve) {
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
  ALL_ATLAS_TOOLS,
  ATLAS_GUIDED_PRODUCT_WORKFLOWS,
  AtlasOrchestrator,
  resolveAtlasGuidedProductWorkflow,
} = await import("./index.ts");

const context = {
  pathname: "/",
  isAuthenticated: false,
  hasConnectedWallet: false,
};

const walletA = "0x1111111111111111111111111111111111111111";
const walletB = "0x2222222222222222222222222222222222222222";

const billValues = {
  title: "Dinner",
  totalAmount: "60",
  splitMethod: "equal",
  participants: [
    { name: "Asha", walletAddress: walletA },
    { name: "Ravi", walletAddress: walletB },
  ],
};

const giftValues = {
  giftMode: "send-now",
  recipientName: "Maya",
  walletAddress: walletA,
  amount: "20",
};

const checkoutValues = {
  productId: "product-1",
  cartItemCount: 1,
  fullName: "Maya Rao",
  email: "maya@example.com",
  addressLine1: "1 Market Street",
  city: "Bengaluru",
  state: "Karnataka",
  postalCode: "560001",
  country: "India",
};

function resolve(featureId, knownValues = {}, overrides = {}) {
  return resolveAtlasGuidedProductWorkflow({
    featureId,
    pathname: "/",
    knownValues,
    ...overrides,
  });
}

test("5E.1A Bill Split requests missing existing product fields", () => {
  const result = resolve("bill-split", { title: "Dinner" });

  assert.equal(result.status, "NEEDS_INPUT");
  assert.equal(result.currentStep, "bill-details");
  assert.ok(result.missingFields.includes("totalAmount"));
  assert.ok(result.missingFields.includes("participants"));
  assert.equal(result.values.totalAmount, undefined);
});

test("5E.1A Bill Split becomes ready only with valid required fields", () => {
  const result = resolve("bill-split", billValues);

  assert.equal(result.status, "READY_FOR_REVIEW");
  assert.equal(result.currentStep, "review");
  assert.equal(result.reviewReady, true);
  assert.equal(result.confirmationRequired, true);
  assert.equal(result.navigationRoute, "/bill-split");
});

test("5E.1A Gift Vault requests missing mode, recipient and amount", () => {
  const result = resolve("gift-vault", { amount: "20" });

  assert.equal(result.status, "NEEDS_INPUT");
  assert.equal(result.currentStep, "gift-mode");
  assert.ok(result.missingFields.includes("giftMode"));
  assert.ok(result.missingFields.includes("walletAddress"));
});

test("5E.1A Gift Vault supports real Send Now and timed review requirements", () => {
  const sendNow = resolve("gift-vault", giftValues);
  const timedMissing = resolve("gift-vault", {
    ...giftValues,
    giftMode: "lock-later",
  });
  const timedReady = resolve("gift-vault", {
    ...giftValues,
    giftMode: "lock-later",
    unlockDate: "2027-01-01",
    unlockTime: "09:30",
    timeZone: "Asia/Kolkata",
  });

  assert.equal(sendNow.status, "READY_FOR_REVIEW");
  assert.equal(timedMissing.status, "NEEDS_INPUT");
  assert.equal(timedMissing.currentStep, "unlock-schedule");
  assert.deepEqual(
    timedMissing.missingFields.slice(-3),
    ["unlockDate", "unlockTime", "timeZone"],
  );
  assert.equal(timedReady.status, "READY_FOR_REVIEW");
});

test("5E.1A Marketplace guides product, cart, checkout and review in order", () => {
  const product = resolve("marketplace");
  const cart = resolve("marketplace", { productId: "product-1" });
  const checkout = resolve("marketplace", {
    productId: "product-1",
    cartItemCount: 1,
  });
  const review = resolve("marketplace", checkoutValues);

  assert.deepEqual(
    [product.currentStep, product.navigationRoute],
    ["product-selection", "/marketplace"],
  );
  assert.deepEqual(
    [cart.currentStep, cart.navigationRoute],
    ["cart", "/marketplace/product/product-1"],
  );
  assert.deepEqual(
    [checkout.currentStep, checkout.navigationRoute],
    ["checkout-details", "/checkout"],
  );
  assert.equal(review.status, "READY_FOR_REVIEW");
  assert.equal(review.navigationRoute, "/checkout");
});

test("5E.1A workflows expose guidance only and never wallet execution or signing", () => {
  const results = [
    resolve("bill-split", billValues),
    resolve("gift-vault", giftValues),
    resolve("marketplace", checkoutValues),
  ];

  for (const result of results) {
    assert.equal(result.safeNextAction.type, "navigate");
    assert.equal(result.confirmationBoundary, "TRUSTVAULT_REVIEW_AND_USER_WALLET");
    assert.doesNotMatch(result.nextPrompt, /atlas.+sign|send transaction|approve usdc/i);
    assert.equal("execute" in result, false);
    assert.equal("sign" in result, false);
    assert.equal("provider" in result, false);
  }

  assert.ok(ALL_ATLAS_TOOLS.every((tool) => tool.readOnly));
});

test("5E.1A does not manufacture financial values", () => {
  const bill = resolve("bill-split", { title: "Dinner" });
  const gift = resolve("gift-vault", {
    giftMode: "send-now",
    recipientName: "Maya",
    walletAddress: walletA,
  });
  const marketplace = resolve("marketplace", { cartItemCount: 1 });

  assert.equal(bill.values.totalAmount, undefined);
  assert.equal(gift.values.amount, undefined);
  assert.equal("total" in marketplace.values, false);
  assert.equal("fee" in marketplace.values, false);
  assert.equal("balance" in marketplace.values, false);
});

test("5E.1A explicit current-turn values outrank app and conversation values", () => {
  const result = resolve("bill-split", {}, {
    conversationValues: { totalAmount: "10" },
    knownValues: { totalAmount: "30" },
    currentTurnValues: { totalAmount: "60" },
  });

  assert.equal(result.values.totalAmount, "60");
});

test("5E.1A orchestrator extracts only an explicit currency-qualified amount", async () => {
  const plan = await new AtlasOrchestrator().plan(
    "Split a 60 USDC dinner between three people",
    {
      ...context,
      guidedWorkflow: {
        featureId: "bill-split",
        conversationValues: { totalAmount: "10" },
        knownValues: { totalAmount: "30" },
      },
    },
  );
  const workflow = plan.data.guidedWorkflow;

  assert.equal(workflow.workflowId, "guided-bill-split");
  assert.equal(workflow.values.totalAmount, "60");
  assert.equal(workflow.values.participants, undefined);
  assert.equal(plan.grounding.level, "UNAVAILABLE");
  assert.ok(plan.actions.every((action) => action.type === "navigate"));
});

test("5E.1A unsupported workflow intent returns no fabricated workflow", () => {
  assert.equal(resolve("swap"), null);
  assert.equal(resolveAtlasGuidedProductWorkflow({ pathname: "/" }), null);
});

test("5E.1A knowledge questions remain on the normal knowledge path", async () => {
  const plan = await new AtlasOrchestrator().plan(
    "How does Gift Vault work?",
    context,
  );

  assert.equal(plan.grounding.level, "VERIFIED");
  assert.equal(plan.data?.guidedWorkflow, undefined);
  assert.ok(plan.evidence.some((item) => item.sourceId === "gift-vault-guide"));
});

test("5E.1A integrated workflow output feeds only safe actions and suggestions", async () => {
  const plan = await new AtlasOrchestrator().plan(
    "I want to send my sister 20 USDC as a gift",
    context,
  );

  assert.equal(plan.data.guidedWorkflow.workflowId, "guided-gift-vault");
  assert.equal(plan.data.guidedWorkflow.values.amount, "20");
  assert.ok(plan.actions.every((action) => action.type === "navigate"));
  assert.ok(plan.suggestions.every(({ action }) => action.type === "navigate"));
});

test("5E.1A workflow navigation targets are real TrustVault routes", async () => {
  const routeFiles = [
    "../../app/bill-split/page.tsx",
    "../../app/gift-vault/page.tsx",
    "../../app/marketplace/page.tsx",
    "../../app/cart/page.tsx",
    "../../app/checkout/page.tsx",
    "../../app/payment-review/page.tsx",
    "../../app/marketplace/product/[id]/page.tsx",
  ];

  await Promise.all(
    routeFiles.map((route) => access(new URL(route, import.meta.url))),
  );
});

test("5E.1A sensitive values are neither retained nor echoed", () => {
  const secret = `0x${"a".repeat(64)}`;
  const result = resolve("gift-vault", {
    ...giftValues,
    message: `My private key is ${secret}`,
  });

  assert.deepEqual(result.values, {});
  assert.doesNotMatch(JSON.stringify(result), new RegExp(secret, "i"));
  assert.equal(result.status, "NEEDS_INPUT");
});

test("5E.1A resolution is deterministic", () => {
  const input = {
    featureId: "marketplace",
    pathname: "/cart",
    knownValues: checkoutValues,
  };
  const expected = resolveAtlasGuidedProductWorkflow(input);

  for (let iteration = 0; iteration < 20; iteration += 1) {
    assert.deepEqual(resolveAtlasGuidedProductWorkflow(input), expected);
  }
});

test("5E.1A all products reuse the shared workflow definition contract", () => {
  assert.deepEqual(
    ATLAS_GUIDED_PRODUCT_WORKFLOWS.map(({ featureId }) => featureId),
    ["bill-split", "gift-vault", "marketplace"],
  );
  assert.ok(
    ATLAS_GUIDED_PRODUCT_WORKFLOWS.every(
      (definition) =>
        typeof definition.getSteps === "function" &&
        typeof definition.isFieldComplete === "function",
    ),
  );
});

test("5E.1A workflow production modules have no wallet, provider or execution imports", async () => {
  for (const file of [
    "./atlas-guided-workflow.ts",
    "./atlas-guided-product-workflows.ts",
  ]) {
    const source = await readFile(new URL(file, import.meta.url), "utf8");
    const imports = [...source.matchAll(/from\s+["']([^"']+)["']/g)].map(
      ([, specifier]) => specifier,
    );

    assert.equal(
      imports.some((specifier) =>
        /wallet|provider|app-kit|circle|transaction|contract|private-key|seed/i.test(
          specifier,
        ),
      ),
      false,
      file,
    );
  }
});

test("5E.1A normal Marketplace education remains backward compatible", async () => {
  const plan = await new AtlasOrchestrator().plan("Show me products", context);

  assert.equal(plan.data?.guidedWorkflow, undefined);
  assert.equal(plan.intent, "knowledge");
});
