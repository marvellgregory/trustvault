import type { WalletSessionState } from "@/lib/wallet/session-types";

const LABELS: Record<WalletSessionState, string> = {
  DETECTED: "Detected",
  CONNECTED: "Connected",
  ARC_READY: "Arc ready",
  COMPATIBLE: "Compatible",
  TRUSTVAULT_QUALIFIED: "TrustVault qualified",
  INVALIDATED: "Unavailable",
};

const STYLES: Record<WalletSessionState, string> = {
  DETECTED: "border-white/10 bg-white/5 text-slate-300",
  CONNECTED: "border-blue-400/20 bg-blue-400/10 text-blue-200",
  ARC_READY: "border-cyan-400/20 bg-cyan-400/10 text-cyan-200",
  COMPATIBLE: "border-violet-400/20 bg-violet-400/10 text-violet-200",
  TRUSTVAULT_QUALIFIED:
    "border-emerald-400/20 bg-emerald-400/10 text-emerald-200",
  INVALIDATED: "border-rose-400/20 bg-rose-400/10 text-rose-200",
};

export function WalletStatusBadge({ status }: { status: WalletSessionState }) {
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${STYLES[status]}`}
    >
      {LABELS[status]}
    </span>
  );
}
