import type {
  AtlasInfrastructureSnapshot,
} from "./atlas-infrastructure-contract";

export const ATLAS_INFRASTRUCTURE_DIAGNOSTIC_CODES = [
  "WALLET_DISCONNECTED",
  "WALLET_UNVERIFIED",
  "WALLET_INVALIDATED",
  "NETWORK_UNKNOWN",
  "WRONG_NETWORK",
  "CIRCLE_UNBOUND",
  "CIRCLE_INVALIDATED",
  "TRANSACTION_QUALIFICATION_PENDING",
  "TRANSACTION_TEST_REQUIRED",
  "TRANSACTION_INCOMPATIBLE",
  "TRANSACTION_INVALIDATED",
  "TRANSACTION_UNKNOWN",
] as const;

export type AtlasInfrastructureDiagnosticCode =
  (typeof ATLAS_INFRASTRUCTURE_DIAGNOSTIC_CODES)[number];

export type AtlasInfrastructureDiagnostic =
  Readonly<{
    code:
      AtlasInfrastructureDiagnosticCode;
    area:
      | "WALLET"
      | "NETWORK"
      | "CIRCLE"
      | "TRANSACTION";
    message: string;
  }>;

export type AtlasInfrastructureDiagnosticResult =
  Readonly<{
    preparation:
      | "READY_FOR_PREPARATION"
      | "NOT_READY_FOR_PREPARATION";
    walletReady: boolean;
    networkReady: boolean;
    circleReady: boolean;
    transactionReady: boolean;
    diagnostics:
      readonly AtlasInfrastructureDiagnostic[];
    observedAt: string;
    authority:
      "READ_ONLY_INFRASTRUCTURE_DIAGNOSTICS";
  }>;

function diagnostic(
  code: AtlasInfrastructureDiagnosticCode,
  area:
    | "WALLET"
    | "NETWORK"
    | "CIRCLE"
    | "TRANSACTION",
  message: string,
): AtlasInfrastructureDiagnostic {
  return Object.freeze({
    code,
    area,
    message,
  });
}

function walletDiagnostics(
  snapshot: AtlasInfrastructureSnapshot,
): readonly AtlasInfrastructureDiagnostic[] {
  switch (snapshot.wallet.state) {
    case "CONNECTED_VERIFIED":
      return Object.freeze([]);

    case "DISCONNECTED":
      return Object.freeze([
        diagnostic(
          "WALLET_DISCONNECTED",
          "WALLET",
          "Connect a wallet before preparing a transaction.",
        ),
      ]);

    case "CONNECTED_UNVERIFIED":
      return Object.freeze([
        diagnostic(
          "WALLET_UNVERIFIED",
          "WALLET",
          "Verify the connected wallet before preparing a transaction.",
        ),
      ]);

    case "INVALIDATED":
      return Object.freeze([
        diagnostic(
          "WALLET_INVALIDATED",
          "WALLET",
          "The trusted wallet evidence is no longer valid.",
        ),
      ]);
  }
}

function networkDiagnostics(
  snapshot: AtlasInfrastructureSnapshot,
): readonly AtlasInfrastructureDiagnostic[] {
  switch (snapshot.network.state) {
    case "ARC_READY":
      return Object.freeze([]);

    case "UNKNOWN":
      return Object.freeze([
        diagnostic(
          "NETWORK_UNKNOWN",
          "NETWORK",
          "The connected network could not be verified.",
        ),
      ]);

    case "WRONG_NETWORK":
      return Object.freeze([
        diagnostic(
          "WRONG_NETWORK",
          "NETWORK",
          "Switch the connected wallet to the required Arc network.",
        ),
      ]);
  }
}

function circleDiagnostics(
  snapshot: AtlasInfrastructureSnapshot,
): readonly AtlasInfrastructureDiagnostic[] {
  switch (snapshot.circle.state) {
    case "READY":
      if (snapshot.circle.exactProviderVerified) {
        return Object.freeze([]);
      }

      return Object.freeze([
        diagnostic(
          "CIRCLE_INVALIDATED",
          "CIRCLE",
          "Circle readiness does not contain exact provider verification.",
        ),
      ]);

    case "UNBOUND":
      return Object.freeze([
        diagnostic(
          "CIRCLE_UNBOUND",
          "CIRCLE",
          "Circle infrastructure is not bound to the verified wallet.",
        ),
      ]);

    case "INVALIDATED":
      return Object.freeze([
        diagnostic(
          "CIRCLE_INVALIDATED",
          "CIRCLE",
          "Circle infrastructure evidence is no longer valid.",
        ),
      ]);
  }
}

function transactionDiagnostics(
  snapshot: AtlasInfrastructureSnapshot,
): readonly AtlasInfrastructureDiagnostic[] {
  switch (snapshot.transaction.state) {
    case "TRANSACTION_READY":
      return Object.freeze([]);

    case "QUALIFICATION_PENDING":
      return Object.freeze([
        diagnostic(
          "TRANSACTION_QUALIFICATION_PENDING",
          "TRANSACTION",
          snapshot.transaction.reasons[0] ??
            "Transaction qualification is still pending.",
        ),
      ]);

    case "TEST_REQUIRED":
      return Object.freeze([
        diagnostic(
          "TRANSACTION_TEST_REQUIRED",
          "TRANSACTION",
          snapshot.transaction.reasons[0] ??
            "Wallet qualification testing is required.",
        ),
      ]);

    case "INCOMPATIBLE":
      return Object.freeze([
        diagnostic(
          "TRANSACTION_INCOMPATIBLE",
          "TRANSACTION",
          snapshot.transaction.reasons[0] ??
            "The current wallet infrastructure is incompatible.",
        ),
      ]);

    case "INVALIDATED":
      return Object.freeze([
        diagnostic(
          "TRANSACTION_INVALIDATED",
          "TRANSACTION",
          snapshot.transaction.reasons[0] ??
            "Transaction readiness evidence is no longer valid.",
        ),
      ]);

    case "UNKNOWN":
      return Object.freeze([
        diagnostic(
          "TRANSACTION_UNKNOWN",
          "TRANSACTION",
          snapshot.transaction.reasons[0] ??
            "Transaction readiness is unknown.",
        ),
      ]);
  }
}

export function diagnoseAtlasInfrastructure(
  snapshot: AtlasInfrastructureSnapshot,
): AtlasInfrastructureDiagnosticResult {
  const walletReady =
    snapshot.wallet.state ===
    "CONNECTED_VERIFIED";

  const networkReady =
    snapshot.network.state ===
    "ARC_READY" &&
    snapshot.network.chainId ===
      snapshot.network.expectedChainId;

  const circleReady =
    snapshot.circle.state ===
      "READY" &&
    snapshot.circle.exactProviderVerified;

  const transactionReady =
    snapshot.transaction.state ===
    "TRANSACTION_READY";

  const diagnostics =
    Object.freeze([
      ...walletDiagnostics(snapshot),
      ...networkDiagnostics(snapshot),
      ...circleDiagnostics(snapshot),
      ...transactionDiagnostics(snapshot),
    ]);

  const preparationReady =
    walletReady &&
    networkReady &&
    circleReady &&
    transactionReady;

  return Object.freeze({
    preparation:
      preparationReady
        ? "READY_FOR_PREPARATION"
        : "NOT_READY_FOR_PREPARATION",
    walletReady,
    networkReady,
    circleReady,
    transactionReady,
    diagnostics,
    observedAt:
      snapshot.observedAt,
    authority:
      "READ_ONLY_INFRASTRUCTURE_DIAGNOSTICS",
  });
}