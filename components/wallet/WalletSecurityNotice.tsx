import { ShieldCheck } from "lucide-react";

export function WalletSecurityNotice() {
  return (
    <div className="flex gap-3 rounded-2xl border border-emerald-300/15 bg-emerald-300/[0.06] p-4 text-sm leading-6 text-emerald-50">
      <ShieldCheck aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" />
      <p>TrustVault never asks for your recovery phrase or private key.</p>
    </div>
  );
}
