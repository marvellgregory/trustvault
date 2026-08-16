import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";

registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) return nextResolve(new URL(`../../${specifier.slice(2)}.ts`, import.meta.url).href, context);
  return nextResolve(specifier, context);
} });

const qualification = await import("./wallet-qualification.ts");
const catalogue = await import("./candidate-wallet-catalogue.ts");
const ACCOUNT = "0x1111111111111111111111111111111111111111";
const ARC = 5042002;
const provider = { request: async () => [ACCOUNT] };
const record = (source = provider, overrides = {}) => ({ identity: { registryId: "eip6963:wallet", source: "eip6963", uuid: "wallet", rdns: "example.wallet", name: "Unknown Wallet" }, provider: source, aliases: [], state: "available", announcedAt: 1, lastSeenAt: 1, conflicts: [], ...overrides });
const circle = (source = provider) => ({ evidence: { status: "CIRCLE_READY", providerIdentityKey: "eip6963:wallet", account: ACCOUNT, chainId: ARC, bindingGeneration: "circle-1", exactProviderVerified: true }, provider: source, revalidate: async () => ({ verifiedProvider: source, activeWagmiProvider: source }) });
const evidence = { status: "QUALIFIED", providerIdentityKey: "eip6963:wallet", qualificationGeneration: "q1", evaluatedAt: "2026-01-01T00:00:00.000Z", reasons: [] };
const valid = (overrides = {}) => ({ registryActive: true, selectedRecord: record(), selectedRegistryId: "eip6963:wallet", selectionExplicit: true, expectedProvider: provider, activeWagmiProvider: provider, verifiedAccount: ACCOUNT, activeAccount: ACCOUNT, identityVerified: true, activeChainId: ARC, requiredChainId: ARC, circleBinding: circle(), circleAccountPreflightValid: true, qualification: evidence, currentQualificationGeneration: "q1", ...overrides });

test("detected and Available do not imply qualified or transaction ready", () => {
  assert.equal(qualification.deriveTransactionReadiness(valid({ identityVerified: false, qualification: null })).status, "QUALIFICATION_PENDING");
  assert.equal(qualification.deriveTransactionReadiness(valid({ qualification: null })).status, "TEST_REQUIRED");
});

test("exact verified provider becomes ready only with every prerequisite", () => {
  assert.equal(qualification.deriveTransactionReadiness(valid()).status, "TRANSACTION_READY");
});

test("identity, Circle, conflict, account, chain, selection, provider and generation changes fail closed", () => {
  const other = { request: provider.request };
  const cases = [
    valid({ identityVerified: false }),
    valid({ circleBinding: { evidence: { status: "CIRCLE_UNBOUND", exactProviderVerified: false } } }),
    valid({ selectedRecord: record(provider, { state: "conflicted", conflicts: [{ type: "uuid-provider-mismatch", uuid: "wallet", detectedAt: 1 }] }) }),
    valid({ activeAccount: "0x2222222222222222222222222222222222222222" }),
    valid({ activeChainId: 1 }),
    valid({ selectedRegistryId: "eip6963:other" }),
    valid({ activeWagmiProvider: other }),
    valid({ expectedProvider: other }),
    valid({ currentQualificationGeneration: "q2" }),
    valid({ registryActive: false }),
  ];
  assert.ok(cases.every((input) => qualification.deriveTransactionReadiness(input).status !== "TRANSACTION_READY"));
});

test("same account in different providers does not cross-qualify", () => {
  const other = { request: async () => [ACCOUNT] };
  assert.equal(qualification.deriveTransactionReadiness(valid({ activeWagmiProvider: other })).status, "INVALIDATED");
});

test("unknown providers participate but still require explicit qualification", () => {
  assert.equal(qualification.deriveTransactionReadiness(valid({ qualification: null })).status, "TEST_REQUIRED");
});

test("candidate metadata is informational and does not contain qualification authority", () => {
  assert.equal(catalogue.CANDIDATE_WALLET_CATALOGUE.length, 6);
  assert.ok(catalogue.CANDIDATE_WALLET_CATALOGUE.every((item) => item.testingStatus === "UNTESTED"));
  assert.equal(catalogue.isCandidateDetectedByDisplayName(catalogue.CANDIDATE_WALLET_CATALOGUE[0], []), false);
});

test("snapshot never restores trusted transaction readiness", () => {
  const snapshot = qualification.createSerializableReadinessSnapshot(qualification.deriveTransactionReadiness(valid()));
  assert.equal(snapshot.status, "QUALIFICATION_PENDING");
  assert.doesNotMatch(JSON.stringify(snapshot), /"provider"\s*:|"adapter"\s*:|"connector"\s*:|"registry"\s*:|function|"request"\s*:/i);
});

test("Circle account preflight uses exact provider without authorization request", async () => {
  assert.equal(await qualification.verifyCircleAccountPreflight(circle(), ACCOUNT), true);
  const other = { request: async () => [ACCOUNT] };
  assert.equal(await qualification.verifyCircleAccountPreflight({ ...circle(), provider: other }, ACCOUNT), false);
});
