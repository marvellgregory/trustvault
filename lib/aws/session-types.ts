export type TrustVaultSessionResponse = Readonly<{
  authenticated: true;
  customerId: string;
  walletAddress: string;
  chainId: 5_042_002;
  expiresAt: string;
}>;

export function sessionMatchesConnectedWallet(
  session: TrustVaultSessionResponse,
  walletAddress: string | undefined,
  chainId: number | undefined,
) {
  return Boolean(
    walletAddress &&
    session.walletAddress.toLowerCase() === walletAddress.toLowerCase() &&
    session.chainId === 5_042_002 &&
    chainId === 5_042_002,
  );
}
