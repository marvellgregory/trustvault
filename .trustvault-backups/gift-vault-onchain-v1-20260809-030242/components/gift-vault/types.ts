export type GiftData = {
  recipientName: string;
  walletAddress: string;
  amount: string;
  unlockDate: string;
  message: string;
};

export type GiftStepId = 1 | 2 | 3 | 4 | 5;

export const initialGiftData: GiftData = {
  recipientName: "",
  walletAddress: "",
  amount: "",
  unlockDate: "",
  message: "",
};
