import type {
  CustomerAccountProfile,
} from "@/lib/account/account-profile-store";
import type {
  DailyCheckInState,
} from "@/lib/account/daily-checkin-store";

export type TrustScoreFactor = {
  id: string;
  label: string;
  earned: number;
  maximum: number;
  description: string;
};

export type TrustScoreResult = {
  score: number;
  maximum: 100;
  label: "Building" | "Established" | "Strong" | "Excellent";
  factors: TrustScoreFactor[];
};

export function calculateTrustScore(input: {
  walletConnected: boolean;
  profile: CustomerAccountProfile;
  confirmedOrderCount: number;
  receiptCount: number;
  confirmedTrustPoints: number;
  checkIn: DailyCheckInState;
}): TrustScoreResult {
  const completedProfileFields = [
    input.profile.displayName,
    input.profile.email,
    input.profile.phone,
    input.profile.country,
  ].filter((value) => value.trim().length > 0).length;

  const profilePoints =
    (completedProfileFields / 4) * 20;

  const orderPoints = Math.min(
    input.confirmedOrderCount * 5,
    25,
  );

  const receiptPoints = Math.min(
    input.receiptCount * 3,
    15,
  );

  const streakPoints = Math.min(
    (input.checkIn.currentCycleDay / 7) * 10,
    10,
  );

  const rewardsPoints = Math.min(
    (input.confirmedTrustPoints / 100) * 10,
    10,
  );

  const factors: TrustScoreFactor[] = [
    {
      id: "wallet",
      label: "Connected wallet",
      earned: input.walletConnected ? 20 : 0,
      maximum: 20,
      description:
        "A wallet is connected to the TrustVault account.",
    },
    {
      id: "profile",
      label: "Profile completeness",
      earned: profilePoints,
      maximum: 20,
      description:
        "Name, email, phone and country improve account completeness.",
    },
    {
      id: "transactions",
      label: "Confirmed purchases",
      earned: orderPoints,
      maximum: 25,
      description:
        "Confirmed Marketplace settlements contribute to platform activity.",
    },
    {
      id: "receipts",
      label: "Saved receipts",
      earned: receiptPoints,
      maximum: 15,
      description:
        "Onchain transaction receipts recorded by TrustVault.",
    },
    {
      id: "checkins",
      label: "Daily engagement",
      earned: streakPoints,
      maximum: 10,
      description:
        "The current seven-day check-in cycle contributes to activity.",
    },
    {
      id: "rewards",
      label: "TrustPoints activity",
      earned: rewardsPoints,
      maximum: 10,
      description:
        "Confirmed Marketplace TrustPoints contribute to account activity.",
    },
  ];

  const score = Math.round(
    factors.reduce(
      (total, factor) => total + factor.earned,
      0,
    ),
  );

  return {
    score,
    maximum: 100,
    label:
      score >= 90
        ? "Excellent"
        : score >= 75
          ? "Strong"
          : score >= 50
            ? "Established"
            : "Building",
    factors,
  };
}
