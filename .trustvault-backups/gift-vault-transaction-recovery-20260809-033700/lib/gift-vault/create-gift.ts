import {
  decodeEventLog,
  formatUnits,
  isAddress,
  parseUnits,
  type PublicClient,
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

export type CreateTimedGiftInput = {
  publicClient: PublicClient;
  walletClient: WalletClient;
  connectedAddress: `0x${string}`;
  chainId: number;
  recipientAddress: string;
  amount: string;
  unlockTimestamp: number;
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

function validateAmount(amount: string) {
  const value = amount.trim();

  if (!/^\d+(\.\d{1,6})?$/.test(value)) {
    throw new Error("Enter a valid USDC amount with up to 6 decimal places.");
  }

  const parsed = parseUnits(value, 6);

  if (parsed <= parseUnits("0", 6)) {
    throw new Error("Gift amount must be greater than zero.");
  }

  return parsed;
}

export async function createTimedGift(
  input: CreateTimedGiftInput,
): Promise<CreateTimedGiftResult> {
  if (input.chainId !== arcTestnet.id) {
    throw new Error("Switch your wallet to Arc Testnet before creating the gift.");
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

  if (!Number.isInteger(input.unlockTimestamp)) {
    throw new Error("Unlock timestamp is invalid.");
  }

  if (input.unlockTimestamp <= Math.floor(Date.now() / 1000)) {
    throw new Error("Unlock time must be in the future.");
  }

  const account = input.walletClient.account;

  if (!account) {
    throw new Error("Wallet account is unavailable. Reconnect your wallet.");
  }

  if (account.address.toLowerCase() !== input.connectedAddress.toLowerCase()) {
    throw new Error("The signing wallet does not match the connected TrustVault wallet.");
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
    args: [input.connectedAddress, TRUSTVAULT_GIFT_VAULT_ADDRESS],
  });

  let approvalTxHash: `0x${string}` | undefined;

  if (allowance < amountBaseUnits) {
    approvalTxHash = await input.walletClient.writeContract({
      address: ARC_TESTNET_USDC_ADDRESS,
      abi: usdcAbi,
      functionName: "approve",
      args: [TRUSTVAULT_GIFT_VAULT_ADDRESS, amountBaseUnits],
      account,
      chain: arcTestnet,
    });

    const approvalReceipt =
      await input.publicClient.waitForTransactionReceipt({
        hash: approvalTxHash,
        pollingInterval: 6_000,
        timeout: 120_000,
      });

    if (approvalReceipt.status !== "success") {
      throw new Error("USDC approval did not confirm successfully.");
    }
  }

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

  const receipt = await input.publicClient.waitForTransactionReceipt({
    hash: txHash,
    pollingInterval: 6_000,
    timeout: 120_000,
  });

  if (receipt.status !== "success") {
    throw new Error(
      "The Gift Vault transaction was submitted but did not confirm successfully.",
    );
  }

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
      // Ignore logs emitted by other contracts, including the USDC interface.
    }
  }

  if (giftId === undefined) {
    throw new Error(
      "The transaction confirmed, but TrustVault could not identify the GiftCreated event. Do not submit the gift again.",
    );
  }

  return {
    giftId: giftId.toString(),
    txHash,
    explorerUrl: `${ARC_TESTNET_EXPLORER_URL}/tx/${txHash}`,
    approvalTxHash,
    amount: input.amount.trim(),
    amountBaseUnits: amountBaseUnits.toString(),
    unlockTimestamp: input.unlockTimestamp,
    contractAddress: TRUSTVAULT_GIFT_VAULT_ADDRESS,
    blockNumber: receipt.blockNumber.toString(),
  };
}



