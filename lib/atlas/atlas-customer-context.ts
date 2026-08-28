import type { TrustVaultSessionResponse } from "../aws/session-types.js";

export type AtlasCustomerDataSource =
  | "authenticated-cloud"
  | "authenticated-browser";

export type AtlasAuthenticatedCustomer = Readonly<{
  customerId: string;
  walletAddress: string;
  chainId: 5_042_002;
  expiresAt: string;
  source: "trustvault-session";
}>;

export function createAtlasAuthenticatedCustomer(
  session: TrustVaultSessionResponse,
): AtlasAuthenticatedCustomer {
  return {
    customerId: session.customerId,
    walletAddress: session.walletAddress,
    chainId: session.chainId,
    expiresAt: session.expiresAt,
    source: "trustvault-session",
  };
}

export type AtlasCustomerReadState<T> =
  | {
      status: "available";
      records: readonly T[];
    }
  | {
      status: "unavailable";
    };

export type AtlasOwnedCollectionAdapter<T> = {
  readonly authenticatedCustomerId: string;
  readonly source: AtlasCustomerDataSource;
  findAll(): Promise<AtlasCustomerReadState<T>>;
};

export type AtlasOwnedLookupAdapter<T> = {
  readonly authenticatedCustomerId: string;
  readonly source: AtlasCustomerDataSource;
  findById(id: string): Promise<T | null | undefined>;
};

export type AtlasMarketplaceOrderRecord = {
  id: string;
  orderNumber: string;
  status: string;
  itemTitles: readonly string[];
  totalAmount: string;
  asset: string;
  sellerName: string;
  paymentStatus: string;
  receiptId?: string;
  createdAt: string;
  fulfillment: {
    status: string;
    carrier?: string;
    trackingNumber?: string;
  };
};

export type AtlasReceiptRecord = {
  id: string;
  title: string;
  type: string;
  status: string;
  amount: string;
  asset: string;
  createdAt: string;
  orderId?: string;
  billSplitId?: string;
  giftVaultId?: string;
  transactionHash?: string;
  explorerUrl?: string;
};

export type AtlasGiftRecord = {
  id: string;
  senderAddress: string;
  recipientAddress: string;
  amountBaseUnits: string;
  unlockTimestamp: string;
  message: string;
  createdAt: string;
};

export type AtlasBillSplitRecord = {
  id: string;
  title: string;
  status: "active" | "settled";
  totalAmount: string;
  asset: "USDC";
  participantCount: number;
  settledShareCount: number;
  createdAt: string;
};

export type AtlasCustomerReadAdapters = {
  marketplaceOrders?: AtlasOwnedCollectionAdapter<AtlasMarketplaceOrderRecord>;
  receipts?: AtlasOwnedCollectionAdapter<AtlasReceiptRecord>;
  gifts?: AtlasOwnedLookupAdapter<AtlasGiftRecord>;
  billSplits?: AtlasOwnedCollectionAdapter<AtlasBillSplitRecord>;
};

export function hasAuthorizedCustomerContext(
  context: {
    isAuthenticated: boolean;
    authenticatedCustomer?: AtlasAuthenticatedCustomer;
  },
): context is {
  isAuthenticated: true;
  authenticatedCustomer: AtlasAuthenticatedCustomer;
} {
  return Boolean(
    context.isAuthenticated &&
      context.authenticatedCustomer?.source === "trustvault-session" &&
      context.authenticatedCustomer.customerId.trim() &&
      /^0x[a-fA-F0-9]{40}$/.test(context.authenticatedCustomer.walletAddress) &&
      context.authenticatedCustomer.chainId === 5_042_002 &&
      Date.parse(context.authenticatedCustomer.expiresAt) > Date.now(),
  );
}

export function adapterBelongsToCustomer(
  adapter: { authenticatedCustomerId: string },
  customer: AtlasAuthenticatedCustomer,
): boolean {
  return adapter.authenticatedCustomerId === customer.customerId;
}
