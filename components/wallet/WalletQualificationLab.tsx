"use client";

import { useState } from "react";

import { useWalletQualificationExecution } from "./useWalletQualificationExecution";

export function WalletQualificationLab() {
  const execution = useWalletQualificationExecution();
  const [unsupportedNote, setUnsupportedNote] = useState("");
  if (process.env.NODE_ENV !== "development" || !execution.available) return null;
  const running = execution.snapshot.phase === "PREFLIGHT" || execution.snapshot.phase === "RUNNING";
  return (
    <section aria-label="Development wallet qualification lab" className="rounded-2xl border border-violet-300/20 bg-violet-300/[0.05] p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-200">Development qualification lab</p>
      <p className="mt-2 text-sm text-slate-200">Provider under test: <span className="font-semibold text-white">{execution.selectedProvider?.name ?? "No provider selected"}</span></p>
      <p className="mt-1 text-xs text-slate-400">Run status: {execution.snapshot.phase}</p>
      <button type="button" disabled={running || !execution.selectedProvider} onClick={() => void execution.run()} className="mt-3 inline-flex min-h-10 items-center justify-center rounded-full bg-violet-100 px-4 text-xs font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-300">Run qualification checks</button>
      <div className="mt-3 border-t border-white/10 pt-3">
        <label htmlFor="unsupported-network-note" className="text-xs text-slate-400">Observed unsupported-network response</label>
        <input id="unsupported-network-note" value={unsupportedNote} onChange={(event) => setUnsupportedNote(event.target.value)} placeholder="Factual wallet error message" className="mt-2 min-h-10 w-full rounded-xl border border-white/10 bg-slate-950 px-3 text-xs text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-300" />
        <button type="button" disabled={running || !execution.selectedProvider || !unsupportedNote.trim()} onClick={() => void execution.recordUnsupportedNetwork(unsupportedNote.trim())} className="mt-2 text-xs font-semibold text-amber-200 underline underline-offset-4 disabled:opacity-50">Record unsupported-network observation</button>
      </div>
      {execution.snapshot.reason && <p role="alert" className="mt-3 text-xs text-amber-200">{execution.snapshot.reason}</p>}
      {execution.snapshot.checks.length > 0 && <ul className="mt-3 space-y-1 text-xs text-slate-300">{execution.snapshot.checks.map((item) => <li key={item.name}><span className={item.status === "PASSED" ? "text-emerald-200" : item.status === "FAILED" ? "text-rose-200" : "text-slate-500"}>{item.status}</span> · {item.name}: {item.message}</li>)}</ul>}
    </section>
  );
}
