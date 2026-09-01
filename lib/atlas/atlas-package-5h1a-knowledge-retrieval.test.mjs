import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
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
  TRUSTVAULT_KNOWLEDGE_INDEX,
  searchTrustVaultKnowledge,
  searchTrustVaultKnowledgeTool,
} = await import("./index.ts");

const expectedPrimaryRecords = [
  ["When can I use Trust Wallet?", "wallet-availability"],
  ["How does Gift Vault work?", "gift-vault-guide"],
  ["Where is my tracking number or AWB?", "marketplace-delivery-tracking"],
  ["How do I verify a transaction hash?", "receipts-arcscan"],
  ["Is Swap available?", "swap-coming-soon"],
  ["Where are the release notes?", "release-notes"],
];

test("5H.1A ranks exact and high-quality TrustVault phrases first", () => {
  for (const [query, expectedId] of expectedPrimaryRecords) {
    const result = searchTrustVaultKnowledge(query);
    assert.equal(result.records[0]?.id, expectedId, query);
    assert.equal(result.resultMetadata[0]?.sourceId, expectedId, query);
    assert.ok(result.resultMetadata[0]?.score > 0, query);
    assert.equal(result.groundingLevel, "VERIFIED", query);
  }
});

test("5H.1A preserves every existing TrustVault knowledge record", () => {
  for (const record of TRUSTVAULT_KNOWLEDGE_INDEX) {
    const result = searchTrustVaultKnowledge(record.title);
    assert.equal(result.records[0]?.id, record.id, record.title);
    assert.equal(result.evidence[0]?.sourceId, record.id, record.title);
  }
});

test("5H.1A returns no evidence for a wholly unsupported query", () => {
  const result = searchTrustVaultKnowledge("quasar penguin xenolith");
  assert.equal(result.groundingLevel, "UNAVAILABLE");
  assert.deepEqual(result.records, []);
  assert.deepEqual(result.evidence, []);
  assert.deepEqual(result.resultMetadata, []);
});

test("5H.1A suppresses noisy queries with only incidental weak overlap", () => {
  const result = searchTrustVaultKnowledge(
    "Explain wallet migration for quasar penguin astronomy",
  );
  assert.equal(result.groundingLevel, "UNAVAILABLE");
  assert.deepEqual(result.records, []);
  assert.deepEqual(result.evidence, []);
});

test("5H.1A produces deterministic ordering", () => {
  const query = "wallet Arc Testnet transaction verification";
  const expected = searchTrustVaultKnowledge(query).records.map(({ id }) => id);

  for (let iteration = 0; iteration < 20; iteration += 1) {
    assert.deepEqual(
      searchTrustVaultKnowledge(query).records.map(({ id }) => id),
      expected,
    );
  }
});

test("5H.1A enforces the result limit", () => {
  const result = searchTrustVaultKnowledge(
    "wallet Arc Testnet transaction verification",
    2,
  );
  assert.equal(result.records.length, 2);
  assert.equal(result.evidence.length, 2);
  assert.equal(result.resultMetadata.length, 2);
  assert.deepEqual(searchTrustVaultKnowledge("Arc Testnet", 0).records, []);
});

test("5H.1A evidence corresponds exactly to returned knowledge records", () => {
  const result = searchTrustVaultKnowledge("Gift Vault receipt Arc Testnet");
  assert.deepEqual(
    result.evidence,
    result.records.map((record) => ({
      sourceId: record.id,
      sourceTitle: record.title,
      sourceRoute: record.route,
      sourceType: record.sourceType,
      excerpt: record.summary,
    })),
  );
});

test("5H.1A preserves Arc Testnet and wallet availability knowledge", () => {
  const network = searchTrustVaultKnowledge("Which network uses Arc Testnet?");
  const wallet = searchTrustVaultKnowledge("Which wallets are supported?");

  assert.equal(network.records[0]?.id, "arc-testnet-network");
  assert.equal(network.groundingLevel, "VERIFIED");
  assert.equal(wallet.records[0]?.id, "wallet-availability");
  assert.equal(wallet.groundingLevel, "VERIFIED");
  assert.ok(wallet.evidence[0]?.excerpt.includes("Trust Wallet"));
});

test("5H.1A retrieval remains local, read-only, and wallet-independent", async () => {
  assert.equal(searchTrustVaultKnowledgeTool.readOnly, true);
  assert.equal(searchTrustVaultKnowledgeTool.requiresAuthentication, false);
  assert.equal(searchTrustVaultKnowledgeTool.requiresWallet, false);
  assert.equal(searchTrustVaultKnowledgeTool.riskLevel, "read");

  const source = await readFile(new URL("./atlas-knowledge.ts", import.meta.url), "utf8");
  const importSpecifiers = [...source.matchAll(/from\s+["']([^"']+)["']/g)].map(
    ([, specifier]) => specifier,
  );
  assert.deepEqual(importSpecifiers.sort(), ["./atlas-grounding", "./atlas-types.js"]);
  assert.equal(
    importSpecifiers.some((specifier) =>
      /wallet|provider|app-kit|circle|transaction-execution/i.test(specifier),
    ),
    false,
  );
});
