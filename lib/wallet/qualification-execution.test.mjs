import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";

registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("./") && !specifier.endsWith(".ts")) return nextResolve(`${specifier}.ts`, context);
  if (specifier.startsWith("../")) return nextResolve(new URL(`${specifier}.ts`, context.parentURL).href, context);
  return nextResolve(specifier, context);
} });

const { createQualificationExecutionController } = await import("./qualification-execution.ts");
const ACCOUNT = "0x1111111111111111111111111111111111111111";
const ARC = 5042002;
const providerA = { request: async () => [ACCOUNT] };
const providerB = { request: async () => [ACCOUNT] };
const record = (provider = providerA, overrides = {}) => ({ identity: { registryId: "eip6963:a", source: "eip6963", uuid: "a", rdns: "wallet.example", name: "Unknown Wallet" }, provider, aliases: [], state: "available", announcedAt: 1, lastSeenAt: 1, conflicts: [], ...overrides });
const valid = (overrides = {}) => ({ registryActive: true, registryGeneration: "registry-1", selectedRegistryId: "eip6963:a", selectedRecord: record(), activeWagmiProvider: providerA, identityVerified: true, connected: true, verifiedAccount: ACCOUNT, activeAccount: ACCOUNT, chainId: ARC, requiredChainId: ARC, circleStatus: "CIRCLE_READY", circleProvider: providerA, circleBindingGeneration: "circle-1", qualificationGeneration: "qualification-1", ...overrides });

function setup(runtime = valid(), options = {}) {
  const recorded = [];
  let current = runtime;
  const controller = createQualificationExecutionController({ enabled: options.enabled ?? true, getRuntimeEvidence: async () => current, recordEvidence: (entry) => recorded.push(entry), createRunId: options.createRunId ?? (() => "run-1"), now: () => "2026-08-17T00:00:00.000Z" });
  return { controller, recorded, setRuntime: (next) => { current = next; } };
}

test("all exact runtime checks pass before Package 7 receives PASSED", async () => {
  const { controller, recorded } = setup();
  assert.equal((await controller.run()).phase, "PASSED");
  assert.equal(recorded.at(-1).outcome, "PASSED");
  assert.equal(recorded.at(-1).provider, providerA);
});

test("connection, name, RDNS, and Arc metadata alone cannot pass", async () => {
  for (const runtime of [valid({ identityVerified: false }), valid({ activeWagmiProvider: providerB }), valid({ circleStatus: "CIRCLE_UNBOUND" })]) {
    const { controller, recorded } = setup(runtime);
    assert.notEqual((await controller.run()).phase, "PASSED");
    assert.notEqual(recorded.at(-1)?.outcome, "PASSED");
  }
});

test("exact provider and same-account provider isolation are authoritative", async () => {
  const { controller } = setup(valid({ activeWagmiProvider: providerB }));
  assert.equal((await controller.run()).phase, "FAILED");
});

test("wallet brands and unknown providers use the same workflow", async () => {
  for (const name of ["MetaMask", "Phantom", "Unknown Wallet"]) {
    const unknown = { request: async () => [ACCOUNT] };
    const runtime = valid({ selectedRecord: record(unknown, { identity: { ...record().identity, name } }), activeWagmiProvider: unknown, circleProvider: unknown });
    const { controller } = setup(runtime);
    assert.equal((await controller.run()).phase, "PASSED");
  }
});

test("wrong chain and observed unsupported network record factual failure", async () => {
  assert.equal((await setup(valid({ chainId: 1 })).controller.run()).phase, "FAILED");
  const observed = setup();
  const result = await observed.controller.run({ unsupportedNetworkObservation: "Unsupported network" });
  assert.equal(result.phase, "FAILED");
  assert.equal(observed.recorded.at(-1).outcome, "FAILED");
  assert.notEqual(observed.recorded.at(-1).outcome, "PASSED");
});

test("provider preflight rejection fails closed", async () => {
  const rejecting = { request: async () => { throw new Error("Provider unavailable"); } };
  const runtime = valid({ selectedRecord: record(rejecting), activeWagmiProvider: rejecting, circleProvider: rejecting });
  const execution = setup(runtime);
  assert.equal((await execution.controller.run()).phase, "FAILED");
  assert.equal(execution.recorded.at(-1).outcome, "FAILED");
});

test("account, chain, selection, provider, conflict, Circle and generation changes invalidate", async () => {
  const changes = [
    valid({ activeAccount: "0x2222222222222222222222222222222222222222" }),
    valid({ chainId: 1 }), valid({ selectedRegistryId: "eip6963:b" }),
    valid({ selectedRecord: record(providerB) }),
    valid({ selectedRecord: record(providerA, { state: "conflicted", conflicts: [{ type: "uuid-provider-mismatch", uuid: "a", detectedAt: 2 }] }) }),
    valid({ circleStatus: "CIRCLE_INVALIDATED" }), valid({ qualificationGeneration: "qualification-2" }),
    valid({ connected: false }),
  ];
  for (const changed of changes) {
    let calls = 0;
    const recorded = [];
    const controller = createQualificationExecutionController({ enabled: true, getRuntimeEvidence: async () => (++calls === 1 ? valid() : changed), recordEvidence: (entry) => recorded.push(entry), createRunId: () => "run" });
    assert.notEqual((await controller.run()).phase, "PASSED");
    assert.notEqual(recorded.at(-1)?.outcome, "PASSED");
  }
});

test("a newer run supersedes a stale async run", async () => {
  let release;
  let firstRequest = true;
  const slowProvider = { request: () => firstRequest ? (firstRequest = false, new Promise((resolve) => { release = resolve; })) : Promise.resolve([ACCOUNT]) };
  const runtime = valid({ selectedRecord: record(slowProvider), activeWagmiProvider: slowProvider, circleProvider: slowProvider });
  const recorded = [];
  let id = 0;
  const controller = createQualificationExecutionController({ enabled: true, getRuntimeEvidence: async () => runtime, recordEvidence: (entry) => recorded.push(entry), createRunId: () => `run-${++id}` });
  const stale = controller.run();
  await Promise.resolve(); await Promise.resolve();
  const current = controller.run();
  release([ACCOUNT]);
  await stale;
  assert.equal((await current).phase, "PASSED");
  assert.equal(recorded.filter((entry) => entry.outcome === "PASSED").length, 1);
});

test("reload begins IDLE and production execution refuses recording", async () => {
  assert.equal(setup().controller.getSnapshot().phase, "IDLE");
  const production = setup(valid(), { enabled: false });
  assert.equal((await production.controller.run()).phase, "FAILED");
  assert.equal(production.recorded.length, 0);
});

test("snapshots contain no provider object", async () => {
  const snapshot = await setup().controller.run();
  assert.doesNotMatch(JSON.stringify(snapshot), /"provider"\s*:|"request"\s*:|"connector"\s*:|"adapter"\s*:|function/i);
});
