import type { SendParams } from "@circle-fin/app-kit";
import { isAddress } from "viem";
import { arcTestnet } from "viem/chains";

import {
  circleAppKit,
  createConnectedAppKitAdapter,
} from "@/lib/app-kit/browser-wallet";

export type SendGiftInput = {
  connectedAddress: `0x${string}`;
  chainId: number;
  recipientAddress: string;
  amount: string;
};

export type SendGiftResult = {
  txHash?: string;
  explorerUrl?: string;
};

function validateAmount(amount: string) {
  const value = amount.trim();

  if (!/^\d+(\.\d{1,6})?$/.test(value)) {
    throw new Error(
      "Enter a valid USDC amount with up to 6 decimal places.",
    );
  }

  if (Number(value) <= 0) {
    throw new Error("Amount must be greater than zero.");
  }

  return value;
}

export async function sendGiftVault(
  input: SendGiftInput,
): Promise<SendGiftResult> {
  if (input.chainId !== arcTestnet.id) {
    throw new Error("Please switch MetaMask to Arc Testnet.");
  }

  if (!isAddress(input.connectedAddress)) {
    throw new Error("Connected wallet is invalid.");
  }

  if (!isAddress(input.recipientAddress)) {
    throw new Error("Recipient wallet is invalid.");
  }

  if (
    input.connectedAddress.toLowerCase() ===
    input.recipientAddress.toLowerCase()
  ) {
    throw new Error(
      "Recipient wallet must be different from your own wallet.",
    );
  }

  const amount = validateAmount(input.amount);

  const { adapter } =
    await createConnectedAppKitAdapter({
      expectedAddress: input.connectedAddress,
      preferredWalletRdns: "io.metamask",
    });

  const params: SendParams = {
    from: {
      adapter,
      chain: "Arc_Testnet",
    },
    to: input.recipientAddress,
    amount,
    token: "USDC",
  };

  const result = await circleAppKit.send(params);

  return {
    txHash: result.txHash,
    explorerUrl: result.explorerUrl,
  };
}