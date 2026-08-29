import assert from "node:assert/strict";
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

const { AtlasOrchestrator } =
  await import("./atlas-orchestrator.ts");

function context(pathname = "/dashboard") {
  return {
    pathname,
    isAuthenticated: false,
    hasConnectedWallet: false,
  };
}

test("5A.4C Stage 4C stops at verified TrustVault knowledge", async () => {
  const atlas = new AtlasOrchestrator();

  const result = await atlas.plan(
    "How does Gift Vault work?",
    context("/gift-vault"),
  );

  assert.notEqual(result.grounding.level, "UNAVAILABLE");
  assert.equal(result.webFallback, undefined);
});

test("5A.4C Stage 4C exposes public fallback only after TrustVault is unavailable", async () => {
  const atlas = new AtlasOrchestrator();

  const result = await atlas.plan(
    "What is a stablecoin?",
    context(),
  );

  assert.equal(result.grounding.level, "UNAVAILABLE");

  assert.deepEqual(result.webFallback, {
    trigger: "TRUSTVAULT_UNAVAILABLE",
    decision: "ELIGIBLE",
    reason: "PUBLIC_INFORMATION",
  });
});

test("5A.4C Stage 4C keeps local-first feature knowledge out of public fallback", async () => {
  const atlas = new AtlasOrchestrator();

  const result = await atlas.plan(
    "Tell me about my wishlist feature",
    context("/wishlist"),
  );

  if (result.grounding.level === "UNAVAILABLE") {
    assert.notEqual(result.webFallback?.decision, "ELIGIBLE");
  }
});

test("5A.4C Stage 4C keeps sensitive wallet security blocked", async () => {
  const atlas = new AtlasOrchestrator();

  const result = await atlas.plan(
    "I think my wallet is compromised",
    context("/account"),
  );

  if (result.grounding.level === "UNAVAILABLE") {
    assert.equal(result.webFallback?.decision, "BLOCKED");
  }
});

test("5A.4C Stage 4C fallback metadata grants no execution authority", async () => {
  const atlas = new AtlasOrchestrator();

  const result = await atlas.plan(
    "What is a stablecoin?",
    context(),
  );

  const fallback = result.webFallback;

  assert.ok(fallback);
  assert.equal("toolId" in fallback, false);
  assert.equal("execute" in fallback, false);
  assert.equal("action" in fallback, false);
  assert.equal("riskLevel" in fallback, false);
  assert.equal("destination" in fallback, false);
});

test("5A.4C Stage 4C keeps a useful recovery response before external retrieval exists", async () => {
  const atlas = new AtlasOrchestrator();

  const result = await atlas.plan(
    "What is a stablecoin?",
    context(),
  );

  assert.equal(typeof result.answer, "string");
  assert.ok(result.answer.trim().length > 0);
  assert.ok(Array.isArray(result.actions));
  assert.ok(Array.isArray(result.suggestions));
  assert.equal(result.webFallback?.decision, "ELIGIBLE");
});
