import {
  formatUnits,
  isAddress,
  type PublicClient,
  type WalletClient,
} from "viem";
import { arcTestnet } from "viem/chains";

import { browserBillSplitRepository } from "@/lib/bill-split/bill-repository";
import {
  ARC_TESTNET_EXPLORER_URL,
  ARC_TESTNET_USDC_ADDRESS,
  billSplitUsdcAbi,
} from "@/lib/bill-split/payment-config";
import {
  billSplitPaymentRecovery,
  type PendingBillSplitPayment,
} from "@/lib/bill-split/payment-recovery";

export type BillSplitPaymentResult = {
  txHash: `0x${string}`;
  explorerUrl: string;
  blockNumber: string;
};

export type BillSplitFundingState = {
  balanceBaseUnits: bigint;
  balance: string;
  hasEnough: boolean;
};

export async function readBillSplitFundingState(input: {
  publicClient: PublicClient;
  payerAddress: `0x${string}`;
  amountBaseUnits: bigint;
}): Promise<BillSplitFundingState> {
  const balance = await input.publicClient.readContract({
    address: ARC_TESTNET_USDC_ADDRESS,
    abi: billSplitUsdcAbi,
    functionName: "balanceOf",
    args: [input.payerAddress],
  });

  return {
    balanceBaseUnits: balance,
    balance: formatUnits(balance, 6),
    hasEnough: balance >= input.amountBaseUnits,
  };
}

export async function submitBillSplitPayment(input: {
  publicClient: PublicClient;
  walletClient: WalletClient;
  chainId: number;
  billId: string;
  participantId: string;
  connectedAddress: `0x${string}`;
  participantAddress: string;
  organizerAddress: string;
  amountBaseUnits: bigint;
}): Promise<BillSplitPaymentResult> {
  if (input.chainId !== arcTestnet.id) {
    throw new Error("Switch your wallet to Arc Testnet before paying this share.");
  }

  if (!isAddress(input.participantAddress)) {
    throw new Error("Participant wallet address is invalid.");
  }

  if (!isAddress(input.organizerAddress)) {
    throw new Error("Organizer settlement wallet is invalid.");
  }

  if (
    input.connectedAddress.toLowerCase() !==
    input.participantAddress.toLowerCase()
  ) {
    throw new Error("The connected wallet does not match this participant.");
  }

  if (
    input.connectedAddress.toLowerCase() ===
    input.organizerAddress.toLowerCase()
  ) {
    throw new Error(
      "The organizer's own share is self-settled and does not require an onchain transfer.",
    );
  }

  const account = input.walletClient.account;

  if (!account) {
    throw new Error("Wallet account is unavailable. Reconnect your wallet.");
  }

  if (
    account.address.toLowerCase() !== input.connectedAddress.toLowerCase()
  ) {
    throw new Error(
      "The signing wallet does not match the connected TrustVault wallet.",
    );
  }

  const funding = await readBillSplitFundingState({
    publicClient: input.publicClient,
    payerAddress: input.connectedAddress,
    amountBaseUnits: input.amountBaseUnits,
  });

  if (!funding.hasEnough) {
    throw new Error(
      `Insufficient Arc Testnet USDC. Available: ${funding.balance} USDC.`,
    );
  }

  const txHash = await input.walletClient.writeContract({
    address: ARC_TESTNET_USDC_ADDRESS,
    abi: billSplitUsdcAbi,
    functionName: "transfer",
    args: [
      input.organizerAddress as `0x${string}`,
      input.amountBaseUnits,
    ],
    account,
    chain: arcTestnet,
  });

  billSplitPaymentRecovery.save({
    billId: input.billId,
    participantId: input.participantId,
    txHash,
    payerAddress: input.connectedAddress,
    organizerAddress: input.organizerAddress as `0x${string}`,
    amountBaseUnits: input.amountBaseUnits.toString(),
    submittedAt: new Date().toISOString(),
  });

  return confirmBillSplitPayment({
    publicClient: input.publicClient,
    pendingPayment: billSplitPaymentRecovery.get(
      input.billId,
      input.participantId,
    )!,
  });
}

export async function confirmBillSplitPayment(input: {
  publicClient: PublicClient;
  pendingPayment: PendingBillSplitPayment;
}): Promise<BillSplitPaymentResult> {
  const receipt = await input.publicClient.waitForTransactionReceipt({
    hash: input.pendingPayment.txHash,
    pollingInterval: 6_000,
    timeout: 120_000,
  });

  if (receipt.status !== "success") {
    throw new Error(
      "The Bill Split transaction was submitted but did not confirm successfully.",
    );
  }

  const explorerUrl =
    `${ARC_TESTNET_EXPLORER_URL}/tx/${input.pendingPayment.txHash}`;

  await browserBillSplitRepository.markParticipantPaid({
    billId: input.pendingPayment.billId,
    participantId: input.pendingPayment.participantId,
    transactionHash: input.pendingPayment.txHash,
    explorerUrl,
  });

  billSplitPaymentRecovery.remove(
    input.pendingPayment.billId,
    input.pendingPayment.participantId,
  );

  return {
    txHash: input.pendingPayment.txHash,
    explorerUrl,
    blockNumber: receipt.blockNumber.toString(),
  };
}
