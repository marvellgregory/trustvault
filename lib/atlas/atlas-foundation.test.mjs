import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";

registerHooks({
  resolve(specifier, context, nextResolve) {
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
  ATLAS_VISUAL_STATES,
  AtlasToolRegistry,
  FOUNDATION_ATLAS_TOOLS,
  canCelebrate,
  classifyAtlasRoute,
  createAtlasGrounding,
  getAtlasVisualContext,
  getAtlasVisualState,
  getConfiguredSupportOptions,
  getAtlasSurfaceContract,
  isSafeInternalRoute,
  searchTrustVaultKnowledge,
} = await import("./index.ts");

const context = {
  pathname: "/",
  isAuthenticated: false,
  hasConnectedWallet: false,
};

test("duplicate tool IDs are rejected", () => {
  const tool = FOUNDATION_ATLAS_TOOLS[0];
  assert.throws(() => new AtlasToolRegistry([tool, tool]), /Duplicate Atlas tool ID/);
});

test("unknown tool IDs are rejected without fallback execution", async () => {
  const registry = new AtlasToolRegistry(FOUNDATION_ATLAS_TOOLS);
  const result = await registry.execute("missing_tool", context, {});
  assert.equal(result.ok, false);
  assert.equal(result.code, "UNKNOWN_TOOL");
});

test("foundational tools are read-only and limited to foundational risk", () => {
  const registry = new AtlasToolRegistry(FOUNDATION_ATLAS_TOOLS);
  const metadata = registry.getMetadata();
  assert.equal(metadata.length, 4);
  assert.ok(metadata.every((tool) => tool.readOnly));
  assert.ok(metadata.every((tool) => ["read", "navigation"].includes(tool.riskLevel)));
  assert.equal(metadata.some((tool) => ["prepare", "mutation", "transaction"].includes(tool.riskLevel)), false);
  assert.deepEqual(
    registry.filterByCategory("navigation").map((tool) => tool.id),
    ["open_trustvault_route"],
  );
});

test("known knowledge topics return verified TrustVault evidence", () => {
  const result = searchTrustVaultKnowledge("How do I connect my wallet on Arc Testnet?");
  assert.equal(result.groundingLevel, "VERIFIED");
  assert.ok(result.records.some((record) => record.route === "/help"));
  assert.ok(result.evidence.length > 0);
});

test("unknown knowledge queries return empty unavailable evidence", () => {
  const result = searchTrustVaultKnowledge("quasar penguin xenolith");
  assert.equal(result.groundingLevel, "UNAVAILABLE");
  assert.deepEqual(result.records, []);
  assert.deepEqual(result.evidence, []);
});

test("VERIFIED grounding cannot be created without evidence", () => {
  assert.throws(() => createAtlasGrounding("VERIFIED", []), /requires TrustVault evidence/);
});

test("support options contain only currently configured channels", () => {
  const options = getConfiguredSupportOptions();
  assert.deepEqual(
    options.map((option) => option.channel),
    ["help", "contact", "email", "x", "farcaster", "linkedin"],
  );
  assert.equal(options.some((option) => ["whatsapp", "discord"].includes(option.channel)), false);
});

test("support fallback is unavailable rather than an invented resolution", async () => {
  const { createAtlasSupportFallbackPlan } = await import("./atlas-support.ts");
  const plan = createAtlasSupportFallbackPlan("wallet network");
  assert.equal(plan.grounding.level, "UNAVAILABLE");
  assert.match(plan.answer, /couldn't verify/);
  assert.equal(plan.actions[0].optionId, "help-center");
});

test("route navigation validation accepts internal routes and rejects unsafe URLs", () => {
  assert.equal(isSafeInternalRoute("/help"), true);
  assert.equal(isSafeInternalRoute("/marketplace/product/123?ref=atlas"), true);
  for (const route of [
    "https://example.com",
    "//example.com/path",
    "javascript:alert(1)",
    "data:text/html,unsafe",
  ]) {
    assert.equal(isSafeInternalRoute(route), false, route);
  }
});

test("route context classification covers product and support surfaces", () => {
  assert.equal(classifyAtlasRoute("/marketplace/product/sku"), "marketplace");
  assert.equal(classifyAtlasRoute("/gift-vault/manage/1"), "gift-vault");
  assert.equal(classifyAtlasRoute("/bill-split/pay/1/2"), "bill-split");
  assert.equal(classifyAtlasRoute("/receipt/receipt-1"), "receipts");
  assert.equal(classifyAtlasRoute("/trust-center"), "trust-center");
  assert.equal(classifyAtlasRoute("/account"), "account");
  assert.equal(classifyAtlasRoute("/payment-review"), "payment-review");
  assert.equal(classifyAtlasRoute("/help"), "support");
  assert.equal(classifyAtlasRoute("/documentation"), "documentation");
  assert.equal(classifyAtlasRoute("/dashboard"), "dashboard");
  assert.equal(classifyAtlasRoute("/"), "general");
});

test("visual state values satisfy the mascot contract", () => {
  assert.deepEqual(ATLAS_VISUAL_STATES, [
    "idle",
    "greeting",
    "listening",
    "thinking",
    "speaking",
    "success",
    "warning",
    "error",
    "support",
    "celebrating",
  ]);
  assert.deepEqual(getAtlasSurfaceContract("collapsed"), {
    state: "collapsed",
    placement: "bottom-right",
    mascotVisible: true,
    mascotAttachedToSurface: true,
  });
});

test("payment review cannot auto-celebrate", () => {
  const payment = getAtlasVisualContext("/payment-review");
  assert.equal(canCelebrate(payment), false);
  assert.equal(getAtlasVisualState("celebrate-confirmed-success", payment), "success");
});

test("support context maps to support state", () => {
  const support = getAtlasVisualContext("/help");
  assert.equal(getAtlasVisualState("page-enter", support), "support");
  assert.equal(getAtlasVisualState("escalate-support", getAtlasVisualContext("/")), "support");
});
