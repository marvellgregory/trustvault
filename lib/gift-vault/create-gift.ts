import {
  decodeEventLog,
  formatUnits,
  isAddress,
  parseUnits,
  type PublicClient,
  type TransactionReceipt,
  type WalletClient,
} from "viem";
import { arcTestnet } from "viem/chains";

import {
  ARC_TESTNET_EXPLORER_URL,
  ARC_TESTNET_USDC_ADDRESS,
  TRUSTVAULT_GIFT_VAULT_ADDRESS,
  giftVaultAbi,
  usdcAbi,
} from "@/lib/gift-vault/contract";
import type { TransactionReadinessAuthority } from "@/lib/wallet/transaction-readiness-authority";

export type GiftTransactionProgress =
  | {
      stage: "approval-submitted";
      approvalTxHash: `0x${string}`;
    }
  | {
      stage: "approval-confirmed";
      approvalTxHash: `0x${string}`;
    }
  | {
      stage: "gift-submitted";
      txHash: `0x${string}`;
      approvalTxHash?: `0x${string}`;
      amount: string;
      amountBaseUnits: string;
      unlockTimestamp: number;
      contractAddress: `0x${string}`;
    };

export type PendingGiftTransaction = {
  txHash: `0x${string}`;
  approvalTxHash?: `0x${string}`;
  amount: string;
  amountBaseUnits: string;
  unlockTimestamp: number;
  contractAddress: `0x${string}`;
};

export type PendingApprovalTransaction = {
  approvalTxHash: `0x${string}`;
};

export type CreateTimedGiftInput = {
  publicClient: PublicClient;
  walletClient: WalletClient;
  connectedAddress: `0x${string}`;
  chainId: number;
  recipientAddress: string;
  amount: string;
  unlockTimestamp: number;
  onProgress?: (progress: GiftTransactionProgress) => void;
  readinessAuthority: TransactionReadinessAuthority;
};

export type CreateTimedGiftResult = {
  giftId: string;
  txHash: `0x${string}`;
  explorerUrl: string;
  approvalTxHash?: `0x${string}`;
  amount: string;
  amountBaseUnits: string;
  unlockTimestamp: number;
  contractAddress: `0x${string}`;
  blockNumber: string;
};

export class GiftConfirmationPendingError extends Error {
  pending: PendingGiftTransaction;

  constructor(pending: PendingGiftTransaction) {
    super(
      "The Gift Vault transaction was submitted. Confirmation is temporarily unavailable. Do not submit another gift.",
    );
    this.name = "GiftConfirmationPendingError";
    this.pending = pending;
  }
}

export class GiftApprovalPendingError extends Error {
  pending: PendingApprovalTransaction;

  constructor(pending: PendingApprovalTransaction) {
    super(
      "The USDC approval was submitted. Confirmation is temporarily unavailable. Do not submit another approval.",
    );
    this.name = "GiftApprovalPendingError";
    this.pending = pending;
  }
}

function validateAmount(amount: string) {
  const value = amount.trim();

  if (!/^\d+(\.\d{1,6})?$/.test(value)) {
    throw new Error(
      "Enter a valid USDC amount with up to 6 decimal places.",
    );
  }

  const parsed = parseUnits(value, 6);

  if (parsed <= parseUnits("0", 6)) {
    throw new Error("Gift amount must be greater than zero.");
  }

  return parsed;
}

function isTemporaryReceiptError(error: unknown) {
  if (!(error instanceof Error)) return true;

  const message = error.message.toLowerCase();

  return (
    message.includes("not found") ||
    message.includes("rate limit") ||
    message.includes("429") ||
    message.includes("too many requests") ||
    message.includes("timeout") ||
    message.includes("timed out") ||
    message.includes("network") ||
    message.includes("fetch") ||
    message.includes("request")
  );
}

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export async function waitForReceiptWithBackoff(
  publicClient: PublicClient,
  hash: `0x${string}`,
  options?: {
    attempts?: number;
    firstDelayMs?: number;
    maxDelayMs?: number;
  },
): Promise<TransactionReceipt> {
  const attempts = options?.attempts ?? 14;
  const firstDelayMs = options?.firstDelayMs ?? 5_000;
  const maxDelayMs = options?.maxDelayMs ?? 15_000;

  let delay = firstDelayMs;
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await publicClient.getTransactionReceipt({ hash });
    } catch (error) {
      lastError = error;

      if (!isTemporaryReceiptError(error)) {
        throw error;
      }

      if (attempt === attempts) {
        break;
      }

      await sleep(delay);
      delay = Math.min(Math.round(delay * 1.35), maxDelayMs);
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Transaction confirmation is temporarily unavailable.");
}

function parseGiftCreated(
  receipt: TransactionReceipt,
) {
  let giftId: bigint | undefined;

  for (const log of receipt.logs) {
    try {
      const decoded = decodeEventLog({
        abi: giftVaultAbi,
        data: log.data,
        topics: log.topics,
      });

      if (decoded.eventName === "GiftCreated") {
        giftId = decoded.args.giftId;
        break;
      }
    } catch {
      // Ignore logs from other contracts, including USDC.
    }
  }

  return giftId;
}

