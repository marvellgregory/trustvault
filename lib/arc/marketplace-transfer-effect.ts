import { decodeEventLog, parseAbi, parseUnits, type TransactionReceipt } from "viem";

import { ARC_TESTNET_CHAIN_ID, ARC_TESTNET_USDC_ADDRESS } from "./arc-testnet-assets";

const transferAbi = parseAbi(["event Transfer(address indexed from,address indexed to,uint256 value)"]);
export type MarketplaceTransferEffectStatus = "VALID" | "RECEIPT_FAILED" | "WRONG_CHAIN" | "TRANSFER_NOT_FOUND" | "WRONG_TOKEN" | "WRONG_RECIPIENT" | "WRONG_AMOUNT" | "WRONG_SENDER" | "AMBIGUOUS_TRANSFER" | "MALFORMED_LOG";
export type MarketplaceTransferEffectResult = Readonly<{ status: MarketplaceTransferEffectStatus; reason?: string }>;

export type ArcUsdcTransferEffectStatus = MarketplaceTransferEffectStatus;
export type ArcUsdcTransferEffectResult = MarketplaceTransferEffectResult;

export function validateArcUsdcTransferEffect(input: { receipt: TransactionReceipt; chainId: number; expectedSender: `0x${string}`; expectedRecipient: `0x${string}`; expectedAmountBaseUnits: bigint }): ArcUsdcTransferEffectResult {
  if (input.chainId !== ARC_TESTNET_CHAIN_ID) return Object.freeze({ status: "WRONG_CHAIN", reason: "Receipt was not obtained from Arc Testnet." });
  if (input.receipt.status !== "success") return Object.freeze({ status: "RECEIPT_FAILED", reason: "Transaction receipt is not successful." });
  const transferTopic = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
  const transferLogs = input.receipt.logs.filter((log) => log.topics[0]?.toLowerCase() === transferTopic);
  if (transferLogs.length === 0) return Object.freeze({ status: "TRANSFER_NOT_FOUND", reason: "No ERC-20 Transfer event was found." });
  const tokenLogs = transferLogs.filter((log) => log.address.toLowerCase() === ARC_TESTNET_USDC_ADDRESS.toLowerCase());
  if (tokenLogs.length === 0) return Object.freeze({ status: "WRONG_TOKEN", reason: "No linked Arc USDC transfer was found." });
  const decoded: { from: string; to: string; value: bigint }[] = [];
  for (const log of tokenLogs) {
    try {
      const event = decodeEventLog({ abi: transferAbi, data: log.data, topics: log.topics });
      if (event.eventName === "Transfer") decoded.push(event.args);
    } catch {
      return Object.freeze({ status: "MALFORMED_LOG", reason: "A linked USDC Transfer log was malformed." });
    }
  }
  const recipientMatches = decoded.filter((event) => event.to.toLowerCase() === input.expectedRecipient.toLowerCase());
  if (recipientMatches.length === 0) return Object.freeze({ status: "WRONG_RECIPIENT", reason: "Linked USDC was not transferred to the reviewed recipient." });
  const amountMatches = recipientMatches.filter((event) => event.value === input.expectedAmountBaseUnits);
  if (amountMatches.length === 0) return Object.freeze({ status: "WRONG_AMOUNT", reason: "Linked USDC transfer amount differs from the reviewed amount." });
  const senderMatches = amountMatches.filter((event) => event.from.toLowerCase() === input.expectedSender.toLowerCase());
  if (senderMatches.length === 0) return Object.freeze({ status: "WRONG_SENDER", reason: "Linked USDC transfer sender differs from the reviewed buyer." });
  if (senderMatches.length !== 1) return Object.freeze({ status: "AMBIGUOUS_TRANSFER", reason: "Multiple indistinguishable reviewed USDC transfers were found." });
  return Object.freeze({ status: "VALID" });
}

export function validateMarketplaceTransferEffect(input: { receipt: TransactionReceipt; chainId: number; expectedSender: `0x${string}`; expectedRecipient: `0x${string}`; expectedAmount: string }): MarketplaceTransferEffectResult {
  return validateArcUsdcTransferEffect({
    receipt: input.receipt,
    chainId: input.chainId,
    expectedSender: input.expectedSender,
    expectedRecipient: input.expectedRecipient,
    expectedAmountBaseUnits: parseUnits(input.expectedAmount, 6),
  });
}
