"use client";

import { ExternalLink, QrCode } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

type ReceiptQrCodeProps = {
  explorerUrl?: string;
  transactionHash?: string;
};

export function ReceiptQrCode({
  explorerUrl,
  transactionHash,
}: ReceiptQrCodeProps) {
  if (!explorerUrl) {
    return null;
  }

  return (
    <section
      aria-labelledby="receipt-qr-title"
      className="mt-6 rounded-3xl border border-zinc-200 bg-white p-5"
    >
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-700">
          <QrCode aria-hidden="true" className="h-5 w-5" />
        </span>

        <div>
          <h3
            id="receipt-qr-title"
            className="text-sm font-semibold text-zinc-950"
          >
            Scan to verify
          </h3>

          <p className="mt-1 text-xs leading-5 text-zinc-500">
            Open this transaction directly on the Arc Testnet explorer.
          </p>
        </div>
      </div>

      <div className="mt-5 flex flex-col items-center gap-5 rounded-3xl border border-zinc-200 bg-zinc-50 p-6 sm:flex-row sm:items-center">
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <QRCodeSVG
            value={explorerUrl}
            size={168}
            level="M"
            marginSize={2}
            title="ArcScan transaction QR code"
          />
        </div>

        <div className="min-w-0 flex-1 text-center sm:text-left">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
            Arc Testnet transaction
          </p>

          {transactionHash && (
            <p className="mt-3 break-all font-mono text-xs leading-6 text-zinc-700">
              {transactionHash}
            </p>
          )}

          <a
            href={explorerUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-zinc-950 px-5 text-sm font-semibold text-white transition hover:bg-zinc-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-4"
          >
            Open transaction
            <ExternalLink aria-hidden="true" className="h-4 w-4" />
          </a>
        </div>
      </div>

      <p className="mt-4 text-xs leading-5 text-zinc-500">
        Anyone with this QR code can view the public transaction details. It
        does not provide access to the connected wallet.
      </p>
    </section>
  );
}
