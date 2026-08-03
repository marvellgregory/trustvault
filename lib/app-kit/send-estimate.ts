import type { SendParams } from "@circle-fin/app-kit";
import { formatUnits, isAddress } from "viem";
import { arcTestnet } from "viem/chains";
import {
  circleAppKit,
  createConnectedAppKitAdapter,
} from "@/lib/app-kit/browser-wallet";

export type AppKitSendEstimateInput = {
  connectedAddress: `0x${string}`;
  chainId: number;
  recipientAddress: string;
  amount: string;
};

export type AppKitSendEstimate = {
  amount: string;
  recipientAddress: `0x${string}`;
  network: "Arc Testnet";
  token: "USDC";
  estimatedFeeRaw: string;
  estimatedFeeUsdc: string;
  gas: string;
  gasPrice: string;
  walletName: string;
};

function validateAmount(amount: string) {
  const normalizedAmount = amount.trim();

  if (!/^\d+(\.\d{1,6})?$/.test(normalizedAmount)) {
    throw new Error(
      "Enter a valid USDC amount with no more than 6 decimal places.",
    );
  }

  if (Number(normalizedAmount) <= 0) {
    throw new Error("The USDC amount must be greater than zero.");
  }

  return normalizedAmount;
}

/**
 * Estimate an App Kit USDC send on Arc Testnet.
 *
 * This function does not call `send()`, request a token approval, or move funds.
 * It prepares and validates the send parameters, then calls `estimateSend()`.
 */
export async function estimateArcUsdcSend(
  input: AppKitSendEstimateInput,
): Promise<AppKitSendEstimate> {
  if (input.chainId !== arcTestnet.id) {
    throw new Error("Switch the connected wallet to Arc Testnet first.");
  }

  if (!isAddress(input.connectedAddress)) {
    throw new Error("The connected wallet address is invalid.");
  }

  if (!isAddress(input.recipientAddress)) {
    throw new Error("Enter a valid recipient wallet address.");
  }

  if (
    input.connectedAddress.toLowerCase() ===
    input.recipientAddress.toLowerCase()
  ) {
    throw new Error("The recipient must be different from the sending wallet.");
  }

  const amount = validateAmount(input.amount);

  const { adapter, walletName } = await createConnectedAppKitAdapter({
    expectedAddress: input.connectedAddress,
    preferredWalletRdns: "io.metamask",
  });

  const sendParams: SendParams = {
    from: {
      adapter,
      chain: "Arc_Testnet",
    },
    to: input.recipientAddress,
    amount,
    token: "USDC",
  };

  const estimate = await circleAppKit.estimateSend(sendParams);

  return {
    amount,
    recipientAddress: input.recipientAddress as `0x${string}`,
    network: "Arc Testnet",
    token: "USDC",
    estimatedFeeRaw: estimate.fee,
    estimatedFeeUsdc: formatUnits(BigInt(estimate.fee), 18),
    gas: estimate.gas.toString(),
    gasPrice: estimate.gasPrice.toString(),
    walletName,
  };
}
