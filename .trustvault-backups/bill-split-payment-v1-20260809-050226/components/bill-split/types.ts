export type BillSplitMethod = "equal" | "custom";

export type BillSplitParticipant = {
  id: string;
  name: string;
  walletAddress: string;
  amountBaseUnits: string;
  amount: string;
  status: "pending" | "paid";
  transactionHash?: string;
  explorerUrl?: string;
  paidAt?: string;
};

export type BillSplit = {
  id: string;
  title: string;
  note?: string;
  totalAmount: string;
  totalBaseUnits: string;
  asset: "USDC";
  network: "Arc Testnet";
  organizerAddress: string;
  splitMethod: BillSplitMethod;
  participants: BillSplitParticipant[];
  createdAt: string;
  updatedAt: string;
  status: "active" | "settled";
};

export type BillSplitDraftParticipant = {
  id: string;
  name: string;
  walletAddress: string;
  customAmount: string;
};

export type BillSplitDraft = {
  title: string;
  note: string;
  totalAmount: string;
  splitMethod: BillSplitMethod;
  participants: BillSplitDraftParticipant[];
};
