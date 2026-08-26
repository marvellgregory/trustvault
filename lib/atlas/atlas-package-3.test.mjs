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
      specifier.endsWith(".js") &&
      context.parentURL?.includes("/lib/atlas/")
    ) {
      return nextResolve(`${specifier.slice(0, -3)}.ts`, context);
    }
    return nextResolve(specifier, context);
  },
});

const {
  AtlasOrchestrator,
  classifyAtlasIssue,
  isSafeInternalRoute,
  rankAtlasSupportOptions,
} = await import("./index.ts");

const customer = {
  customerId: "customer-premium",
  walletAddress: "0x1111111111111111111111111111111111111111",
  chainId: 5_042_002,
  expiresAt: "2099-01-01T00:00:00.000Z",
  source: "trustvault-session",
};

function order(overrides = {}) {
  return {
    id: "order-1",
    orderNumber: "TV-1001",
    status: "processing",
    itemTitles: ["Dinner set"],
    totalAmount: "25",
    asset: "USDC",
    sellerName: "Atlas Home",
    paymentStatus: "confirmed",
    receiptId: "receipt-1",
    createdAt: "2026-08-20T09:00:00.000Z",
    fulfillment: { status: "processing" },
    ...overrides,
  };
}

function collection(records, source = "authenticated-cloud") {
  return {
    authenticatedCustomerId: customer.customerId,
    source,
    async findAll() {
      return { status: "available", records };
    },
  };
}

function context({ pathname = "/dashboard", orders = [order()], receipts, bills } = {}) {
  return {
    pathname,
    isAuthenticated: true,
    hasConnectedWallet: true,
    authenticatedCustomer: customer,
    customerAdapters: {
      marketplaceOrders: collection(orders),
      receipts: collection(
        receipts ?? [
          {
            id: "receipt-1",
            title: "Dinner set purchase",
            type: "purchase",
            status: "confirmed",
            amount: "25",
            asset: "USDC",
            createdAt: "2026-08-20T09:10:00.000Z",
            orderId: "order-1",
          },
        ],
      ),
      billSplits: collection(
        bills ?? [
          {
            id: "bill-1",
            title: "Dinner with friends",
            status: "active",
            totalAmount: "100",
            asset: "USDC",
            participantCount: 5,
            settledShareCount: 3,
            createdAt: "2026-08-20T18:00:00.000Z",
          },
        ],
        "authenticated-browser",
      ),
      gifts: {
        authenticatedCustomerId: customer.customerId,
        source: "authenticated-cloud",
        async findById(id) {
          return id === "7"
            ? {
                id: "7",
                senderAddress: customer.walletAddress,
                recipientAddress: "0x2222222222222222222222222222222222222222",
                amountBaseUnits: "1000000",
                unlockTimestamp: "1788000000",
                message: "Happy birthday",
                createdAt: "2026-08-20T09:00:00.000Z",
              }
            : null;
        },
      },
    },
  };
}

test("verified owned order uses confident but bounded premium phrasing", async () => {
  const plan = await new AtlasOrchestrator().plan("Where is my order?", context());
  assert.equal(plan.confidence, "VERIFIED");
  assert.match(plan.answer, /^I found your order TV-1001\./);
  assert.match(plan.answer, /Payment is confirmed/);
  assert.doesNotMatch(plan.answer, /As an AI|according to my system/i);
  assert.equal(plan.sourceLabels[0].label, "From your Marketplace order");
});

test("multiple owned orders produce safe disambiguation choices", async () => {
  const second = order({
    id: "order-2",
    orderNumber: "TV-1002",
    sellerName: "Trust Goods",
    totalAmount: "40",
    createdAt: "2026-08-21T09:00:00.000Z",
  });
  const plan = await new AtlasOrchestrator().plan(
    "Show my orders",
    context({ orders: [order(), second] }),
  );
  assert.match(plan.answer, /Which one did you mean/);
  assert.equal(plan.disambiguation.length, 2);
  assert.match(plan.disambiguation[0].description, /Atlas Home.*25 USDC/);
  assert.ok(plan.disambiguation.every((choice) => isSafeInternalRoute(choice.action.route)));
});

test("latest Bill Split selects the newest owned record", async () => {
  const newer = {
    id: "bill-2",
    title: "Office lunch",
    status: "settled",
    totalAmount: "80",
    asset: "USDC",
    participantCount: 4,
    settledShareCount: 4,
    createdAt: "2026-08-22T12:00:00.000Z",
  };
  const plan = await new AtlasOrchestrator().plan(
    "Fetch my latest bill.",
    context({ bills: [context().customerAdapters.billSplits ? {
      id: "bill-1",
      title: "Dinner with friends",
      status: "active",
      totalAmount: "100",
      asset: "USDC",
      participantCount: 5,
      settledShareCount: 3,
      createdAt: "2026-08-20T18:00:00.000Z",
    } : null, newer].filter(Boolean) }),
  );
  assert.match(plan.answer, /Office lunch/);
  assert.doesNotMatch(plan.answer, /Which one/);
});

