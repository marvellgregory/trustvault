import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";

registerHooks({ resolve(specifier, context, nextResolve) { if (specifier.startsWith("./") && !specifier.endsWith(".ts")) return nextResolve(`${specifier}.ts`, context); return nextResolve(specifier, context); } });
const { createTransactionReadinessAuthority } = await import("./transaction-readiness-authority.ts");
const ready = (generation = "current") => ({ status: "TRANSACTION_READY", qualificationGeneration: generation, evaluatedAt: new Date().toISOString(), reasons: [] });
const blocked = (reason) => ({ status: "INVALIDATED", evaluatedAt: new Date().toISOString(), reasons: [reason] });

test("current Package 6 readiness authorizes and all lesser states fail", async () => {
  await assert.doesNotReject(createTransactionReadinessAuthority(async () => ready()).assertCurrent());
  for (const reason of ["provider changed", "account changed", "chain changed", "qualification generation changed", "connection alone", "enabled family alone"]) {
    await assert.rejects(createTransactionReadinessAuthority(async () => blocked(reason)).assertCurrent(), new RegExp(reason));
  }
});

test("readiness is reevaluated at every submission boundary and stale readiness cannot authorize", async () => {
  let current = ready("old");
  const authority = createTransactionReadinessAuthority(async () => current);
  await authority.assertCurrent();
  current = blocked("provider changed after review");
  await assert.rejects(authority.assertCurrent(), /provider changed after review/);
});
