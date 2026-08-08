export type GiftData = {
  recipientName: string;
  walletAddress: string;
  amount: string;
  unlockDate: string;
  unlockTime: string;
  timeZone: string;
  message: string;
};

export type GiftStepId = 1 | 2 | 3 | 4 | 5;

export const initialGiftData: GiftData = {
  recipientName: "",
  walletAddress: "",
  amount: "",
  unlockDate: "",
  unlockTime: "",
  timeZone: "",
  message: "",
};
