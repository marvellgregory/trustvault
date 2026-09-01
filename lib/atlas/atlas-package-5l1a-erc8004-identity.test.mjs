import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { registerHooks } from "node:module";
import test from "node:test";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (
      specifier.startsWith("./")
      && !specifier.endsWith(".ts")
      && context.parentURL?.includes("/lib/atlas/")
    ) {
      return nextResolve(
        `${specifier.endsWith(".js") ? specifier.slice(0, -3) : specifier}.ts`,
        context,
      );
    }
    return nextResolve(specifier, context);
  },
});

const { ARC_TESTNET_CHAIN_ID } = await import("../arc/arc-testnet-assets.ts");
const {
  ATLAS_AGENT_CAPABILITIES,
  ATLAS_IDENTITY_AUTHORITY,
  createAtlasAgentIdentity,
  createAtlasErc8004RegistrationMetadata,
  verifyAtlasAgentIdentity,
} = await import("./atlas-agent-identity.ts");
const {
  ATLAS_ERC8004_EXPECTED_CHAIN_ID,
  ATLAS_ERC8004_IDENTITY_REGISTRY_ABI,
} = await import("./atlas-erc8004-contract.ts");
const { getAtlasCapabilityPolicy } = await import("./atlas-guardrail-policy.ts");
const { getAtlasWalletAuthorityPolicy } = await import("./atlas-wallet-authority-policy.ts");

const registryAddress = "0x1111111111111111111111111111111111111111";
const ownerAddress = "0x2222222222222222222222222222222222222222";
const agentURI = "https://trustvault.example/atlas-registration.json";

const configuration = Object.freeze({
  expectedChainId: ARC_TESTNET_CHAIN_ID,
  registryAddress,
  agentId: "42",
  agentURI,
});

function evidence(overrides = {}) {
  return {
    authority: "TRUSTED_READ_ONLY_REGISTRY_EVIDENCE",
    chainId: ARC_TESTNET_CHAIN_ID,
    registryAddress,
    agentId: "42",
    agentURI,
    ownerAddress,
    registrationExists: true,
    consistent: true,
    ...overrides,
  };
}

test("5L.1A metadata is deterministic and ERC-8004 registration-shaped", () => {
  const first = createAtlasErc8004RegistrationMetadata(configuration);
  const second = createAtlasErc8004RegistrationMetadata(configuration);

  assert.deepEqual(first, second);
  assert.equal(first.type, "https://eips.ethereum.org/EIPS/eip-8004#registration-v1");
  assert.equal(first.name, "Atlas");
  assert.equal(first.x402Support, false);
  assert.deepEqual(first.registrations, [{
    agentId: "42",
    agentRegistry: `eip155:${ARC_TESTNET_CHAIN_ID}:${registryAddress}`,
  }]);
  assert.equal(Object.isFrozen(first), true);
  assert.equal(Object.isFrozen(first.registrations), true);
});

test("5L.1A metadata declares only existing public-safe capabilities", () => {
  assert.deepEqual(ATLAS_AGENT_CAPABILITIES, [
    "TrustVault product guidance",
    "Intent resolution",
    "Contextual reasoning",
    "Bounded conversation memory",
    "Deterministic TrustVault knowledge retrieval",
    "Guided Bill Split workflow",
    "Guided Gift Vault workflow",
    "Marketplace concierge guidance",
    "Transaction preparation and review guidance",
    "Infrastructure diagnostics",
  ]);

  const serialized = JSON.stringify(createAtlasErc8004RegistrationMetadata());
  for (const forbidden of [
    "customerId",
    "sessionId",
    "conversationId",
    "email",
    "password",
    "otp",
    "authToken",
    "privateKey",
    "seedPhrase",
  ]) {
    assert.equal(serialized.includes(forbidden), false, `metadata contains ${forbidden}`);
  }
});

test("5L.1A uses the canonical Arc Testnet chain ID without a registry default", () => {
  assert.equal(ATLAS_ERC8004_EXPECTED_CHAIN_ID, ARC_TESTNET_CHAIN_ID);

  const identity = createAtlasAgentIdentity();
  assert.equal(identity.chainId, ARC_TESTNET_CHAIN_ID);
  assert.equal(identity.registryAddress, null);
  assert.equal(identity.agentId, null);
  assert.equal(identity.agentURI, null);
  assert.equal(identity.status, "UNCONFIGURED");
});

test("5L.1A unconfigured identity and missing evidence never verify", () => {
  const unconfigured = verifyAtlasAgentIdentity({});
  assert.equal(unconfigured.verified, false);
  assert.equal(unconfigured.status, "UNCONFIGURED");
  assert.deepEqual(unconfigured.reasons, ["IDENTITY_CONFIGURATION_REQUIRED"]);

  const missingEvidence = verifyAtlasAgentIdentity(configuration);
  assert.equal(missingEvidence.verified, false);
  assert.equal(missingEvidence.status, "VERIFIABLE");
  assert.deepEqual(missingEvidence.reasons, ["TRUSTED_REGISTRY_EVIDENCE_REQUIRED"]);
});

test("5L.1A valid trusted registry evidence resolves VERIFIED", () => {
  const result = verifyAtlasAgentIdentity(configuration, evidence());
  assert.equal(result.verified, true);
  assert.equal(result.status, "VERIFIED");
  assert.equal(result.identity.status, "VERIFIED");
  assert.deepEqual(result.reasons, []);
  assert.equal(result.evidenceAuthority, "READ_ONLY_IDENTITY_EVIDENCE");
});

