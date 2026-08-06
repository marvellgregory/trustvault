import type {
  CustomerId,
} from "@/lib/account/customer-types";

export type TrustPointsEntryId =
  string;

export type TrustPointsEntryType =
  | "marketplace-purchase"
  | "gift-vault"
  | "bill-split"
  | "referral"
  | "bonus"
  | "voucher-redemption"
  | "adjustment";

export type TrustPointsEntryStatus =
  | "pending"
  | "confirmed"
  | "reversed";

export type TrustPointsEntry = {
  id: TrustPointsEntryId;

  customerId: CustomerId;
  walletAddress?: string;

  type: TrustPointsEntryType;
  status: TrustPointsEntryStatus;

  points: number;
  reason: string;

  sourceKey: string;

  orderId?: string;
  orderNumber?: string;
  transactionHash?: string;

  createdAt: string;
  confirmedAt?: string;
  reversedAt?: string;

  metadata?: Record<
    string,
    string | number | boolean | null
  >;
};

export type TrustPointsBalance = {
  customerId: CustomerId;

  confirmed: number;
  pending: number;
  lifetimeEarned: number;
  lifetimeRedeemed: number;

  updatedAt: string;
};

export type AwardMarketplaceTrustPointsInput = {
  customerId: CustomerId;
  walletAddress: string;

  orderId: string;
  orderNumber: string;
  transactionHash: string;

  amountUsdc: string;
};
