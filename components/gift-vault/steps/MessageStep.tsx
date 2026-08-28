import { MessageSquareText } from "lucide-react";

import type { GiftData } from "@/components/gift-vault/types";
import {
  countGiftMessageWords,
  GIFT_MESSAGE_MAX_WORDS,
} from "@/components/gift-vault/validation";

type Props = {
  data: GiftData;
  updateField: <K extends keyof GiftData>(
    field: K,
    value: GiftData[K],
  ) => void;
};

export function MessageStep({
  data,
  updateField,
}: Props) {
  const wordCount =
    countGiftMessageWords(data.message);

  const isOverLimit =
    wordCount > GIFT_MESSAGE_MAX_WORDS;

  const guidanceClassName =
    isOverLimit
      ? "text-right text-xs font-semibold text-rose-700"
      : "text-right text-xs text-zinc-500";

  return (
    <div>
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-[var(--tv-brand)]">
        <MessageSquareText
          aria-hidden="true"
          className="h-5 w-5"
        />
      </span>

      <p className="mt-7 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
        Personal message
      </p>

      <h2 className="mt-3 text-3xl font-semibold tracking-[-0.045em] text-zinc-950 sm:text-4xl">
        Add a message they will remember.
      </h2>

      <p className="mt-4 max-w-2xl text-base leading-8 text-zinc-600">
        This message is optional and can contain up to 500 words.
        It will stay with the Gift Vault experience so it can be
        delivered to the recipient with the gift.
      </p>

      <label className="mt-8 grid gap-2">
        <span className="text-sm font-semibold text-zinc-800">
          Gift message{" "}
          <span className="font-normal text-zinc-400">
            (optional)
          </span>
        </span>

        <textarea
          rows={10}
          value={data.message}
          onChange={(event) =>
            updateField(
              "message",
              event.target.value,
            )
          }
          aria-invalid={isOverLimit}
          aria-describedby="gift-message-guidance"
          placeholder="Write a personal message for the recipient."
          className="resize-y rounded-2xl border border-zinc-300 bg-white p-4 text-base leading-7 text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-zinc-950 focus:ring-4 focus:ring-zinc-950/5"
        />

        <span
          id="gift-message-guidance"
          className={guidanceClassName}
        >
          {wordCount}/{GIFT_MESSAGE_MAX_WORDS} words
        </span>

        {isOverLimit && (
          <span
            role="alert"
            className="text-sm leading-6 text-rose-700"
          >
            Gift messages can contain up to 500 words.
            Shorten the message before continuing.
          </span>
        )}
      </label>
    </div>
  );
}
