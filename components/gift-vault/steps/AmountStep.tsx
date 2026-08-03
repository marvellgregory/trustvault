import { WalletCards } from "lucide-react";
import type { GiftData } from "@/components/gift-vault/types";
import { isPositiveAmount } from "@/components/gift-vault/validation";

type Props={data:GiftData;touched:Record<string,boolean>;updateField:<K extends keyof GiftData>(field:K,value:GiftData[K])=>void;markTouched:(field:keyof GiftData)=>void};
export function AmountStep({data,touched,updateField,markTouched}:Props){return <div>
<span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-[var(--tv-brand)]"><WalletCards aria-hidden="true" className="h-5 w-5"/></span>
<p className="mt-7 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">Amount</p>
<h2 className="mt-3 text-3xl font-semibold tracking-[-0.045em] text-zinc-950 sm:text-4xl">How much USDC would you like to gift?</h2>
<p className="mt-4 max-w-2xl text-base leading-8 text-zinc-600">TrustVault uses USDC on Arc Testnet. Live transaction estimation is added in the next integration step.</p>
<div className="mt-8 max-w-xl"><label className="grid gap-2"><span className="text-sm font-semibold text-zinc-800">Gift amount</span><div className="flex min-h-16 items-center rounded-2xl border border-zinc-300 bg-white px-4 focus-within:border-zinc-950 focus-within:ring-4 focus-within:ring-zinc-950/5"><input value={data.amount} onChange={(e)=>updateField("amount",e.target.value)} onBlur={()=>markTouched("amount")} placeholder="0.00" inputMode="decimal" className="min-w-0 flex-1 bg-transparent text-3xl font-semibold tracking-[-0.04em] text-zinc-950 outline-none placeholder:text-zinc-300"/><span className="ml-3 rounded-full bg-zinc-100 px-3 py-1.5 text-sm font-semibold text-zinc-700">USDC</span></div>{touched.amount&&!isPositiveAmount(data.amount)&&<span className="text-sm text-rose-700">Enter an amount greater than zero.</span>}</label></div>
</div>}
