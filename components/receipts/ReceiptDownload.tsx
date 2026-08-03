"use client";

import {
  Download,
  FileText,
  LoaderCircle,
} from "lucide-react";
import { toPng } from "html-to-image";
import { jsPDF } from "jspdf";
import { useRef, useState } from "react";

import { BrandedReceiptTemplate } from "@/components/receipts/BrandedReceiptTemplate";
import type { TransactionReceiptData } from "@/components/receipts/receipt-types";

type ReceiptDownloadProps = {
  receipt: TransactionReceiptData;
};

type DownloadMode = "png" | "pdf" | null;

function createSafeId(receipt: TransactionReceiptData) {
  return receipt.id.replace(/[^a-zA-Z0-9-_]/g, "-");
}

export function ReceiptDownload({
  receipt,
}: ReceiptDownloadProps) {
  const receiptRef = useRef<HTMLDivElement>(null);

  const [downloadMode, setDownloadMode] =
    useState<DownloadMode>(null);

  const [downloadError, setDownloadError] =
    useState<string | null>(null);

  async function createReceiptImage() {
    if (!receiptRef.current) {
      throw new Error("The branded receipt is not ready.");
    }

    return toPng(receiptRef.current, {
      backgroundColor: "#ffffff",
      cacheBust: true,
      pixelRatio: 2,
    });
  }

  async function handleDownloadPng() {
    setDownloadMode("png");
    setDownloadError(null);

    try {
      const dataUrl = await createReceiptImage();
      const link = document.createElement("a");

      link.download = `trustvault-${createSafeId(receipt)}.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error("TrustVault PNG generation failed:", error);
      setDownloadError(
        "The branded PNG could not be generated. Please try again.",
      );
    } finally {
      setDownloadMode(null);
    }
  }

  async function handleDownloadPdf() {
    setDownloadMode("pdf");
    setDownloadError(null);

    try {
      const dataUrl = await createReceiptImage();
      const image = new Image();

      image.src = dataUrl;

      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () =>
          reject(new Error("The receipt image could not be loaded."));
      });

      const pageWidth = 210;
      const pageHeight = 297;
      const margin = 12;
      const availableWidth = pageWidth - margin * 2;
      const availableHeight = pageHeight - margin * 2;

      const imageRatio = image.width / image.height;

      let renderWidth = availableWidth;
      let renderHeight = renderWidth / imageRatio;

      if (renderHeight > availableHeight) {
        renderHeight = availableHeight;
        renderWidth = renderHeight * imageRatio;
      }

      const offsetX = (pageWidth - renderWidth) / 2;
      const offsetY = (pageHeight - renderHeight) / 2;

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      pdf.addImage(
        dataUrl,
        "PNG",
        offsetX,
        offsetY,
        renderWidth,
        renderHeight,
        undefined,
        "FAST",
      );

      pdf.save(`trustvault-${createSafeId(receipt)}.pdf`);
    } catch (error) {
      console.error("TrustVault PDF generation failed:", error);
      setDownloadError(
        "The branded PDF could not be generated. Please try again.",
      );
    } finally {
      setDownloadMode(null);
    }
  }

  const isDownloading = downloadMode !== null;

  return (
    <>
      <section
        aria-labelledby="receipt-download-title"
        className="mt-6 rounded-3xl border border-zinc-200 bg-white p-5"
      >
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-700">
            <Download aria-hidden="true" className="h-5 w-5" />
          </span>

          <div>
            <h3
              id="receipt-download-title"
              className="text-sm font-semibold text-zinc-950"
            >
              Download receipt
            </h3>

            <p className="mt-1 text-xs leading-5 text-zinc-500">
              Save the same branded TrustVault receipt as a PNG or PDF using
              your current privacy settings.
            </p>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={handleDownloadPng}
            disabled={isDownloading}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-zinc-950 px-5 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-wait disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-4"
          >
            {downloadMode === "png" ? (
              <LoaderCircle
                aria-hidden="true"
                className="h-4 w-4 animate-spin"
              />
            ) : (
              <Download aria-hidden="true" className="h-4 w-4" />
            )}

            {downloadMode === "png"
              ? "Preparing PNG…"
              : "Download PNG"}
          </button>

          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={isDownloading}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-zinc-300 bg-white px-5 text-sm font-semibold text-zinc-950 transition hover:border-zinc-400 disabled:cursor-wait disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950"
          >
            {downloadMode === "pdf" ? (
              <LoaderCircle
                aria-hidden="true"
                className="h-4 w-4 animate-spin"
              />
            ) : (
              <FileText aria-hidden="true" className="h-4 w-4" />
            )}

            {downloadMode === "pdf"
              ? "Preparing PDF…"
              : "Download PDF"}
          </button>
        </div>

        {downloadError && (
          <p
            role="alert"
            className="mt-4 text-xs leading-5 text-rose-700"
          >
            {downloadError}
          </p>
        )}
      </section>

      <div
        aria-hidden="true"
        className="pointer-events-none fixed left-[-10000px] top-0"
      >
        <BrandedReceiptTemplate
          ref={receiptRef}
          receipt={receipt}
        />
      </div>
    </>
  );
}
