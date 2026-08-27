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
  ALL_ATLAS_TOOLS,
  ATLAS_CARRIER_REGISTRY,
  ATLAS_DELIVERY_POLICY,
  AtlasOrchestrator,
  AtlasToolRegistry,
  getAtlasDeliveryTrackingStatus,
  getAtlasVisualContext,
  getAtlasVisualState,
  isControlledTrackingDestination,
  searchTrustVaultKnowledge,
} = await import("./index.ts");

const customer = {
  customerId: "customer-1",
  walletAddress: "0x1111111111111111111111111111111111111111",
  chainId: 5_042_002,
  expiresAt: "2099-01-01T00:00:00.000Z",
  source: "trustvault-session",
};

const order = {
  id: "order-1",
  orderNumber: "TV-1",
  status: "processing",
  itemTitles: ["Dinner set"],
  totalAmount: "25",
  asset: "USDC",
  createdAt: "2026-08-24T09:00:00.000Z",
  fulfillment: { status: "processing" },
};

const receipt = {
  id: "receipt-1",
  title: "Dinner set purchase",
  type: "purchase",
  status: "confirmed",
  amount: "25",
  asset: "USDC",
  createdAt: "2026-08-24T09:10:00.000Z",
  orderId: "order-1",
};

const dinnerBill = {
  id: "bill-1",
  title: "Dinner with friends",
  status: "active",
  totalAmount: "100",
  asset: "USDC",
  participantCount: 5,
  settledShareCount: 3,
  createdAt: "2026-08-20T18:00:00.000Z",
};

const officeBill = {
  ...dinnerBill,
  id: "bill-2",
  title: "Office lunch",
  participantCount: 4,
  settledShareCount: 4,
  status: "settled",
};

function collection(records, overrides = {}) {
  return {
    authenticatedCustomerId: customer.customerId,
    source: "authenticated-cloud",
    async findAll() {
      return { status: "available", records };
    },
    ...overrides,
  };
}

function authenticatedContext(adapterOverrides = {}) {
  return {
    pathname: "/dashboard",
    isAuthenticated: true,
    hasConnectedWallet: true,
    authenticatedCustomer: customer,
    customerAdapters: {
      marketplaceOrders: collection([order]),
      receipts: collection([receipt]),
      billSplits: collection([dinnerBill, officeBill], {
        source: "authenticated-browser",
      }),
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
                createdAt: "2026-08-24T09:00:00.000Z",
              }
            : null;
        },
      },
      ...adapterOverrides,
    },
  };
}

test("unauthenticated private lookup is rejected", async () => {
  const registry = new AtlasToolRegistry(ALL_ATLAS_TOOLS);
  const result = await registry.execute(
    "find_my_marketplace_orders",
    { pathname: "/", isAuthenticated: false, hasConnectedWallet: false },
    { query: "TV-1" },
  );
  assert.equal(result.ok, false);
  assert.equal(result.code, "AUTHORIZATION_REQUIRED");
});

test("wallet connection alone does not authorize private lookup", async () => {
  const registry = new AtlasToolRegistry(ALL_ATLAS_TOOLS);
  const result = await registry.execute(
    "find_my_receipts",
    { pathname: "/receipts", isAuthenticated: false, hasConnectedWallet: true },
    { query: "receipt" },
  );
  assert.equal(result.ok, false);
  assert.equal(result.code, "AUTHORIZATION_REQUIRED");
});

test("authenticated owned order lookup succeeds through a narrow adapter", async () => {
  const registry = new AtlasToolRegistry(ALL_ATLAS_TOOLS);
  const result = await registry.execute(
    "find_my_marketplace_orders",
    authenticatedContext(),
    { query: "TV-1" },
  );
  assert.equal(result.ok, true);
  assert.equal(result.groundingLevel, "VERIFIED");
  assert.equal(result.data.matchCount, 1);
  assert.equal(result.data.matches[0].id, "order-1");
});

test("an adapter bound to another customer is not read", async () => {
  let called = false;
  const context = authenticatedContext({
    marketplaceOrders: collection([order], {
      authenticatedCustomerId: "customer-2",
      async findAll() {
        called = true;
        return { status: "available", records: [order] };
      },
    }),
  });
  const result = await new AtlasToolRegistry(ALL_ATLAS_TOOLS).execute(
    "find_my_marketplace_orders",
    context,
    { query: "TV-1" },
  );
  assert.equal(result.ok, false);
  assert.equal(result.code, "DATA_UNAVAILABLE");
  assert.equal(called, false);
});

test("unknown owned record returns unavailable without revealing other records", async () => {
  const result = await new AtlasToolRegistry(ALL_ATLAS_TOOLS).execute(
    "find_my_marketplace_orders",
    authenticatedContext(),
    { query: "TV-DOES-NOT-EXIST" },
  );
  assert.equal(result.ok, true);
  assert.equal(result.groundingLevel, "UNAVAILABLE");
  assert.deepEqual(result.data.matches, []);
});

test("multiple Bill Split matches return disambiguation data", async () => {
  const result = await new AtlasToolRegistry(ALL_ATLAS_TOOLS).execute(
    "find_my_bill_splits",
    authenticatedContext(),
    { query: "bill splits" },
  );
  assert.equal(result.ok, true);
  assert.equal(result.data.matchCount, 2);
  assert.deepEqual(
    result.data.matches.map((bill) => bill.title),
    ["Dinner with friends", "Office lunch"],
  );
});

