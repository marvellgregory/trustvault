import {
  formatUnits,
  isAddress,
  parseUnits,
  type PublicClient,
  type TransactionReceipt,
  type WalletClient,
} from "viem";
import { arcTestnet } from "viem/chains";

import { validateArcUsdcTransferEffect } from "@/lib/arc/marketplace-transfer-effect";
import {
  ARC_TESTNET_EXPLORER_URL,
  ARC_TESTNET_USDC_ADDRESS,
  usdcAbi,
} from "@/lib/gift-vault/contract";
import type { TransactionReadinessAuthority } from "@/lib/wallet/transaction-readiness-authority";

export type PendingSendNowTransaction = {
  txHash: `0x${string}`;
  sender: `0x${string}`;
  recipient: `0x${string}`;
  amount: string;
  amountBaseUnits: string;
};

export type SendNowResult = PendingSendNowTransaction & {
  blockNumber: string;
  explorerUrl: string;
};

export class SendNowConfirmationPendingError extends Error {
  pending: PendingSendNowTransaction;

  constructor(pending: PendingSendNowTransaction) {
    super(
      "The USDC transfer was submitted, but Arc Testnet confirmation is temporarily unavailable. Do not send again. Retry confirmation for the existing transaction.",
    );
    this.name = "SendNowConfirmationPendingError";
    this.pending = pending;
  }
}

function validateAmount(amount: string) {
  const value = amount.trim();

  if (!/^\d+(\.\d{1,6})?$/.test(value)) {
    throw new Error("Enter a valid USDC amount with up to 6 decimal places.");
  }

  const parsed = parseUnits(value, 6);

  if (parsed <= BigInt(0)) {
    throw new Error("Gift amount must be greater than zero.");
  }

  return parsed;
}

async function waitForReceipt(
  publicClient: PublicClient,
  hash: `0x${string}`,
) {
  try {
    return await publicClient.waitForTransactionReceipt({
      hash,
      pollingInterval: 6_000,
      timeout: 120_000,
    });
  } catch {
    throw new Error("confirmation-pending");
  }
}

export async function confirmSendNowTransaction(
  publicClient: PublicClient,
  pending: PendingSendNowTransaction,
): Promise<SendNowResult> {
  let receipt: TransactionReceipt;

  try {
    receipt = await waitForReceipt(publicClient, pending.txHash);
  } catch {
    throw new SendNowConfirmationPendingError(pending);
  }

  const effect = validateArcUsdcTransferEffect({
    receipt,
    chainId: arcTestnet.id,
    expectedSender: pending.sender,
    expectedRecipient: pending.recipient,
    expectedAmountBaseUnits: BigInt(pending.amountBaseUnits),
  });

  if (effect.status !== "VALID") {
    throw new Error(
      `The submitted transaction did not produce the expected USDC transfer (${effect.status}).`,
    );
  }

  return {
    ...pending,
    blockNumber: receipt.blockNumber.toString(),
    explorerUrl: `${ARC_TESTNET_EXPLORER_URL}/tx/${pending.txHash}`,
  };
}

export async function sendUsdcNow(input: {
  publicClient: PublicClient;
  walletClient: WalletClient;
  connectedAddress: `0x${string}`;
  chainId: number;
  recipientAddress: string;
  amount: string;
  onSubmitted?: (pending: PendingSendNowTransaction) => void;
  readinessAuthority: TransactionReadinessAuthority;
}) {
  if (input.chainId !== arcTestnet.id) {
    throw new Error("Switch your wallet to Arc Testnet before sending USDC.");
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
    throw new Error("Recipient wallet must be different from the sender wallet.");
  }

  const account = input.walletClient.account;

  if (!account) {
    throw new Error("Wallet account is unavailable. Reconnect your wallet.");
  }

  if (account.address.toLowerCase() !== input.connectedAddress.toLowerCase()) {
    throw new Error(
      "The signing wallet does not match the wallet connected to TrustVault.",
    );
  }

  const amountBaseUnits = validateAmount(input.amount);

  const balance = await input.publicClient.readContract({
    address: ARC_TESTNET_USDC_ADDRESS,
    abi: usdcAbi,
    functionName: "balanceOf",
    args: [input.connectedAddress],
  });

  if (balance < amountBaseUnits) {
    throw new Error(
      `Insufficient USDC balance. Available: ${formatUnits(balance, 6)} USDC.`,
    );
  }

  await input.readinessAuthority.assertCurrent();
  const txHash = await input.walletClient.writeContract({
    address: ARC_TESTNET_USDC_ADDRESS,
    abi: usdcAbi,
    functionName: "transfer",
    args: [
      input.recipientAddress as `0x${string}`,
      amountBaseUnits,
    ],
    account,
    chain: arcTestnet,
  });

  const pending: PendingSendNowTransaction = {
    txHash,
    sender: input.connectedAddress,
    recipient: input.recipientAddress as `0x${string}`,
    amount: input.amount.trim(),
    amountBaseUnits: amountBaseUnits.toString(),
  };

  input.onSubmitted?.(pending);

  return confirmSendNowTransaction(input.publicClient, pending);
}
