import Image from "next/image";
import {
  Check,
  ChevronRight,
  WalletCards,
} from "lucide-react";

import type { WalletChooserProviderItem } from "@/components/wallet/useWalletProviderRegistry";
import { getWalletLogoSrc } from "@/lib/wallet/wallet-branding";

export function WalletProviderRow({
  item,
  onSelect,
}: {
  item: WalletChooserProviderItem;
  onSelect: (providerId: string) => void;
}) {
  const localLogo =
    getWalletLogoSrc(item.family?.key);

  const logoSrc =
    localLogo ?? item.identity.icon;

  return (
    <button
      type="button"
      disabled={!item.selectable}
      aria-pressed={item.selected}
      aria-label={`${item.selected ? "Selected" : "Select"} ${item.identity.name}`}
      onClick={() =>
        onSelect(item.identity.registryId)
      }
      className={`group flex min-h-20 w-full items-center gap-4 rounded-2xl border px-4 py-3 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:cursor-not-allowed disabled:opacity-60 ${
        item.selected
          ? "border-cyan-300/50 bg-cyan-300/10"
          : "border-white/10 bg-white/[0.035] hover:border-white/20 hover:bg-white/[0.07]"
      }`}
    >
      <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-white">
        {logoSrc ? (
          <Image
            src={logoSrc}
            alt=""
            width={48}
            height={48}
            unoptimized={
              logoSrc.startsWith("data:")
            }
            className="h-full w-full object-contain p-1"
          />
        ) : (
          <WalletCards
            aria-hidden="true"
            className="h-5 w-5 text-slate-500"
          />
        )}
      </span>

      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-white">
          {item.family?.displayName ??
            item.identity.name}
        </span>

        <span className="mt-1.5 flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${
              item.selectable
                ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-200"
                : "border-amber-400/20 bg-amber-400/10 text-amber-200"
            }`}
          >
            {item.record.state === "conflicted"
              ? "Provider conflict"
              : item.productionActionable
                ? "Available"
                : item.family?.userFacingReason ??
                  "Qualification required"}
          </span>

          {item.selected && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-cyan-200">
              <Check
                aria-hidden="true"
                className="h-3.5 w-3.5"
              />
              Selected
            </span>
          )}
        </span>
      </span>

      <ChevronRight
        aria-hidden="true"
        className="h-5 w-5 shrink-0 text-slate-500 transition group-hover:translate-x-0.5 group-hover:text-slate-200"
      />
    </button>
  );
}