import type {
  SerializableWalletSessionSnapshot,
  WalletSession,
} from "./session-types.js";

export function createSerializableWalletSessionSnapshot(
  session: WalletSession,
): SerializableWalletSessionSnapshot {
  return Object.freeze({
    schemaVersion: 1,
    sessionId: session.sessionId,
    provider: Object.freeze({ ...session.provider }),
    providerSelection: session.providerSelection,
    ...(session.address ? { address: session.address } : {}),
    connection: session.connection,
    chain: Object.freeze({ ...session.chain }),
    capabilities: Object.freeze({ ...session.capabilities }),
    qualification: Object.freeze({
      ...session.qualification,
      reasons: Object.freeze([...session.qualification.reasons]),
    }),
    identityVerification: Object.freeze({ ...session.identityVerification }),
    circleEvidence: Object.freeze({ ...session.circleEvidence }),
    state: session.state,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
  });
}
