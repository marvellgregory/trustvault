import type { GiftData } from "@/components/gift-vault/types";
import {
  formatGiftUnlock,
  zonedDateTimeToUnixSeconds,
} from "@/lib/gift-vault/timezone";

export function ReviewSummary({
  data,
}: {
  data: GiftData;
}) {
  let unlock = "Invalid unlock schedule";

  try {
    const unix = zonedDateTimeToUnixSeconds(
      data.unlockDate,
      data.unlockTime,
      data.timeZone,
    );
    unlock = formatGiftUnlock(
      unix,
      data.timeZone,
    ).local;
  } catch {
    // Validation blocks submission; retain a clear review value.
  }

  const rows = [
    ["Recipient", data.recipientName],
    ["Wallet", data.walletAddress],
    ["Amount", `${data.amount} USDC`],
    ["Unlock", unlock],
    ["Timezone", data.timeZone],
    ["Network", "Arc Testnet"],
    [
      "Message",
      data.message || "No message added",
    ],
  ];

  return (
    <div className="mt-8 overflow-hidden rounded-3xl border border-zinc-200">
      <dl className="divide-y divide-zinc-200">
        {rows.map(([label, value]) => (
          <div
            key={label}
            className="grid gap-2 bg-white px-5 py-4 sm:grid-cols-[10rem_1fr]"
          >
            <dt className="text-sm font-medium text-zinc-500">
              {label}
            </dt>
            <dd className="min-w-0 break-words text-sm font-semibold text-zinc-950">
              {value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
