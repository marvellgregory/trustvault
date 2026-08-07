export type DailyCheckInState = {
  walletAddress: string;
  currentCycleDay: number;
  longestCycleDay: number;
  lastCheckInDate?: string;
  totalCheckInPoints: number;
  cyclesCompleted: number;
  updatedAt: string;
};

export type DailyCheckInResult = {
  state: DailyCheckInState;
  awardedPoints: number;
  checkedInDay: number;
  bonusAwarded: boolean;
  alreadyCheckedIn: boolean;
};

const STORAGE_PREFIX = "trustvault.daily-checkin.v1:";

function isBrowser() {
  return typeof window !== "undefined";
}

function normalizeWalletAddress(walletAddress: string) {
  const normalized = walletAddress.trim();

  if (!/^0x[a-fA-F0-9]{40}$/.test(normalized)) {
    throw new Error("A valid wallet address is required.");
  }

  return normalized;
}

function key(walletAddress: string) {
  return `${STORAGE_PREFIX}${normalizeWalletAddress(walletAddress).toLowerCase()}`;
}

function localDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function parseLocalDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function isYesterday(previousDate: string, todayDate: string) {
  const previous = parseLocalDate(previousDate);
  previous.setDate(previous.getDate() + 1);

  return localDateKey(previous) === todayDate;
}

export function createDefaultDailyCheckInState(
  walletAddress: string,
): DailyCheckInState {
  return {
    walletAddress: normalizeWalletAddress(walletAddress),
    currentCycleDay: 0,
    longestCycleDay: 0,
    totalCheckInPoints: 0,
    cyclesCompleted: 0,
    updatedAt: new Date().toISOString(),
  };
}

export function loadDailyCheckInState(walletAddress: string) {
  const fallback = createDefaultDailyCheckInState(walletAddress);

  if (!isBrowser()) {
    return fallback;
  }

  try {
    const stored = window.localStorage.getItem(key(walletAddress));

    if (!stored) {
      return fallback;
    }

    const parsed = JSON.parse(stored) as Partial<DailyCheckInState>;

    return {
      ...fallback,
      ...parsed,
      walletAddress: fallback.walletAddress,
    } satisfies DailyCheckInState;
  } catch {
    return fallback;
  }
}

export function canCheckInToday(state: DailyCheckInState) {
  return state.lastCheckInDate !== localDateKey();
}

export function performDailyCheckIn(
  walletAddress: string,
): DailyCheckInResult {
  if (!isBrowser()) {
    throw new Error(
      "Daily check-in is only available in the browser.",
    );
  }

  const state = loadDailyCheckInState(walletAddress);
  const today = localDateKey();

  if (state.lastCheckInDate === today) {
    return {
      state,
      awardedPoints: 0,
      checkedInDay: state.currentCycleDay,
      bonusAwarded: false,
      alreadyCheckedIn: true,
    };
  }

  const continued =
    state.lastCheckInDate &&
    isYesterday(state.lastCheckInDate, today);

  const nextDay = continued
    ? state.currentCycleDay >= 7
      ? 1
      : state.currentCycleDay + 1
    : 1;

  const bonusAwarded = nextDay === 7;
  const awardedPoints = 5 + (bonusAwarded ? 25 : 0);

  const nextState: DailyCheckInState = {
    ...state,
    currentCycleDay: nextDay,
    longestCycleDay: Math.max(
      state.longestCycleDay,
      nextDay,
    ),
    lastCheckInDate: today,
    totalCheckInPoints:
      state.totalCheckInPoints + awardedPoints,
    cyclesCompleted:
      state.cyclesCompleted + (bonusAwarded ? 1 : 0),
    updatedAt: new Date().toISOString(),
  };

  window.localStorage.setItem(
    key(walletAddress),
    JSON.stringify(nextState),
  );

  return {
    state: nextState,
    awardedPoints,
    checkedInDay: nextDay,
    bonusAwarded,
    alreadyCheckedIn: false,
  };
}
