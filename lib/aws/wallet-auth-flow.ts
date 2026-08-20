import type { TrustVaultAuthVerificationResponse } from "./auth-types";

export const TRUSTVAULT_AUTH_CHAIN_ID = 5_042_002;

export type CurrentAuthWallet = Readonly<{
  address?: string;
  chainId?: number;
  connected: boolean;
}>;

type WalletAuthDependencies = Readonly<{
  expectedAddress: string;
  getCurrentWallet(): CurrentAuthWallet;
  assertQualified(): Promise<unknown>;
  requestChallenge(input: {
    walletAddress: string;
    chainId: number;
    intendedAction: "AUTHENTICATE_ACCOUNT";
  }): Promise<{ challengeId: string; message: string; expiresAt: string }>;
  signMessage(message: string): Promise<string>;
  verifyChallenge(input: {
    challengeId: string;
    signature: string;
  }): Promise<TrustVaultAuthVerificationResponse>;
  now?: () => number;
}>;

function assertSameWallet(current: CurrentAuthWallet, expectedAddress: string) {
  if (!current.connected || !current.address) {
    throw new Error("Wallet disconnected during authentication. Reconnect and try again.");
  }
  if (current.address.toLowerCase() !== expectedAddress.toLowerCase()) {
    throw new Error("The connected wallet changed during authentication. Try again with the current wallet.");
  }
  if (current.chainId !== TRUSTVAULT_AUTH_CHAIN_ID) {
    throw new Error("Switch your wallet to Arc Testnet before authenticating.");
  }
}

export async function authenticateTrustVaultWallet(dependencies: WalletAuthDependencies) {
  const now = dependencies.now ?? Date.now;
  assertSameWallet(dependencies.getCurrentWallet(), dependencies.expectedAddress);
  await dependencies.assertQualified();
  assertSameWallet(dependencies.getCurrentWallet(), dependencies.expectedAddress);

  const challenge = await dependencies.requestChallenge({
    walletAddress: dependencies.expectedAddress,
    chainId: TRUSTVAULT_AUTH_CHAIN_ID,
    intendedAction: "AUTHENTICATE_ACCOUNT",
  });
  assertSameWallet(dependencies.getCurrentWallet(), dependencies.expectedAddress);
  if (Date.parse(challenge.expiresAt) <= now()) {
    throw new Error("The authentication challenge expired. Request a new signature.");
  }

  // Pass the server message through unchanged. The signature remains a local variable only.
  const signature = await dependencies.signMessage(challenge.message);
  assertSameWallet(dependencies.getCurrentWallet(), dependencies.expectedAddress);
  if (Date.parse(challenge.expiresAt) <= now()) {
    throw new Error("The authentication challenge expired. Request a new signature.");
  }

  const result = await dependencies.verifyChallenge({
    challengeId: challenge.challengeId,
    signature,
  });
  assertSameWallet(dependencies.getCurrentWallet(), dependencies.expectedAddress);

  if (
    result.authenticated !== true ||
    result.associationStatus !== "VERIFIED" ||
    result.walletAddress.toLowerCase() !== dependencies.expectedAddress.toLowerCase()
  ) {
    throw new Error("TrustVault could not verify this wallet for the connected account.");
  }

  return result;
}
