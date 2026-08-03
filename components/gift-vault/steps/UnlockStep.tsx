import { CalendarDays } from "lucide-react";
import type { GiftData } from "@/components/gift-vault/types";
type Props={data:GiftData;touched:Record<string,boolean>;today:string;updateField:<K extends keyof GiftData>(field:K,value:GiftData[K])=>void;markTouched:(field:keyof GiftData)=>void};
export function UnlockStep({data,touched,today,updateField,markTouched}:Props){return <div>
<span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-[var(--tv-brand)]"><CalendarDays aria-hidden="true" className="h-5 w-5"/></span>
<p className="mt-7 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">Unlock date</p>
<h2 className="mt-3 text-3xl font-semibold tracking-[-0.045em] text-zinc-950 sm:text-4xl">When should the gift unlock?</h2>
<p className="mt-4 max-w-2xl text-base leading-8 text-zinc-600">Choose today for an immediate gift draft, or a future date for the planned escrow-backed Gift Vault.</p>
<label className="mt-8 grid max-w-xl gap-2"><span className="text-sm font-semibold text-zinc-800">Unlock date</span><input type="date" min={today} value={data.unlockDate} onChange={(e)=>updateField("unlockDate",e.target.value)} onBlur={()=>markTouched("unlockDate")} className="min-h-13 rounded-2xl border border-zinc-300 bg-white px-4 text-base text-zinc-950 outline-none transition focus:border-zinc-950 focus:ring-4 focus:ring-zinc-950/5"/>{touched.unlockDate&&(!data.unlockDate||data.unlockDate<today)&&<span className="text-sm text-rose-700">Choose today or a future date.</span>}</label>
</div>}
