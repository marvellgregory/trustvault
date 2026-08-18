import type {
  TrustVaultWalletAssociationStatus,
} from "@/lib/aws/account-types";

export type TrustVaultAuthIntendedAction =
  "AUTHENTICATE_ACCOUNT";

export type TrustVaultAuthChallengeRequest = Readonly<{
  walletAddress: string;
  chainId: number;
  intendedAction: TrustVaultAuthIntendedAction;
}>;

export type TrustVaultAuthChallengeResponse = Readonly<{
  challengeId: string;
  message: string;
  walletAddress: string;
  chainId: number;
  domain: string;
  issuedAt: string;
  expiresAt: string;
}>;

export type TrustVaultAuthVerificationRequest = Readonly<{
  challengeId: string;
  signature: string;
}>;

export type TrustVaultAuthVerificationResponse =
  | Readonly<{
      authenticated: true;
      walletAddress: string;
      associationStatus: "VERIFIED";
      customerId?: string;
      expiresAt?: string;
    }>
  | Readonly<{
      authenticated: false;
      walletAddress: string;
      associationStatus: Exclude<
        TrustVaultWalletAssociationStatus,
        "VERIFIED"
      >;
      expiresAt?: string;
    }>;
