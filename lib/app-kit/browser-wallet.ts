import { AppKit } from "@circle-fin/app-kit";

import { createCircleAdapterForOperation, type CircleProviderBinding } from "@/lib/app-kit/circle-provider-binding";

export const circleAppKit = new AppKit();

export async function createConnectedAppKitAdapter(options: {
  binding: CircleProviderBinding;
  expectedAddress: `0x${string}`;
  expectedChainId: number;
}) {
  const { adapter, evidence } = await createCircleAdapterForOperation(options.binding);
  if (!evidence.account || evidence.account.toLowerCase() !== options.expectedAddress.toLowerCase()) throw new Error("The Circle adapter account does not match the wallet connected to TrustVault.");
  if (evidence.chainId !== options.expectedChainId) throw new Error("The Circle adapter chain does not match the connected TrustVault chain.");
  return { adapter, connectedAddress: evidence.account, walletName: evidence.providerName ?? "Verified wallet", providerIdentityKey: evidence.providerIdentityKey };
}