test("receipt lookup returns a safe owned deep link", async () => {
  const result = await new AtlasToolRegistry(ALL_ATLAS_TOOLS).execute(
    "find_my_receipts",
    authenticatedContext(),
    { query: "Dinner" },
  );
  assert.equal(result.ok, true);
  assert.equal(result.evidence[0].sourceRoute, "/receipt/receipt-1");
});

test("gift lookup remains customer scoped and hides non-owned IDs", async () => {
  const registry = new AtlasToolRegistry(ALL_ATLAS_TOOLS);
  const owned = await registry.execute("find_my_gifts", authenticatedContext(), {
    giftId: "7",
  });
  const hidden = await registry.execute("find_my_gifts", authenticatedContext(), {
    giftId: "8",
  });
  assert.equal(owned.ok, true);
  assert.equal(owned.data.matchCount, 1);
  assert.equal(hidden.ok, true);
  assert.equal(hidden.groundingLevel, "UNAVAILABLE");
  assert.deepEqual(hidden.data.matches, []);
});

test("orchestrator produces a natural Bill Split answer and unresolved support fallback", async () => {
  const orchestrator = new AtlasOrchestrator();
  const found = await orchestrator.plan("Fetch my dinner bill.", authenticatedContext());
  assert.match(found.answer, /3 of 5 shares are settled/);
  assert.equal(found.grounding.level, "VERIFIED");
  const missing = await orchestrator.plan("Find my holiday receipt", authenticatedContext());
  assert.equal(missing.grounding.level, "UNAVAILABLE");
  assert.ok(missing.actions.some((action) => action.type === "support"));
});

test("delivery policy knowledge states 48 working hours", () => {
  assert.equal(ATLAS_DELIVERY_POLICY.trackingAssignmentWorkingHours, 48);
  assert.match(ATLAS_DELIVERY_POLICY.explanation, /48 working hours/);
  const knowledge = searchTrustVaultKnowledge("When should my AWB be assigned?");
  assert.equal(knowledge.groundingLevel, "VERIFIED");
  assert.ok(knowledge.records.some((record) => record.id === "marketplace-delivery-tracking"));
});

test("delivery status distinguishes pending, assigned and overdue without fabricating AWB", () => {
  const placed = "2026-08-03T09:00:00.000Z";
  assert.equal(
    getAtlasDeliveryTrackingStatus({
      orderPlacedAt: placed,
      now: new Date("2026-08-04T09:00:00.000Z"),
    }),
    "pending",
  );
  assert.equal(
    getAtlasDeliveryTrackingStatus({
      orderPlacedAt: placed,
      trackingNumber: "AWB-123",
      now: new Date("2026-08-10T09:00:00.000Z"),
    }),
    "assigned",
  );
  assert.equal(
    getAtlasDeliveryTrackingStatus({
      orderPlacedAt: placed,
      now: new Date("2026-08-05T09:00:00.000Z"),
    }),
    "overdue-unavailable",
  );
  assert.equal(ATLAS_DELIVERY_POLICY.pendingLabel, "Tracking number pending");
});

test("delivery tool never fabricates an AWB", async (context) => {
  context.mock.timers.enable({
    apis: ["Date"],
    now: new Date("2026-08-25T09:00:00.000Z"),
  });
  const result = await new AtlasToolRegistry(ALL_ATLAS_TOOLS).execute(
    "get_my_order_delivery",
    authenticatedContext(),
    { query: "TV-1" },
  );
  assert.equal(result.ok, true);
  assert.equal("trackingNumber" in result.data, false);
  assert.equal(result.data.trackingStatus, "pending");
});

test("carrier registry is controlled and contains the four approved carriers", () => {
  assert.deepEqual(
    ATLAS_CARRIER_REGISTRY.map((carrier) => carrier.displayName),
    ["DHL", "FedEx", "UPS", "Aramex"],
  );
  assert.ok(
    ATLAS_CARRIER_REGISTRY.every((carrier) =>
      isControlledTrackingDestination(carrier.officialTrackingDestination),
    ),
  );
  for (const unsafe of [
    "javascript:alert(1)",
    "https://evil.example/track",
    "https://www.fedex.com.evil.example/track",
    "data:text/html,unsafe",
  ]) {
    assert.equal(isControlledTrackingDestination(unsafe), false);
  }
});

test("support escalation maps response planning to support visual state", async () => {
  const plan = await new AtlasOrchestrator().plan("I need support", authenticatedContext());
  assert.equal(plan.visualState, "support");
  assert.equal(
    getAtlasVisualState("escalate-support", getAtlasVisualContext("/dashboard")),
    "support",
  );
});

test("Package 2 registry contains only read-only read/navigation tools", () => {
  const metadata = new AtlasToolRegistry(ALL_ATLAS_TOOLS).getMetadata();
  assert.equal(metadata.length, 9);
  assert.ok(metadata.every((tool) => tool.readOnly));
  assert.ok(metadata.every((tool) => ["read", "navigation"].includes(tool.riskLevel)));
  assert.equal(metadata.some((tool) => ["mutation", "transaction"].includes(tool.riskLevel)), false);
});
