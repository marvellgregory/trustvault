"use client";

import {
  LockKeyhole,
  MessageSquareText,
  RefreshCcw,
  ShieldCheck,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  fetchGiftVault,
  type PersistedGiftVault,
} from "@/lib/aws/gift-vault-client";

type LoadState =
  | "idle"
  | "loading"
  | "loaded"
  | "unavailable";

type Props = {
  giftId: string;
  connectedIsRecipient: boolean;
};

export function GiftVaultPrivateMessage({
  giftId,
  connectedIsRecipient,
}: Props) {
  const [state, setState] =
    useState<LoadState>("idle");

  const [gift, setGift] =
    useState<PersistedGiftVault | null>(null);

  const [notice, setNotice] =
    useState<string | null>(null);

  const applyResult = useCallback(
    (
      result: Awaited<
        ReturnType<typeof fetchGiftVault>
      >,
    ) => {
      if (!result.ok) {
        setGift(null);
        setState("unavailable");

        if (
          result.code === "SESSION_MISSING" ||
          result.status === 401
        ) {
          setNotice(
            "Authenticate this recipient wallet in your TrustVault account to read the private gift message.",
          );
          return;
        }

        if (
          result.status === 404 ||
          result.code.includes("NOT_FOUND")
        ) {
          setNotice(
            "No private Gift Vault message is available for this authenticated wallet.",
          );
          return;
        }

        setNotice(
          "TrustVault could not load the private gift message. The onchain Gift Vault remains unaffected.",
        );
        return;
      }

      setGift(result.gift);
      setNotice(null);
      setState("loaded");
    },
    [],
  );

  const loadMessage = useCallback(
    async () => {
      if (!connectedIsRecipient) {
        return;
      }

      setState("loading");
      setNotice(null);

      const result =
        await fetchGiftVault(giftId);

      applyResult(result);
    },
    [
      applyResult,
      connectedIsRecipient,
      giftId,
    ],
  );

  useEffect(() => {
    if (!connectedIsRecipient) {
      return;
    }

    let active = true;

    async function loadPrivateMessage() {
      const result =
        await fetchGiftVault(giftId);

      if (!active) {
        return;
      }

      applyResult(result);
    }

    void loadPrivateMessage();

    return () => {
      active = false;
    };
  }, [
    applyResult,
    connectedIsRecipient,
    giftId,
  ]);

  if (!connectedIsRecipient) {
    return (
      <section className="mt-6 rounded-3xl border border-zinc-200 bg-zinc-50 p-5">
        <div className="flex items-start gap-3">
          <LockKeyhole className="mt-0.5 h-5 w-5 shrink-0 text-zinc-500" />

          <div>
            <p className="text-sm font-semibold text-zinc-950">
              Private gift message
            </p>

            <p className="mt-1 text-xs leading-5 text-zinc-600">
              Connect the recipient wallet to access private Gift Vault details.
            </p>
          </div>
        </div>
      </section>
    );
  }

  if (state === "loading") {
    return (
      <section className="mt-6 rounded-3xl border border-zinc-200 bg-zinc-50 p-5">
        <div className="flex items-center gap-3">
          <RefreshCcw className="h-5 w-5 animate-spin text-zinc-500" />

          <p className="text-sm font-semibold text-zinc-800">
            Checking private Gift Vault details…
          </p>
        </div>
      </section>
    );
  }

  if (
    state === "loaded" &&
    gift
  ) {
    return (
      <section className="mt-6 overflow-hidden rounded-3xl border border-zinc-200 bg-white">
        <div className="border-b border-zinc-200 bg-zinc-50 px-5 py-4">
          <div className="flex items-center gap-2">
            <MessageSquareText className="h-5 w-5 text-[var(--tv-brand)]" />

            <p className="text-sm font-semibold text-zinc-950">
              Private gift message
            </p>
          </div>
        </div>

        <div className="p-5">
          {gift.message.trim() ? (
            <p className="whitespace-pre-wrap break-words text-sm leading-7 text-zinc-700">
              {gift.message}
            </p>
          ) : (
            <p className="text-sm leading-6 text-zinc-500">
              The sender did not add a personal message.
            </p>
          )}

          <div className="mt-5 flex items-start gap-2 border-t border-zinc-100 pt-4">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500" />

            <p className="text-xs leading-5 text-zinc-500">
              This private message is stored with TrustVault account metadata.
              Gift settlement and claimability remain determined by the
              deployed smart contract.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="mt-6 rounded-3xl border border-zinc-200 bg-zinc-50 p-5">
      <div className="flex items-start gap-3">
        <LockKeyhole className="mt-0.5 h-5 w-5 shrink-0 text-zinc-500" />

        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-zinc-950">
            Private gift message
          </p>

          <p className="mt-1 text-xs leading-5 text-zinc-600">
            {notice ||
              "Private Gift Vault details require an authenticated recipient session."}
          </p>

          <button
            type="button"
            onClick={() =>
              void loadMessage()
            }
            className="mt-4 inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-zinc-300 bg-white px-4 text-xs font-semibold text-zinc-950"
          >
            <RefreshCcw className="h-4 w-4" />
            Try again
          </button>
        </div>
      </div>
    </section>
  );
}
