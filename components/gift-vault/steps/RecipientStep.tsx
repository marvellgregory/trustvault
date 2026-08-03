import { UserRound } from "lucide-react";
import type { GiftData } from "@/components/gift-vault/types";
import { isValidWalletAddress } from "@/components/gift-vault/validation";

type Props = { data: GiftData; touched: Record<string, boolean>; updateField: <K extends keyof GiftData>(field: K, value: GiftData[K]) => void; markTouched: (field: keyof GiftData) => void; };

export function RecipientStep({ data, touched, updateField, markTouched }: Props) {
  return <div>
    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-[var(--tv-brand)]"><UserRound aria-hidden="true" className="h-5 w-5" /></span>
    <p className="mt-7 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">Recipient</p>
    <h2 className="mt-3 text-3xl font-semibold tracking-[-0.045em] text-zinc-950 sm:text-4xl">Who is this gift for?</h2>
    <p className="mt-4 max-w-2xl text-base leading-8 text-zinc-600">Add a name you recognize and the wallet address that will receive the future Gift Vault.</p>
    <div className="mt-8 grid gap-6">
      <label className="grid gap-2"><span className="text-sm font-semibold text-zinc-800">Recipient name</span><input value={data.recipientName} onChange={(e)=>updateField("recipientName",e.target.value)} onBlur={()=>markTouched("recipientName")} placeholder="e.g. Maya" className="min-h-13 rounded-2xl border border-zinc-300 bg-white px-4 text-base text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-zinc-950 focus:ring-4 focus:ring-zinc-950/5" />{touched.recipientName && data.recipientName.trim().length < 2 && <span className="text-sm text-rose-700">Enter a recipient name.</span>}</label>
      <label className="grid gap-2"><span className="text-sm font-semibold text-zinc-800">Recipient wallet address</span><input value={data.walletAddress} onChange={(e)=>updateField("walletAddress",e.target.value)} onBlur={()=>markTouched("walletAddress")} placeholder="0x..." autoComplete="off" className="min-h-13 rounded-2xl border border-zinc-300 bg-white px-4 font-mono text-sm text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-zinc-950 focus:ring-4 focus:ring-zinc-950/5" />{touched.walletAddress && !isValidWalletAddress(data.walletAddress) && <span className="text-sm text-rose-700">Enter a valid 42-character EVM wallet address.</span>}</label>
    </div>
  </div>;
}
