import type {
  TrustVaultAuthChallengeRequest,
  TrustVaultAuthChallengeResponse,
  TrustVaultAuthVerificationRequest,
  TrustVaultAuthVerificationResponse,
} from "@/lib/aws/auth-types";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_TRUSTVAULT_API_BASE_URL?.replace(/\/$/, "");

const EVM_ADDRESS_PATTERN = /^0x[a-fA-F0-9]{40}$/;
const HEX_SIGNATURE_PATTERN = /^0x(?:[a-fA-F0-9]{2})+$/;

function requireApiBaseUrl() {
  if (!API_BASE_URL) {
    throw new Error("TrustVault API is not configured.");
  }

  return API_BASE_URL;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isTimestamp(value: unknown): value is string {
  return isNonEmptyString(value) && Number.isFinite(Date.parse(value));
}

function isWalletAddress(value: unknown): value is string {
  return typeof value === "string" && EVM_ADDRESS_PATTERN.test(value);
}

function parseChallengeResponse(
  value: unknown,
): TrustVaultAuthChallengeResponse {
  if (
    !isRecord(value) ||
    !isNonEmptyString(value.challengeId) ||
    !isNonEmptyString(value.message) ||
    !isWalletAddress(value.walletAddress) ||
    !Number.isSafeInteger(value.chainId) ||
    (value.chainId as number) <= 0 ||
    !isNonEmptyString(value.domain) ||
    !isTimestamp(value.issuedAt) ||
    !isTimestamp(value.expiresAt) ||
    Date.parse(value.expiresAt) <= Date.parse(value.issuedAt)
  ) {
    throw new Error("TrustVault returned an invalid authentication challenge.");
  }

  return {
    challengeId: value.challengeId,
    message: value.message,
    walletAddress: value.walletAddress,
    chainId: value.chainId as number,
    domain: value.domain,
    issuedAt: value.issuedAt,
    expiresAt: value.expiresAt,
  };
}

function parseVerificationResponse(
  value: unknown,
): TrustVaultAuthVerificationResponse {
  if (
    !isRecord(value) ||
    typeof value.authenticated !== "boolean" ||
    !isWalletAddress(value.walletAddress) ||
    (value.expiresAt !== undefined && !isTimestamp(value.expiresAt))
  ) {
    throw new Error("TrustVault returned an invalid authentication result.");
  }

  if (value.authenticated) {
    if (
      value.associationStatus !== "VERIFIED" ||
      !isNonEmptyString(value.customerId)
    ) {
      throw new Error("TrustVault returned an invalid authentication result.");
    }

    return {
      authenticated: true,
      walletAddress: value.walletAddress,
      associationStatus: "VERIFIED",
      customerId: value.customerId,
      ...(value.expiresAt === undefined
        ? {}
        : { expiresAt: value.expiresAt }),
    };
  }

  if (
    value.associationStatus !== "UNVERIFIED" &&
    value.associationStatus !== "REVOKED"
  ) {
    throw new Error("TrustVault returned an invalid authentication result.");
  }

  return {
    authenticated: false,
    walletAddress: value.walletAddress,
    associationStatus: value.associationStatus,
    ...(value.expiresAt === undefined
      ? {}
      : { expiresAt: value.expiresAt }),
  };
}

async function postJson(path: string, body: unknown) {
  const response = await fetch(`${requireApiBaseUrl()}${path}`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  if (!response.ok) {
    if (response.status === 410) {
      throw new Error("The authentication challenge expired. Request a new signature.");
    }
    throw new Error(`TrustVault authentication request failed with HTTP ${response.status}.`);
  }

  try {
    return await response.json() as unknown;
  } catch {
    throw new Error("TrustVault returned an invalid authentication response.");
  }
}

export async function requestTrustVaultAuthChallenge(
  input: TrustVaultAuthChallengeRequest,
) {
  if (
    !isWalletAddress(input.walletAddress) ||
    !Number.isSafeInteger(input.chainId) ||
    input.chainId <= 0 ||
    input.intendedAction !== "AUTHENTICATE_ACCOUNT"
  ) {
    throw new Error("A valid wallet, chain, and intended action are required.");
  }

  const challenge = parseChallengeResponse(
    await postJson("/account/auth/challenge", input),
  );

  if (
    challenge.walletAddress.toLowerCase() !== input.walletAddress.toLowerCase() ||
    challenge.chainId !== input.chainId
  ) {
    throw new Error("TrustVault returned a challenge for a different wallet or chain.");
  }

  return challenge;
}

export async function verifyTrustVaultAuthChallenge(
  input: TrustVaultAuthVerificationRequest,
) {
  if (
    !isNonEmptyString(input.challengeId) ||
    !HEX_SIGNATURE_PATTERN.test(input.signature)
  ) {
    throw new Error("A valid challenge identifier and signature are required.");
  }

  // The signature is sent once to the future verifier and is never logged or persisted.
  return parseVerificationResponse(
    await postJson("/account/auth/verify", input),
  );
}
