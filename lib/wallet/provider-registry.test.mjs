import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (
      specifier.startsWith("./") &&
      specifier.endsWith(".js") &&
      context.parentURL?.includes("/lib/wallet/")
    ) {
      return nextResolve(`${specifier.slice(0, -3)}.ts`, context);
    }
    return nextResolve(specifier, context);
  },
});

const { createWalletProviderRegistry } = await import("./provider-registry.ts");
const {
  createSerializableProviderIdentity,
  normalizeProviderMetadata,
} = await import("./provider-identity.ts");
const { createLegacyProviderRecord, evaluateLegacyFallback } = await import(
  "./legacy-provider.ts"
);

const UUID_A = "11111111-1111-4111-8111-111111111111";
const UUID_B = "22222222-2222-4222-8222-222222222222";

function provider() {
  return { request: async () => undefined };
}

function detail(uuid, walletProvider, overrides = {}) {
  return {
    info: {
      uuid,
      rdns: "com.example.wallet",
      name: "Example Wallet",
      icon: "data:image/png;base64,AA==",
      ...overrides,
    },
    provider: walletProvider,
  };
}

function announcement(value) {
  const event = new Event("eip6963:announceProvider");
  Object.defineProperty(event, "detail", { value });
  return event;
}

function setup() {
  const transport = new EventTarget();
  let clock = 0;
  const registry = createWalletProviderRegistry({
    transport,
    now: () => ++clock,
  });
  return { registry, transport };
}

test("starts empty and has an explicit lifecycle", () => {
  const { registry } = setup();
  assert.deepEqual(registry.getSnapshot(), {
    lifecycle: "idle",
    providers: [],
  });
  registry.start();
  assert.equal(registry.getSnapshot().lifecycle, "active");
  registry.stop();
  assert.equal(registry.getSnapshot().lifecycle, "idle");
});

test("dispatches discovery only when explicitly requested while active", () => {
  const { registry, transport } = setup();
  let requests = 0;
  transport.addEventListener("eip6963:requestProvider", () => requests++);
  assert.throws(() => registry.requestAnnouncements(), /Start/);
  registry.start();
  assert.equal(requests, 0);
  registry.requestAnnouncements();
  assert.equal(requests, 1);
});

test("accepts valid announcements and ignores them after stop", () => {
  const { registry, transport } = setup();
  registry.start();
  transport.dispatchEvent(announcement(detail(UUID_A, provider())));
  assert.equal(registry.getSnapshot().providers.length, 1);
  registry.stop();
  transport.dispatchEvent(announcement(detail(UUID_B, provider())));
  assert.equal(registry.getSnapshot().providers.length, 1);
});

test("refreshes repeated announcements without duplicating providers", () => {
  const { registry, transport } = setup();
  const walletProvider = provider();
  registry.start();
  transport.dispatchEvent(announcement(detail(UUID_A, walletProvider)));
  transport.dispatchEvent(
    announcement(detail(UUID_A, walletProvider, { name: "Updated Wallet" })),
  );
  const snapshot = registry.getSnapshot();
  assert.equal(snapshot.providers.length, 1);
  assert.equal(snapshot.providers[0].identity.name, "Updated Wallet");
  assert.ok(snapshot.providers[0].lastSeenAt > snapshot.providers[0].announcedAt);
});

test("marks the same UUID with a different provider as conflicted", () => {
  const { registry, transport } = setup();
  registry.start();
  transport.dispatchEvent(announcement(detail(UUID_A, provider())));
  transport.dispatchEvent(announcement(detail(UUID_A, provider())));
  const record = registry.getSnapshot().providers[0];
  assert.equal(record.state, "conflicted");
  assert.equal(record.conflicts.length, 1);
  assert.throws(() => registry.select(record.identity.registryId), /conflicting/);
  assert.equal(registry.getSelected(), null);
});

