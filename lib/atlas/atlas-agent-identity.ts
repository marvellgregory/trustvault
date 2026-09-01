import {
  ATLAS_ERC8004_EXPECTED_CHAIN_ID,
  type AtlasErc8004Configuration,
  type AtlasErc8004RegistryAddress,
  type AtlasErc8004RegistryEvidence,
} from "./atlas-erc8004-contract";

export const ATLAS_AGENT_IDENTITY_STATUSES = Object.freeze([
  "UNCONFIGURED",
  "CONFIGURED",
  "VERIFIABLE",
  "VERIFIED",
  "INVALID",
] as const);

export type AtlasAgentIdentityStatus =
  (typeof ATLAS_AGENT_IDENTITY_STATUSES)[number];

export const ATLAS_AGENT_CAPABILITIES = Object.freeze([
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
] as const);

export const ATLAS_IDENTITY_AUTHORITY = Object.freeze({
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
} as const);

export type AtlasAgentIdentity = Readonly<{
  name: "Atlas";
  product: "TrustVault";
  identityStandard: "ERC-8004";
  networkTarget: "Arc Testnet";
  chainId: number;
  registryAddress: AtlasErc8004RegistryAddress | null;
  agentId: string | null;
  agentURI: string | null;
  status: AtlasAgentIdentityStatus;
  capabilities: typeof ATLAS_AGENT_CAPABILITIES;
  authority: typeof ATLAS_IDENTITY_AUTHORITY;
}>;

export type AtlasErc8004RegistrationMetadata = Readonly<{
  type: "https://eips.ethereum.org/EIPS/eip-8004#registration-v1";
  name: "Atlas";
  description: string;
  services: readonly never[];
  x402Support: false;
  active: true;
  registrations: readonly Readonly<{
    agentId: string;
    agentRegistry: string;
  }>[];
  capabilities: typeof ATLAS_AGENT_CAPABILITIES;
  authority: typeof ATLAS_IDENTITY_AUTHORITY;
}>;

export type AtlasIdentityVerificationReason =
  | "IDENTITY_CONFIGURATION_REQUIRED"
  | "IDENTITY_CONFIGURATION_INCOMPLETE"
  | "EXPECTED_CHAIN_INVALID"
  | "REGISTRY_ADDRESS_INVALID"
  | "AGENT_ID_INVALID"
  | "AGENT_URI_INVALID"
  | "TRUSTED_REGISTRY_EVIDENCE_REQUIRED"
  | "EVIDENCE_AUTHORITY_INVALID"
  | "EVIDENCE_CONTRADICTORY"
  | "REGISTRATION_NOT_FOUND"
  | "OWNER_ADDRESS_INVALID"
  | "CHAIN_ID_MISMATCH"
  | "REGISTRY_ADDRESS_MISMATCH"
  | "AGENT_ID_MISMATCH"
  | "AGENT_URI_MISMATCH";

export type AtlasAgentIdentityVerification = Readonly<{
  identity: AtlasAgentIdentity;
  status: AtlasAgentIdentityStatus;
  verified: boolean;
  evidenceAuthority: "READ_ONLY_IDENTITY_EVIDENCE";
  reasons: readonly AtlasIdentityVerificationReason[];
}>;

const ZERO_ADDRESS = `0x${"0".repeat(40)}`;
const ADDRESS_PATTERN = /^0x[0-9a-fA-F]{40}$/;
const AGENT_ID_PATTERN = /^(0|[1-9][0-9]*)$/;
const AGENT_URI_PATTERN = /^(https:\/\/|ipfs:\/\/|data:application\/json;base64,).+/;

function normalizeConfiguration(
  configuration: AtlasErc8004Configuration,
) {
  return {
    expectedChainId:
      configuration.expectedChainId ?? ATLAS_ERC8004_EXPECTED_CHAIN_ID,
    registryAddress: configuration.registryAddress?.trim() ?? null,
    agentId: configuration.agentId?.trim() ?? null,
    agentURI: configuration.agentURI?.trim() ?? null,
  };
}

function isValidAddress(value: string | null): value is AtlasErc8004RegistryAddress {
  return value !== null
    && ADDRESS_PATTERN.test(value)
    && value.toLowerCase() !== ZERO_ADDRESS;
}

function isValidAgentId(value: string | null): value is string {
  return value !== null && AGENT_ID_PATTERN.test(value);
}

function isValidAgentURI(value: string | null): value is string {
  return value !== null
    && !/\s/.test(value)
    && AGENT_URI_PATTERN.test(value);
}

function configurationReasons(
  configuration: ReturnType<typeof normalizeConfiguration>,
): AtlasIdentityVerificationReason[] {
  const reasons: AtlasIdentityVerificationReason[] = [];

  if (
    !Number.isSafeInteger(configuration.expectedChainId)
    || configuration.expectedChainId !== ATLAS_ERC8004_EXPECTED_CHAIN_ID
  ) {
    reasons.push("EXPECTED_CHAIN_INVALID");
  }

  if (configuration.registryAddress !== null && !isValidAddress(configuration.registryAddress)) {
    reasons.push("REGISTRY_ADDRESS_INVALID");
  }

  if (configuration.agentId !== null && !isValidAgentId(configuration.agentId)) {
    reasons.push("AGENT_ID_INVALID");
  }

  if (configuration.agentURI !== null && !isValidAgentURI(configuration.agentURI)) {
    reasons.push("AGENT_URI_INVALID");
  }

  return reasons;
}

