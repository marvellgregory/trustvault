import { CalendarClock, Clock3, Globe2 } from "lucide-react";

import type { GiftData } from "@/components/gift-vault/types";
import {
  GIFT_VAULT_TIME_ZONES,
  formatGiftUnlock,
  zonedDateTimeToUnixSeconds,
} from "@/lib/gift-vault/timezone";

type Props = {
  data: GiftData;
  touched: Record<string, boolean>;
  today: string;
  updateField: <K extends keyof GiftData>(
    field: K,
    value: GiftData[K],
  ) => void;
  markTouched: (field: keyof GiftData) => void;
};

function getPreview(data: GiftData) {
  if (
    !data.unlockDate ||
    !data.unlockTime ||
    !data.timeZone
  ) {
    return null;
  }

  try {
    const unix = zonedDateTimeToUnixSeconds(
      data.unlockDate,
      data.unlockTime,
      data.timeZone,
    );

    return {
      unix,
      ...formatGiftUnlock(unix, data.timeZone),
      isFuture:
        unix > Math.floor(Date.now() / 1000),
    };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "The unlock time is invalid.",
    };
  }
}

export function UnlockStep({
  data,
  touched,
  today,
  updateField,
  markTouched,
}: Props) {
  const preview = getPreview(data);

  return (
    <div>
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-[var(--tv-brand)]">
        <CalendarClock
          aria-hidden="true"
          className="h-5 w-5"
        />
      </span>

      <p className="mt-7 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
        Unlock schedule
      </p>

      <h2 className="mt-3 text-3xl font-semibold tracking-[-0.045em] text-zinc-950 sm:text-4xl">
        When should the gift become claimable?
      </h2>

      <p className="mt-4 max-w-2xl text-base leading-8 text-zinc-600">
        Choose the recipient&apos;s intended local date, time and
        timezone. TrustVault converts it to one canonical UTC
        timestamp that the Arc Testnet Gift Vault contract enforces.
      </p>

      <div className="mt-8 grid max-w-2xl gap-5 sm:grid-cols-2">
        <label className="grid gap-2">
          <span className="text-sm font-semibold text-zinc-800">
            Unlock date
          </span>
          <input
            type="date"
            min={today}
            value={data.unlockDate}
            onChange={(event) =>
              updateField(
                "unlockDate",
                event.target.value,
              )
            }
            onBlur={() => markTouched("unlockDate")}
            className="min-h-13 rounded-2xl border border-zinc-300 bg-white px-4 text-base text-zinc-950 outline-none transition focus:border-zinc-950 focus:ring-4 focus:ring-zinc-950/5"
          />
        </label>

        <label className="grid gap-2">
          <span className="flex items-center gap-2 text-sm font-semibold text-zinc-800">
            <Clock3
              aria-hidden="true"
              className="h-4 w-4"
            />
            Unlock time
          </span>
          <input
            type="time"
            value={data.unlockTime}
            onChange={(event) =>
              updateField(
                "unlockTime",
                event.target.value,
              )
            }
            onBlur={() => markTouched("unlockTime")}
            className="min-h-13 rounded-2xl border border-zinc-300 bg-white px-4 text-base text-zinc-950 outline-none transition focus:border-zinc-950 focus:ring-4 focus:ring-zinc-950/5"
          />
        </label>

        <label className="grid gap-2 sm:col-span-2">
          <span className="flex items-center gap-2 text-sm font-semibold text-zinc-800">
            <Globe2
              aria-hidden="true"
              className="h-4 w-4"
            />
            Timezone
          </span>

          <select
            value={data.timeZone}
            onChange={(event) =>
              updateField(
                "timeZone",
                event.target.value,
              )
            }
            onBlur={() => markTouched("timeZone")}
            className="min-h-13 rounded-2xl border border-zinc-300 bg-white px-4 text-base text-zinc-950 outline-none transition focus:border-zinc-950 focus:ring-4 focus:ring-zinc-950/5"
          >
            {!GIFT_VAULT_TIME_ZONES.some(
              (zone) => zone.value === data.timeZone,
            ) &&
              data.timeZone && (
                <option value={data.timeZone}>
                  {data.timeZone} (device timezone)
                </option>
              )}

            {GIFT_VAULT_TIME_ZONES.map((zone) => (
              <option
                key={zone.value}
                value={zone.value}
              >
                {zone.label} — {zone.value}
              </option>
            ))}
          </select>
        </label>
      </div>

      {(touched.unlockDate ||
        touched.unlockTime ||
        touched.timeZone) &&
        (!preview ||
          "error" in preview ||
          !preview.isFuture) && (
          <p className="mt-4 text-sm text-rose-700">
            {preview && "error" in preview
              ? preview.error
              : "Choose a valid unlock moment in the future."}
          </p>
        )}

      {preview &&
        !("error" in preview) &&
        preview.isFuture && (
          <div className="mt-6 max-w-2xl rounded-3xl border border-emerald-200 bg-emerald-50/60 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">
              Exact onchain unlock
            </p>

            <p className="mt-2 text-lg font-semibold text-zinc-950">
              {preview.local}
            </p>

            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-zinc-500">
                  Canonical UTC
                </dt>
                <dd className="mt-1 break-all font-mono text-xs font-semibold text-zinc-800">
                  {preview.utc}
                </dd>
              </div>

              <div>
                <dt className="text-zinc-500">
                  Unix timestamp
                </dt>
                <dd className="mt-1 font-mono text-xs font-semibold text-zinc-800">
                  {preview.unix}
                </dd>
              </div>
            </dl>

            <p className="mt-4 text-xs leading-5 text-zinc-600">
              The gift becomes claimable at the first valid Arc
              block whose timestamp is at or after this instant.
            </p>
          </div>
        )}
    </div>
  );
}
