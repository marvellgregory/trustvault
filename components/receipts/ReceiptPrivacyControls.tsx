"use client";

import { Eye, EyeOff, ShieldCheck } from "lucide-react";

import type {
  ReceiptPrivacyOptions,
} from "@/components/receipts/receipt-types";

type ReceiptPrivacyControlsProps = {
  value: ReceiptPrivacyOptions;
  onChange: (value: ReceiptPrivacyOptions) => void;
};

const privacyOptions: Array<{
  key: keyof ReceiptPrivacyOptions;
  label: string;
  description: string;
}> = [
  {
    key: "showRecipientName",
    label: "Recipient name",
    description: "Include the recipient name on shared and downloaded receipts.",
  },
  {
    key: "showSenderAddress",
    label: "Sender wallet",
    description: "Show a shortened version of the sender wallet address.",
  },
  {
    key: "showRecipientAddress",
    label: "Recipient wallet",
    description: "Show a shortened version of the recipient wallet address.",
  },
  {
    key: "showPersonalMessage",
    label: "Personal message",
    description: "Include the private message written for the recipient.",
  },
  {
    key: "showTransactionHash",
    label: "Transaction hash",
    description: "Include the public onchain transaction identifier.",
  },
];

export function ReceiptPrivacyControls({
  value,
  onChange,
}: ReceiptPrivacyControlsProps) {
  function toggleOption(key: keyof ReceiptPrivacyOptions) {
    onChange({
      ...value,
      [key]: !value[key],
    });
  }

  return (
    <section
      aria-labelledby="receipt-privacy-title"
      className="mt-6 rounded-3xl border border-zinc-200 bg-white p-5"
    >
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-700">
          <ShieldCheck aria-hidden="true" className="h-5 w-5" />
        </span>

        <div>
          <h3
            id="receipt-privacy-title"
            className="text-sm font-semibold text-zinc-950"
          >
            Receipt privacy
          </h3>

          <p className="mt-1 text-xs leading-5 text-zinc-500">
            Choose what appears when this receipt is shared or downloaded.
          </p>
        </div>
      </div>

      <div className="mt-5 divide-y divide-zinc-200 overflow-hidden rounded-2xl border border-zinc-200">
        {privacyOptions.map((option) => {
          const isVisible = value[option.key];

          return (
            <button
              key={option.key}
              type="button"
              onClick={() => toggleOption(option.key)}
              aria-pressed={isVisible}
              className="flex w-full items-center gap-4 bg-white px-4 py-4 text-left transition hover:bg-zinc-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-zinc-950"
            >
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                  isVisible
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-zinc-100 text-zinc-500"
                }`}
              >
                {isVisible ? (
                  <Eye aria-hidden="true" className="h-4 w-4" />
                ) : (
                  <EyeOff aria-hidden="true" className="h-4 w-4" />
                )}
              </span>

              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-zinc-950">
                  {option.label}
                </span>

                <span className="mt-1 block text-xs leading-5 text-zinc-500">
                  {option.description}
                </span>
              </span>

              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  isVisible
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-zinc-100 text-zinc-500"
                }`}
              >
                {isVisible ? "Visible" : "Hidden"}
              </span>
            </button>
          );
        })}
      </div>

      <p className="mt-4 text-xs leading-5 text-zinc-500">
        These settings change the receipt presentation only. Public blockchain
        transaction data remains visible through the explorer.
      </p>
    </section>
  );
}
