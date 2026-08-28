import {
  decodeEventLog,
  type PublicClient,
  type TransactionReceipt,
  type WalletClient,
} from "viem";
import { arcTestnet } from "viem/chains";

import {
  ARC_TESTNET_EXPLORER_URL,
  TRUSTVAULT_GIFT_VAULT_ADDRESS,
  giftVaultAbi,
} from "@/lib/gift-vault/contract";
import type { TransactionReadinessAuthority } from "@/lib/wallet/transaction-readiness-authority";

export type PendingGiftClaim = {
  giftId: string;
  txHash: `0x${string}`;
};

export type GiftClaimResult = {
  giftId: string;
  txHash: `0x${string}`;
  explorerUrl: string;
  blockNumber: string;
  claimedAmountBaseUnits?: string;
  claimedAt?: string;
};

export class GiftClaimConfirmationPendingError extends Error {
  pending: PendingGiftClaim;

  constructor(pending: PendingGiftClaim) {
    super(
      "The claim transaction was submitted. Confirmation is temporarily unavailable. Do not submit another claim.",
    );
    this.name = "GiftClaimConfirmationPendingError";
    this.pending = pending;
  }
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

async function waitForClaimReceipt(
  publicClient: PublicClient,
  hash: `0x${string}`,
): Promise<TransactionReceipt> {
  let delay = 5_000;
  let lastError: unknown;

  for (let attempt = 1; attempt <= 14; attempt += 1) {
    try {
      return await publicClient.getTransactionReceipt({ hash });
    } catch (error) {
      lastError = error;

      if (!isTemporaryReceiptError(error)) {
        throw error;
      }

      if (attempt === 14) break;

      await sleep(delay);
      delay = Math.min(Math.round(delay * 1.35), 15_000);
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Claim confirmation is temporarily unavailable.");
}

function parseGiftClaimed(receipt: TransactionReceipt) {
  for (const log of receipt.logs) {
    try {
      const decoded = decodeEventLog({
        abi: giftVaultAbi,
        data: log.data,
        topics: log.topics,
      });

      if (decoded.eventName === "GiftClaimed") {
        return {
          giftId: decoded.args.giftId.toString(),
          amount: decoded.args.amount?.toString(),
          claimedAt: decoded.args.claimedAt?.toString(),
        };
      }
    } catch {
      // Ignore logs from other contracts.
    }
  }

  return null;
}

export async function confirmGiftClaim(
  publicClient: PublicClient,
  pending: PendingGiftClaim,
): Promise<GiftClaimResult> {
  let receipt: TransactionReceipt;

  try {
    receipt = await waitForClaimReceipt(
      publicClient,
      pending.txHash,
    );
  } catch {
    throw new GiftClaimConfirmationPendingError(pending);
  }

  if (receipt.status !== "success") {
    throw new Error(
      "The claim transaction confirmed onchain but reverted.",
    );
  }

  const event = parseGiftClaimed(receipt);

  if (!event) {
    throw new Error(
      "The claim confirmed, but TrustVault could not identify the GiftClaimed event. Do not submit another claim.",
    );
  }

  return {
    giftId: event.giftId,
    txHash: pending.txHash,
    explorerUrl: `${ARC_TESTNET_EXPLORER_URL}/tx/${pending.txHash}`,
    blockNumber: receipt.blockNumber.toString(),
    claimedAmountBaseUnits: event.amount,
    claimedAt: event.claimedAt,
  };
}

export async function claimGift(input: {
  publicClient: PublicClient;
  walletClient: WalletClient;
  giftId: bigint;
  connectedAddress: `0x${string}`;
  chainId: number;
  onSubmitted?: (pending: PendingGiftClaim) => void;
  readinessAuthority: TransactionReadinessAuthority;
}) {
  if (input.chainId !== arcTestnet.id) {
    throw new Error(
      "Switch your wallet to Arc Testnet before claiming the gift.",
    );
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

  await input.readinessAuthority.assertCurrent();
  const txHash = await input.walletClient.writeContract({
    address: TRUSTVAULT_GIFT_VAULT_ADDRESS,
    abi: giftVaultAbi,
    functionName: "claim",
    args: [input.giftId],
    account,
    chain: arcTestnet,
  });

  const pending: PendingGiftClaim = {
    giftId: input.giftId.toString(),
    txHash,
  };

  input.onSubmitted?.(pending);

  return confirmGiftClaim(
    input.publicClient,
    pending,
  );
}
