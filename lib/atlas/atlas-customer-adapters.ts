import type { BillSplit } from "../../components/bill-split/types.js";
import type { TransactionReceiptData } from "../../components/receipts/receipt-types.js";
import type { PersistedGiftVault } from "../aws/gift-vault-client.js";
import type { MarketplaceOrder } from "../marketplace/order-types.js";
import type {
  AtlasAuthenticatedCustomer,
  AtlasBillSplitRecord,
  AtlasGiftRecord,
  AtlasMarketplaceOrderRecord,
  AtlasOwnedCollectionAdapter,
  AtlasOwnedLookupAdapter,
  AtlasReceiptRecord,
} from "./atlas-customer-context.js";

function mapOrder(order: MarketplaceOrder): AtlasMarketplaceOrderRecord {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    itemTitles: order.items.map((item) => item.snapshot.title),
    totalAmount: order.totals.total.amount,
    asset: order.totals.total.currency,
    sellerName: order.seller.storeName ?? order.seller.displayName,
    paymentStatus: order.payment.status,
    ...(order.receipt?.receiptId ? { receiptId: order.receipt.receiptId } : {}),
    createdAt: order.createdAt,
    fulfillment: {
      status: order.fulfillment.status,
      ...(order.fulfillment.carrier ? { carrier: order.fulfillment.carrier } : {}),
      ...(order.fulfillment.trackingNumber
        ? { trackingNumber: order.fulfillment.trackingNumber }
        : {}),
    },
  };
}

function mapReceipt(receipt: TransactionReceiptData): AtlasReceiptRecord {
  return {
    id: receipt.id,
    title: receipt.title,
    type: receipt.type,
    status: receipt.status,
    amount: receipt.amount,
    asset: receipt.asset,
    createdAt: receipt.createdAt,
    ...(receipt.orderId ? { orderId: receipt.orderId } : {}),
    ...(receipt.billSplitId ? { billSplitId: receipt.billSplitId } : {}),
    ...(receipt.giftVaultId ? { giftVaultId: receipt.giftVaultId } : {}),
    ...(receipt.transactionHash ? { transactionHash: receipt.transactionHash } : {}),
    ...(receipt.explorerUrl ? { explorerUrl: receipt.explorerUrl } : {}),
  };
}

function mapGift(gift: PersistedGiftVault): AtlasGiftRecord {
  return {
    id: gift.id,
    senderAddress: gift.senderAddress,
    recipientAddress: gift.recipientAddress,
    amountBaseUnits: gift.amountBaseUnits,
    unlockTimestamp: gift.unlockTimestamp,
    message: gift.message,
    createdAt: gift.createdAt,
  };
}

function mapBillSplit(bill: BillSplit): AtlasBillSplitRecord {
  return {
    id: bill.id,
    title: bill.title,
    status: bill.status,
    totalAmount: bill.totalAmount,
    asset: bill.asset,
    participantCount: bill.participants.length,
    settledShareCount: bill.participants.filter(
      (participant) => participant.status === "paid",
    ).length,
    createdAt: bill.createdAt,
  };
}

export function createMarketplaceOrderReadAdapter(
  customer: AtlasAuthenticatedCustomer,
): AtlasOwnedCollectionAdapter<AtlasMarketplaceOrderRecord> {
  return {
    authenticatedCustomerId: customer.customerId,
    source: "authenticated-cloud",
    async findAll() {
      const { loadMarketplaceOrdersFromCloud } = await import(
        "../aws/marketplace-order-sync.js"
      );
      const result = await loadMarketplaceOrdersFromCloud();
      return result.state === "persisted"
        ? { status: "available", records: result.orders.map(mapOrder) }
        : { status: "unavailable" };
    },
  };
}

export function createReceiptReadAdapter(
  customer: AtlasAuthenticatedCustomer,
): AtlasOwnedCollectionAdapter<AtlasReceiptRecord> {
  return {
    authenticatedCustomerId: customer.customerId,
    source: "authenticated-cloud",
    async findAll() {
      const { loadMarketplaceReceiptsFromCloud } = await import(
        "../aws/marketplace-receipt-sync.js"
      );
      const result = await loadMarketplaceReceiptsFromCloud();
      return result.state === "persisted"
        ? { status: "available", records: result.receipts.map(mapReceipt) }
        : { status: "unavailable" };
    },
  };
}

export function createGiftReadAdapter(
  customer: AtlasAuthenticatedCustomer,
): AtlasOwnedLookupAdapter<AtlasGiftRecord> {
  return {
    authenticatedCustomerId: customer.customerId,
    source: "authenticated-cloud",
    async findById(id) {
      const { fetchGiftVault } = await import("../aws/gift-vault-client.js");
      const result = await fetchGiftVault(id);
      return result.ok ? mapGift(result.gift) : null;
    },
  };
}

export function createBrowserBillSplitReadAdapter(
  customer: AtlasAuthenticatedCustomer,
): AtlasOwnedCollectionAdapter<AtlasBillSplitRecord> {
  return {
    authenticatedCustomerId: customer.customerId,
    source: "authenticated-browser",
    async findAll() {
      const { browserBillSplitRepository } = await import(
        "../bill-split/bill-repository.js"
      );
      const bills = await browserBillSplitRepository.findAll();
      const sessionWallet = customer.walletAddress.toLowerCase();
      return {
        status: "available",
        records: bills
          .filter((bill) => bill.organizerAddress.toLowerCase() === sessionWallet)
          .map(mapBillSplit),
      };
    },
  };
}