test("represents different UUIDs for one provider as aliases", () => {
  const { registry, transport } = setup();
  const walletProvider = provider();
  registry.start();
  transport.dispatchEvent(announcement(detail(UUID_A, walletProvider)));
  transport.dispatchEvent(
    announcement(detail(UUID_B, walletProvider, { rdns: "com.example.alias" })),
  );
  const snapshot = registry.getSnapshot();
  assert.equal(snapshot.providers.length, 1);
  assert.equal(snapshot.providers[0].aliases.length, 1);
  assert.equal(snapshot.providers[0].aliases[0].uuid, UUID_B);
});

test("keeps accepting late announcements while active", async () => {
  const { registry, transport } = setup();
  registry.start();
  await Promise.resolve();
  transport.dispatchEvent(announcement(detail(UUID_A, provider())));
  assert.equal(registry.getSnapshot().providers.length, 1);
});

test("requires explicit selection and supports clearing it", () => {
  const { registry, transport } = setup();
  registry.start();
  transport.dispatchEvent(announcement(detail(UUID_A, provider())));
  const id = registry.getSnapshot().providers[0].identity.registryId;
  assert.equal(registry.getSelected(), null);
  assert.equal(registry.select(id).identity.registryId, id);
  assert.equal(registry.getSelected().identity.registryId, id);
  registry.clearSelection();
  assert.equal(registry.getSelected(), null);
});

test("notifies subscribers and honors unsubscribe", () => {
  const { registry, transport } = setup();
  let notifications = 0;
  const unsubscribe = registry.subscribe(() => notifications++);
  registry.start();
  transport.dispatchEvent(announcement(detail(UUID_A, provider())));
  assert.equal(notifications, 2);
  unsubscribe();
  registry.clearSelection();
  registry.stop();
  assert.equal(notifications, 2);
});

test("stop is idempotent and removes exactly the active listener", () => {
  const { registry, transport } = setup();
  registry.start();
  registry.start();
  registry.stop();
  registry.stop();
  transport.dispatchEvent(announcement(detail(UUID_A, provider())));
  assert.equal(registry.getSnapshot().providers.length, 0);
});

test("sanitizes metadata and rejects invalid announcements", () => {
  const normalized = normalizeProviderMetadata({
    uuid: UUID_A.toUpperCase(),
    rdns: " COM.Example.Wallet. ",
    name: " <Example>\u0000   Wallet ",
    icon: "javascript:alert(1)",
  });
  assert.equal(normalized.uuid, UUID_A);
  assert.equal(normalized.rdns, "com.example.wallet");
  assert.equal(normalized.name, "Example Wallet");
  assert.equal(normalized.icon, "");

  const { registry, transport } = setup();
  registry.start();
  transport.dispatchEvent(
    announcement(detail("not-a-uuid", provider(), { rdns: "invalid" })),
  );
  assert.equal(registry.getSnapshot().providers.length, 0);
});

test("keeps provider objects out of serializable identities", () => {
  const info = normalizeProviderMetadata(detail(UUID_A, provider()).info);
  const identity = createSerializableProviderIdentity(info);
  assert.equal("provider" in identity, false);
  assert.doesNotThrow(() => JSON.stringify(identity));

  const legacy = createLegacyProviderRecord({
    provider: provider(),
    registryId: "session-one",
    now: 1,
  });
  assert.equal(legacy.identity.name, "Legacy injected wallet");
  assert.equal(legacy.identity.source, "legacy");
  assert.equal("provider" in legacy.identity, false);
  assert.equal("qualifiedForTrustVault" in legacy.identity, false);
});

test("allows legacy fallback only for one unambiguous provider", () => {
  const one = provider();
  assert.deepEqual(
    evaluateLegacyFallback({
      usableEip6963ProviderCount: 0,
      legacyProviders: [one],
    }),
    { eligible: true, reason: "eligible" },
  );
  assert.equal(
    evaluateLegacyFallback({
      usableEip6963ProviderCount: 1,
      legacyProviders: [one],
    }).eligible,
    false,
  );
  assert.equal(
    evaluateLegacyFallback({
      usableEip6963ProviderCount: 0,
      legacyProviders: [one, provider()],
    }).reason,
    "ambiguous-legacy-providers",
  );
});
