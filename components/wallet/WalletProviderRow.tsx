import Image from "next/image";
import { Check, ChevronRight, ShieldAlert, WalletCards } from "lucide-react";

import type { WalletChooserProviderItem } from "@/components/wallet/useWalletProviderRegistry";

export function WalletProviderRow({ item, onSelect }: {
  item: WalletChooserProviderItem;
  onSelect: (providerId: string) => void;
}) {
  return (
    <button
      type="button"
      disabled={!item.selectable}
      aria-pressed={item.selected}
      aria-label={`${item.selected ? "Selected" : "Select"} ${item.identity.name}`}
      onClick={() => onSelect(item.identity.registryId)}
      className={`group flex min-h-20 w-full items-center gap-4 rounded-2xl border px-4 py-3 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:cursor-not-allowed disabled:opacity-60 ${
        item.selected
          ? "border-cyan-300/50 bg-cyan-300/10"
          : "border-white/10 bg-white/[0.035] hover:border-white/20 hover:bg-white/[0.07]"
      }`}
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-white/10 text-slate-200">
        {item.identity.icon ? (
          <Image src={item.identity.icon} alt="" width={44} height={44} unoptimized className="h-full w-full object-cover" />
        ) : item.selectable ? (
          <WalletCards aria-hidden="true" className="h-5 w-5" />
        ) : (
          <ShieldAlert aria-hidden="true" className="h-5 w-5" />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-white">
          {item.identity.name}
        </span>
        <span className="mt-1.5 flex flex-wrap items-center gap-2">
          <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${item.selectable ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-200" : "border-amber-400/20 bg-amber-400/10 text-amber-200"}`}>
            {item.record.state === "conflicted" ? "Provider conflict" : item.productionActionable ? "Available" : item.family?.userFacingReason ?? "Development only"}
          </span>
          {item.selected && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-cyan-200">
              <Check aria-hidden="true" className="h-3.5 w-3.5" /> Selected
            </span>
          )}
          <span className="text-[11px] font-semibold text-slate-400">Qualification required</span>
        </span>
      </span>
      <ChevronRight aria-hidden="true" className="h-5 w-5 shrink-0 text-slate-500 transition group-hover:translate-x-0.5 group-hover:text-slate-200" />
    </button>
  );
}
