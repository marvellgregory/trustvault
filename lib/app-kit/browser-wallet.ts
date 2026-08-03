import { AppKit } from "@circle-fin/app-kit";
import {
  createViemAdapterFromProvider,
  type CreateViemAdapterFromProviderParams,
} from "@circle-fin/adapter-viem-v2";

type BrowserWalletProvider =
  CreateViemAdapterFromProviderParams["provider"];

type EIP6963ProviderInfo = {
  uuid: string;
  name: string;
  icon: string;
  rdns: string;
};

type EIP6963ProviderDetail = {
  info: EIP6963ProviderInfo;
  provider: BrowserWalletProvider;
};

declare global {
  interface WindowEventMap {
    "eip6963:announceProvider": CustomEvent<EIP6963ProviderDetail>;
  }
}

/**
 * Shared Circle App Kit instance.
 *
 * No transaction is initiated by creating this object. Money-moving methods
 * are called later only from explicit user actions after a review screen.
 */
export const circleAppKit = new AppKit();

/**
 * Discover browser wallets using EIP-6963.
 *
 * This standards-based flow avoids relying on whichever extension happens to
 * own window.ethereum when multiple wallets are installed.
 */
export async function discoverBrowserWallets(): Promise<
  EIP6963ProviderDetail[]
> {
  if (typeof window === "undefined") {
    throw new Error("Browser wallet discovery is only available in the browser.");
  }

  const providers = new Map<string, EIP6963ProviderDetail>();

  const handleProviderAnnouncement = (
    event: WindowEventMap["eip6963:announceProvider"],
  ) => {
    providers.set(event.detail.info.uuid, event.detail);
  };

  window.addEventListener(
    "eip6963:announceProvider",
    handleProviderAnnouncement,
  );
  window.dispatchEvent(new Event("eip6963:requestProvider"));

  await new Promise((resolve) => window.setTimeout(resolve, 250));

  window.removeEventListener(
    "eip6963:announceProvider",
    handleProviderAnnouncement,
  );

  return [...providers.values()];
}

/**
 * Find the already-connected browser wallet and create Circle's Viem adapter.
 *
 * Wallet connection remains a separate Wagmi-powered user action. This helper
 * only reads accounts already authorized by the user and does not open a new
 * permission prompt.
 */
export async function createConnectedAppKitAdapter(options?: {
  expectedAddress?: `0x${string}`;
  preferredWalletRdns?: string;
}) {
  const providers = await discoverBrowserWallets();

  const selectedWallet =
    providers.find(
      ({ info }) =>
        info.rdns === (options?.preferredWalletRdns ?? "io.metamask") ||
        info.name.toLowerCase() === "metamask",
    ) ?? providers[0];

  if (!selectedWallet) {
    throw new Error(
      "No EIP-6963 browser wallet was found. Install and unlock a compatible wallet.",
    );
  }

  const accounts = (await selectedWallet.provider.request({
    method: "eth_accounts",
    params: undefined,
  })) as string[];

  const connectedAddress = accounts[0] as `0x${string}` | undefined;

  if (!connectedAddress) {
    throw new Error(
      "Connect your wallet in TrustVault before starting an App Kit action.",
    );
  }

  if (
    options?.expectedAddress &&
    connectedAddress.toLowerCase() !== options.expectedAddress.toLowerCase()
  ) {
    throw new Error(
      "The App Kit wallet does not match the wallet connected to TrustVault.",
    );
  }

  const adapter = await createViemAdapterFromProvider({
    provider: selectedWallet.provider,
  });

  return {
    adapter,
    connectedAddress,
    walletName: selectedWallet.info.name,
  };
}