for (const [label, override, expectedReason] of [
  ["wrong chain ID", { chainId: 1 }, "CHAIN_ID_MISMATCH"],
  [
    "wrong registry address",
    { registryAddress: "0x3333333333333333333333333333333333333333" },
    "REGISTRY_ADDRESS_MISMATCH",
  ],
  ["malformed registry address", { registryAddress: "0x1234" }, "REGISTRY_ADDRESS_MISMATCH"],
  ["wrong agent ID", { agentId: "43" }, "AGENT_ID_MISMATCH"],
  ["wrong agent URI", { agentURI: "ipfs://different" }, "AGENT_URI_MISMATCH"],
  ["missing registration", { registrationExists: false }, "REGISTRATION_NOT_FOUND"],
  ["contradictory evidence", { consistent: false }, "EVIDENCE_CONTRADICTORY"],
  ["malformed owner", { ownerAddress: "not-an-address" }, "OWNER_ADDRESS_INVALID"],
]) {
  test(`5L.1A ${label} fails closed`, () => {
    const result = verifyAtlasAgentIdentity(configuration, evidence(override));
    assert.equal(result.verified, false);
    assert.equal(result.status, "INVALID");
    assert.ok(result.reasons.includes(expectedReason));
  });
}

test("5L.1A malformed configuration fails closed", () => {
  const malformedAddress = verifyAtlasAgentIdentity({
    ...configuration,
    registryAddress: "0x1234",
  }, evidence());
  assert.equal(malformedAddress.status, "INVALID");
  assert.ok(malformedAddress.reasons.includes("REGISTRY_ADDRESS_INVALID"));

  const malformedAgentId = verifyAtlasAgentIdentity({
    ...configuration,
    agentId: "4.2",
  }, evidence());
  assert.equal(malformedAgentId.status, "INVALID");
  assert.ok(malformedAgentId.reasons.includes("AGENT_ID_INVALID"));
});

test("5L.1A an identity identifier never grants customer-wallet authority", () => {
  const verified = verifyAtlasAgentIdentity(configuration, evidence());

  assert.equal(verified.identity.authority, ATLAS_IDENTITY_AUTHORITY);
  assert.deepEqual(verified.identity.authority, {
    scope: "IDENTITY_EVIDENCE_ONLY",
    customerSigningAuthority: "NONE",
    customerFundAuthority: "NONE",
    walletConfirmationBoundary: "REQUIRED",
    holdsCustomerSecrets: false,
    holdsCustomerWalletCredentials: false,
    holdsCustomerRecoveryPhrases: false,
    canAutonomouslySign: false,
    canAutonomouslyMoveCustomerFunds: false,
    canBypassWalletConfirmation: false,
    erc8004GrantsCustomerWalletAuthority: false,
    registrationControl: "EXTERNAL_EXPLICIT_APPROVAL_REQUIRED",
  });
});

test("5L.1A identity verification is deterministic", () => {
  const first = verifyAtlasAgentIdentity(configuration, evidence());
  const second = verifyAtlasAgentIdentity(configuration, evidence());
  assert.deepEqual(first, second);
});

test("5L.1A preserves existing wallet and guardrail execution boundaries", () => {
  for (const action of [
    "possess-wallet-provider",
    "possess-signing-account",
    "access-wallet-secret",
    "sign-wallet-operation",
    "broadcast-wallet-operation",
    "autonomous-fund-movement",
  ]) {
    assert.equal(getAtlasWalletAuthorityPolicy(action).decision, "FORBIDDEN");
  }
  assert.equal(getAtlasCapabilityPolicy("wallet-signing").decision, "DENY");
  assert.equal(getAtlasCapabilityPolicy("autonomous-transaction").decision, "DENY");
  assert.equal(getAtlasCapabilityPolicy("secret-handling").decision, "DENY");
});

test("5L.1A contract representation is minimal and inert", () => {
  assert.deepEqual(
    ATLAS_ERC8004_IDENTITY_REGISTRY_ABI.map((entry) => entry.name),
    ["ownerOf", "tokenURI", "getMetadata", "register", "Registered"],
  );
  assert.equal(
    ATLAS_ERC8004_IDENTITY_REGISTRY_ABI.some((entry) =>
      ["giveFeedback", "requestValidation"].includes(entry.name)),
    false,
  );
});

test("5L.1A production files contain no wallet, provider, execution, or secret runtime", async () => {
  const files = [
    new URL("./atlas-agent-identity.ts", import.meta.url),
    new URL("./atlas-erc8004-contract.ts", import.meta.url),
  ];
  const source = (await Promise.all(files.map((file) => readFile(file, "utf8")))).join("\n");

  for (const forbidden of [
    /@\/lib\/wallet/i,
    /@\/lib\/app-kit/i,
    /@circle-fin/i,
    /\bwagmi\b/i,
    /\bprovider\b/i,
    /\bwalletClient\b/,
    /\bprivateKey\b/,
    /\bseedPhrase\b/,
    /\bmnemonic\b/i,
    /\bwriteContract\b/,
    /\bsendTransaction\b/,
    /eth_sendTransaction/i,
    /personal_sign/i,
    /eth_sign(?:TypedData)?/i,
    /\bfetch\s*\(/,
    /\brequest\s*\(/,
    /\bdeploy(?:ment)?\s*\(/i,
  ]) {
    assert.equal(forbidden.test(source), false, `production source matched ${forbidden}`);
  }
});