export async function confirmTimedGiftTransaction(
  publicClient: PublicClient,
  pending: PendingGiftTransaction,
): Promise<CreateTimedGiftResult> {
  let receipt: TransactionReceipt;

  try {
    receipt = await waitForReceiptWithBackoff(
      publicClient,
      pending.txHash,
    );
  } catch {
    throw new GiftConfirmationPendingError(pending);
  }

  if (receipt.status !== "success") {
    throw new Error(
      "The Gift Vault transaction confirmed onchain but reverted.",
    );
  }

  const giftId = parseGiftCreated(receipt);

  if (giftId === undefined) {
    throw new Error(
      "The transaction confirmed, but TrustVault could not identify the GiftCreated event. Do not submit the gift again.",
    );
  }

  return {
    giftId: giftId.toString(),
    txHash: pending.txHash,
    explorerUrl: `${ARC_TESTNET_EXPLORER_URL}/tx/${pending.txHash}`,
    approvalTxHash: pending.approvalTxHash,
    amount: pending.amount,
    amountBaseUnits: pending.amountBaseUnits,
    unlockTimestamp: pending.unlockTimestamp,
    contractAddress: pending.contractAddress,
    blockNumber: receipt.blockNumber.toString(),
  };
}

export async function confirmApprovalTransaction(
  publicClient: PublicClient,
  pending: PendingApprovalTransaction,
) {
  let receipt: TransactionReceipt;

  try {
    receipt = await waitForReceiptWithBackoff(
      publicClient,
      pending.approvalTxHash,
    );
  } catch {
    throw new GiftApprovalPendingError(pending);
  }

  if (receipt.status !== "success") {
    throw new Error("The USDC approval transaction reverted.");
  }

  return receipt;
}

export async function createTimedGift(
  input: CreateTimedGiftInput,
): Promise<CreateTimedGiftResult> {
  if (input.chainId !== arcTestnet.id) {
    throw new Error(
      "Switch your wallet to Arc Testnet before creating the gift.",
    );
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
      "Recipient wallet must be different from the sender wallet.",
    );
  }

  if (!Number.isInteger(input.unlockTimestamp)) {
    throw new Error("Unlock timestamp is invalid.");
  }

  if (input.unlockTimestamp <= Math.floor(Date.now() / 1000)) {
    throw new Error("Unlock time must be in the future.");
  }

  const account = input.walletClient.account;

  if (!account) {
    throw new Error(
      "Wallet account is unavailable. Reconnect your wallet.",
    );
  }

  if (
    account.address.toLowerCase() !==
    input.connectedAddress.toLowerCase()
  ) {
    throw new Error(
      "The signing wallet does not match the connected TrustVault wallet.",
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

  const allowance = await input.publicClient.readContract({
    address: ARC_TESTNET_USDC_ADDRESS,
    abi: usdcAbi,
    functionName: "allowance",
    args: [
      input.connectedAddress,
      TRUSTVAULT_GIFT_VAULT_ADDRESS,
    ],
  });

  let approvalTxHash: `0x${string}` | undefined;

  if (allowance < amountBaseUnits) {
    await input.readinessAuthority.assertCurrent();
    approvalTxHash = await input.walletClient.writeContract({
      address: ARC_TESTNET_USDC_ADDRESS,
      abi: usdcAbi,
      functionName: "approve",
      args: [
        TRUSTVAULT_GIFT_VAULT_ADDRESS,
        amountBaseUnits,
      ],
      account,
      chain: arcTestnet,
    });

    input.onProgress?.({
      stage: "approval-submitted",
      approvalTxHash,
    });

    try {
      await confirmApprovalTransaction(
        input.publicClient,
        { approvalTxHash },
      );
    } catch (error) {
      if (error instanceof GiftApprovalPendingError) {
        throw error;
      }
      throw error;
    }

    input.onProgress?.({
      stage: "approval-confirmed",
      approvalTxHash,
    });
  }

  await input.readinessAuthority.assertCurrent();
  const txHash = await input.walletClient.writeContract({
      address: TRUSTVAULT_GIFT_VAULT_ADDRESS,
      abi: giftVaultAbi,
      functionName: "createGift",
      args: [
        input.recipientAddress as `0x${string}`,
        amountBaseUnits,
        BigInt(input.unlockTimestamp),
      ],
      account,
      chain: arcTestnet,
    });

  const pending: PendingGiftTransaction = {
    txHash,
    approvalTxHash,
    amount: input.amount.trim(),
    amountBaseUnits: amountBaseUnits.toString(),
    unlockTimestamp: input.unlockTimestamp,
    contractAddress: TRUSTVAULT_GIFT_VAULT_ADDRESS,
  };

  // Critical: expose the transaction hash immediately after broadcast,
  // before any receipt polling can fail.
  input.onProgress?.({
    stage: "gift-submitted",
    ...pending,
  });

  return confirmTimedGiftTransaction(
    input.publicClient,
    pending,
  );
}