function configurationStatus(
  configuration: ReturnType<typeof normalizeConfiguration>,
): AtlasAgentIdentityStatus {
  if (configurationReasons(configuration).length > 0) return "INVALID";

  const configuredCount = [
    configuration.registryAddress,
    configuration.agentId,
    configuration.agentURI,
  ].filter((value) => value !== null).length;

  if (configuredCount === 0) return "UNCONFIGURED";
  if (configuredCount < 3) return "CONFIGURED";
  return "VERIFIABLE";
}

function identityWithStatus(
  configuration: ReturnType<typeof normalizeConfiguration>,
  status: AtlasAgentIdentityStatus,
): AtlasAgentIdentity {
  return Object.freeze({
    name: "Atlas",
    product: "TrustVault",
    identityStandard: "ERC-8004",
    networkTarget: "Arc Testnet",
    chainId: configuration.expectedChainId,
    registryAddress: isValidAddress(configuration.registryAddress)
      ? configuration.registryAddress.toLowerCase() as AtlasErc8004RegistryAddress
      : null,
    agentId: isValidAgentId(configuration.agentId) ? configuration.agentId : null,
    agentURI: isValidAgentURI(configuration.agentURI) ? configuration.agentURI : null,
    status,
    capabilities: ATLAS_AGENT_CAPABILITIES,
    authority: ATLAS_IDENTITY_AUTHORITY,
  });
}

export function createAtlasAgentIdentity(
  configuration: AtlasErc8004Configuration = {},
): AtlasAgentIdentity {
  const normalized = normalizeConfiguration(configuration);
  return identityWithStatus(normalized, configurationStatus(normalized));
}

export function createAtlasErc8004RegistrationMetadata(
  configuration: AtlasErc8004Configuration = {},
): AtlasErc8004RegistrationMetadata {
  const identity = createAtlasAgentIdentity(configuration);
  const registrations = identity.status === "VERIFIABLE"
    && identity.registryAddress
    && identity.agentId
    && identity.agentURI
    ? Object.freeze([Object.freeze({
        agentId: identity.agentId,
        agentRegistry: `eip155:${identity.chainId}:${identity.registryAddress}`,
      })])
    : Object.freeze([]);

  return Object.freeze({
    type: "https://eips.ethereum.org/EIPS/eip-8004#registration-v1",
    name: "Atlas",
    description:
      "TrustVault's deterministic guidance agent for product support, knowledge retrieval, safe guided workflows, transaction review, and infrastructure diagnostics.",
    services: Object.freeze([]),
    x402Support: false,
    active: true,
    registrations,
    capabilities: ATLAS_AGENT_CAPABILITIES,
    authority: ATLAS_IDENTITY_AUTHORITY,
  });
}

export function verifyAtlasAgentIdentity(
  configuration: AtlasErc8004Configuration,
  evidence?: AtlasErc8004RegistryEvidence | null,
): AtlasAgentIdentityVerification {
  const normalized = normalizeConfiguration(configuration);
  const initialStatus = configurationStatus(normalized);
  const reasons = configurationReasons(normalized);

  if (initialStatus === "UNCONFIGURED") {
    reasons.push("IDENTITY_CONFIGURATION_REQUIRED");
  } else if (initialStatus === "CONFIGURED") {
    reasons.push("IDENTITY_CONFIGURATION_INCOMPLETE");
  }

  if (initialStatus !== "VERIFIABLE") {
    const status = reasons.some((reason) => reason.endsWith("INVALID"))
      ? "INVALID"
      : initialStatus;
    return Object.freeze({
      identity: identityWithStatus(normalized, status),
      status,
      verified: false,
      evidenceAuthority: "READ_ONLY_IDENTITY_EVIDENCE",
      reasons: Object.freeze(reasons),
    });
  }

  if (!evidence) {
    reasons.push("TRUSTED_REGISTRY_EVIDENCE_REQUIRED");
  } else {
    if (evidence.authority !== "TRUSTED_READ_ONLY_REGISTRY_EVIDENCE") {
      reasons.push("EVIDENCE_AUTHORITY_INVALID");
    }
    if (!evidence.consistent) reasons.push("EVIDENCE_CONTRADICTORY");
    if (!evidence.registrationExists) reasons.push("REGISTRATION_NOT_FOUND");
    if (!isValidAddress(evidence.ownerAddress)) reasons.push("OWNER_ADDRESS_INVALID");
    if (evidence.chainId !== normalized.expectedChainId) reasons.push("CHAIN_ID_MISMATCH");
    if (
      !isValidAddress(evidence.registryAddress)
      || evidence.registryAddress.toLowerCase() !== normalized.registryAddress?.toLowerCase()
    ) {
      reasons.push("REGISTRY_ADDRESS_MISMATCH");
    }
    if (evidence.agentId !== normalized.agentId) reasons.push("AGENT_ID_MISMATCH");
    if (evidence.agentURI !== normalized.agentURI) reasons.push("AGENT_URI_MISMATCH");
  }

  const verified = reasons.length === 0;
  const status = verified ? "VERIFIED" : evidence ? "INVALID" : "VERIFIABLE";

  return Object.freeze({
    identity: identityWithStatus(normalized, status),
    status,
    verified,
    evidenceAuthority: "READ_ONLY_IDENTITY_EVIDENCE",
    reasons: Object.freeze(reasons),
  });
}