test("zero results are unavailable, do not guess, and offer support", async () => {
  const plan = await new AtlasOrchestrator().plan(
    "Find my holiday receipt",
    context({ receipts: [] }),
  );
  assert.equal(plan.confidence, "UNAVAILABLE");
  assert.match(plan.answer, /couldn't find/);
  assert.ok(plan.supportOptions.length > 0);
  assert.equal(plan.visualState, "warning");
});

test("gift claim answer is explicitly partial when claim state is absent", async () => {
  const plan = await new AtlasOrchestrator().plan("Did my gift 7 get claimed?", context());
  assert.equal(plan.confidence, "PARTIAL");
  assert.match(plan.answer, /doesn't confirm whether.*claimed/i);
  assert.match(plan.answer, /don't want to guess/i);
});

test("pending delivery explains the 48-working-hour policy", async () => {
  const pending = order({
    createdAt: "2098-08-20T09:00:00.000Z",
    fulfillment: { status: "processing" },
  });
  const plan = await new AtlasOrchestrator().plan(
    "What is my AWB?",
    context({ orders: [pending] }),
  );
  assert.equal(plan.confidence, "PARTIAL");
  assert.match(plan.answer, /hasn't been assigned yet/);
  assert.match(plan.answer, /48 working hours/);
});

test("assigned delivery surfaces only carrier and AWB plus controlled action", async () => {
  const assigned = order({
    fulfillment: {
      status: "shipped",
      carrier: "DHL",
      trackingNumber: "AWB-12345",
    },
  });
  const plan = await new AtlasOrchestrator().plan(
    "Track my package",
    context({ orders: [assigned] }),
  );
  assert.equal(plan.confidence, "VERIFIED");
  assert.match(plan.answer, /DHL: AWB-12345/);
  assert.ok(plan.actions.some((action) => action.label === "Track delivery"));
  assert.doesNotMatch(plan.answer, /customs|scan|delivery attempt|out for delivery/i);
});

test("overdue delivery creates a support handoff with safe order context", async () => {
  const overdue = order({
    createdAt: "2020-01-06T09:00:00.000Z",
    fulfillment: { status: "processing" },
  });
  const plan = await new AtlasOrchestrator().plan(
    "Track my package",
    context({ orders: [overdue] }),
  );
  assert.equal(plan.visualState, "support");
  assert.match(plan.answer, /past the expected 48-working-hour window/);
  assert.deepEqual(plan.supportOptions.map((option) => option.channel), [
    "contact",
    "email",
    "help",
  ]);
  assert.deepEqual(plan.supportContext.references, [
    { label: "Order ID", value: "order-1" },
  ]);
});

test("support ranking is contextual and keeps sensitive issues off public social channels", () => {
  assert.equal(rankAtlasSupportOptions("wallet")[0].channel, "help");
  assert.equal(rankAtlasSupportOptions("delivery")[0].channel, "contact");
  const security = rankAtlasSupportOptions("security");
  assert.equal(security[0].id, "responsible-disclosure");
  assert.deepEqual(security.map((option) => option.channel), ["contact", "email", "contact"]);
});

test("issue triage respects the question over unrelated page context", () => {
  assert.equal(classifyAtlasIssue("My tracking number is missing", "/gift-vault"), "delivery");
  assert.equal(classifyAtlasIssue("I found a security vulnerability", "/marketplace"), "security");
  assert.equal(classifyAtlasIssue("Why is my payment pending?", "/"), "payment");
});

test("payment-review responses stay restrained and never celebrate", async () => {
  const plan = await new AtlasOrchestrator().plan(
    "What does confirmed mean?",
    context({ pathname: "/payment-review" }),
  );
  assert.equal(plan.visualState, "speaking");
  assert.deepEqual(plan.visualSequence, ["listening", "thinking", "speaking"]);
  assert.equal(plan.visualSequence.includes("celebrating"), false);
});

test("Swap answer states Coming Soon and offers no execution", async () => {
  const plan = await new AtlasOrchestrator().plan("Can Atlas swap USDC?", context());
  assert.equal(plan.confidence, "VERIFIED");
  assert.match(plan.answer, /Swap is Coming Soon/);
  assert.match(plan.answer, /can't swap USDC/);
  assert.ok(plan.actions.some((action) => action.type === "navigate" && action.route.includes("/coming-soon")));
});

test("wallet and Gift Vault explanations stay grounded in TrustVault sources", async () => {
  const orchestrator = new AtlasOrchestrator();
  const wallet = await orchestrator.plan("Can I use Trust Wallet?", context());
  assert.match(wallet.answer, /Trust Wallet is marked Coming Soon/);
  assert.equal(wallet.sourceLabels[0].label, "From TrustVault Help");

  const gift = await orchestrator.plan("How does Gift Vault work?", context());
  assert.equal(gift.confidence, "VERIFIED");
  assert.match(gift.answer, /Gift Vault supports direct and timed gifts/);
});

test("page-aware suggestions support context without overriding the question", async () => {
  const plan = await new AtlasOrchestrator().plan(
    "What is Arc Testnet?",
    context({ pathname: "/gift-vault" }),
  );
  assert.equal(plan.issueCategory, "network");
  assert.ok(plan.suggestions.some((suggestion) => suggestion.label === "Manage gifts"));
  assert.match(plan.answer, /Arc Testnet/);
});

test("record actions remain owned internal routes and include safe source labels", async () => {
  const plan = await new AtlasOrchestrator().plan("Show my last receipt", context());
  assert.equal(plan.sourceLabels[0].label, "From your TrustVault receipt");
  assert.ok(
    plan.actions
      .filter((action) => action.type === "navigate")
      .every((action) => isSafeInternalRoute(action.route)),
  );
  assert.equal(plan.customerContext.authenticated, true);
  assert.equal("customerId" in plan.customerContext, false);
});

test("unknown questions remain unavailable and use the no-guess contract", async () => {
  const plan = await new AtlasOrchestrator().plan(
    "Explain the lunar penguin zircon nebula",
    context(),
  );
  assert.equal(plan.confidence, "UNAVAILABLE");
  assert.match(plan.answer, /couldn't verify/);
  assert.match(plan.answer, /don't want to guess/);
});

test("unsupported WhatsApp and Discord never appear in response support options", async () => {
  const plan = await new AtlasOrchestrator().plan("Where can I contact support?", context());
  assert.equal(
    plan.supportOptions.some((option) => ["whatsapp", "discord"].includes(option.channel)),
    false,
  );
});
