"use client";

import {
  CheckCircle2,
  CircleAlert,
  FileText,
  LoaderCircle,
  Package,
  RefreshCw,
  Upload,
} from "lucide-react";
import {
  type ChangeEvent,
  type DragEvent,
  useMemo,
  useState,
} from "react";

import { CatalogImportActions } from "@/components/marketplace/importer/CatalogImportActions";
import { CatalogValidationPreview } from "@/components/marketplace/importer/CatalogValidationPreview";
import type {
  CatalogValidationResult,
  CatalogWorkbookData,
} from "@/lib/marketplace/importer/catalog-import-types";
import { readCatalogImageArchive } from "@/lib/marketplace/importer/read-image-archive";
import { readCatalogWorkbook } from "@/lib/marketplace/importer/read-workbook";
import { validateCatalog } from "@/lib/marketplace/importer/validate-catalog";

type ImporterStatus =
  | "idle"
  | "reading"
  | "validating"
  | "ready"
  | "error";

const WORKBOOK_EXTENSIONS = [
  ".xlsx",
  ".xls",
  ".xlsm",
  ".xlsb",
  ".csv",
];

function isWorkbookFile(file: File) {
  const fileName = file.name.toLowerCase();

  return WORKBOOK_EXTENSIONS.some((extension) =>
    fileName.endsWith(extension),
  );
}

function isZipFile(file: File) {
  return file.name.toLowerCase().endsWith(".zip");
}

function removeSummarySheets(
  workbook: CatalogWorkbookData,
): CatalogWorkbookData {
  const sheets = workbook.sheets.filter((sheet) => {
    const normalizedName = sheet.sheetName
      .trim()
      .toLowerCase();

    return ![
      "summary",
      "import summary",
      "catalog summary",
    ].includes(normalizedName);
  });

  return {
    ...workbook,
    sheets,
    sheetNames: sheets.map((sheet) => sheet.sheetName),
    totalRows: sheets.reduce(
      (total, sheet) => total + sheet.rows.length,
      0,
    ),
  };
}

export function CatalogImporter() {
  const [workbookFile, setWorkbookFile] =
    useState<File | null>(null);

  const [imageArchiveFile, setImageArchiveFile] =
    useState<File | null>(null);

  const [status, setStatus] =
    useState<ImporterStatus>("idle");

  const [validationResult, setValidationResult] =
    useState<CatalogValidationResult | null>(null);

  const [error, setError] =
    useState<string | null>(null);

  const canValidate =
    Boolean(workbookFile) &&
    Boolean(imageArchiveFile) &&
    status !== "reading" &&
    status !== "validating";

  const statusMessage = useMemo(() => {
    switch (status) {
      case "reading":
        return "Reading workbook and product images…";

      case "validating":
        return "Matching Product IDs and validating catalog data…";

      case "ready":
        return "Catalog validation complete.";

      case "error":
        return "Catalog validation could not be completed.";

      default:
        return "Upload both files to begin validation.";
    }
  }, [status]);

  function selectWorkbook(file: File) {
    if (!isWorkbookFile(file)) {
      setError(
        "Choose an Excel workbook or CSV file.",
      );
      return;
    }

    setWorkbookFile(file);
    setValidationResult(null);
    setError(null);
    setStatus("idle");
  }

  function selectImageArchive(file: File) {
    if (!isZipFile(file)) {
      setError(
        "Choose a ZIP archive containing product image folders.",
      );
      return;
    }

    setImageArchiveFile(file);
    setValidationResult(null);
    setError(null);
    setStatus("idle");
  }

  async function handleValidate() {
    if (!workbookFile || !imageArchiveFile) {
      setError(
        "Upload both the catalog workbook and product-images ZIP.",
      );
      return;
    }

    setError(null);
    setValidationResult(null);
    setStatus("reading");

    try {
      const [
        parsedWorkbook,
        parsedImageArchive,
      ] = await Promise.all([
        readCatalogWorkbook(workbookFile),
        readCatalogImageArchive(imageArchiveFile),
      ]);

      setStatus("validating");

      const workbook =
        removeSummarySheets(parsedWorkbook);

      const result = validateCatalog({
        workbook,
        imageArchive: parsedImageArchive,
      });

      setValidationResult(result);
      setStatus("ready");
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "TrustVault could not validate the catalog.";

      setError(message);
      setStatus("error");
    }
  }

  function handleReset() {
    setWorkbookFile(null);
    setImageArchiveFile(null);
    setValidationResult(null);
    setError(null);
    setStatus("idle");
  }

  return (
    <section className="section-shell py-14 sm:py-18 lg:py-24">
      <div className="border-b border-zinc-200 pb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--tv-brand)]">
          Marketplace administration
        </p>

        <h1 className="mt-4 max-w-4xl text-4xl font-semibold tracking-[-0.05em] text-zinc-950 sm:text-5xl lg:text-6xl">
          Import and validate the TrustVault product catalog.
        </h1>

        <p className="mt-5 max-w-3xl text-base leading-8 text-zinc-600">
          Upload the matched Excel workbook and product-image ZIP.
          TrustVault verifies Product IDs, SKUs, image folders,
          cover images and required product fields before anything
          is stored in the Marketplace repository.
        </p>
      </div>

      <div className="mt-8 grid gap-5 lg:grid-cols-2">
        <FileDropZone
          title="Catalog workbook"
          description="Drag your matched Excel workbook here, or choose it from your computer."
          accept=".xlsx,.xls,.xlsm,.xlsb,.csv"
          file={workbookFile}
          icon={FileText}
          onFile={selectWorkbook}
        />

        <FileDropZone
          title="Product images"
          description="Drag the ZIP containing Product ID image folders here."
          accept=".zip"
          file={imageArchiveFile}
          icon={Package}
          onFile={selectImageArchive}
        />
      </div>

      <div className="mt-6 flex flex-col gap-3 rounded-3xl border border-zinc-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-700">
            {status === "reading" ||
            status === "validating" ? (
              <LoaderCircle
                aria-hidden="true"
                className="h-5 w-5 animate-spin"
              />
            ) : status === "ready" ? (
              <CheckCircle2
                aria-hidden="true"
                className="h-5 w-5 text-emerald-700"
              />
            ) : (
              <Upload
                aria-hidden="true"
                className="h-5 w-5"
              />
            )}
          </span>

          <div>
            <p className="text-sm font-semibold text-zinc-950">
              Catalog validation
            </p>

            <p className="mt-1 text-xs leading-5 text-zinc-500">
              {statusMessage}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          {(workbookFile ||
            imageArchiveFile ||
            validationResult) && (
            <button
              type="button"
              onClick={handleReset}
              disabled={
                status === "reading" ||
                status === "validating"
              }
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-zinc-300 bg-white px-5 text-sm font-semibold text-zinc-950 transition hover:border-zinc-400 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950"
            >
              <RefreshCw
                aria-hidden="true"
                className="h-4 w-4"
              />
              Reset
            </button>
          )}

          <button
            type="button"
            onClick={handleValidate}
            disabled={!canValidate}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-zinc-950 px-6 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-4"
          >
            {status === "reading" ||
            status === "validating" ? (
              <LoaderCircle
                aria-hidden="true"
                className="h-4 w-4 animate-spin"
              />
            ) : (
              <CheckCircle2
                aria-hidden="true"
                className="h-4 w-4"
              />
            )}

            {status === "reading" ||
            status === "validating"
              ? "Validating catalog…"
              : "Validate catalog"}
          </button>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="mt-6 flex items-start gap-3 rounded-3xl border border-rose-200 bg-rose-50 p-5"
        >
          <CircleAlert
            aria-hidden="true"
            className="mt-0.5 h-5 w-5 shrink-0 text-rose-700"
          />

          <div>
            <p className="text-sm font-semibold text-rose-950">
              Validation failed
            </p>

            <p className="mt-1 text-xs leading-5 text-rose-800">
              {error}
            </p>
          </div>
        </div>
      )}

      {validationResult && (
        <>
          <CatalogValidationPreview
            result={validationResult}
          />

          {imageArchiveFile && (
  <CatalogImportActions
    result={validationResult}
    imageArchiveFile={imageArchiveFile}
  />
)}
        </>
      )}
    </section>
  );
}

type FileDropZoneProps = {
  title: string;
  description: string;
  accept: string;
  file: File | null;
  icon: typeof FileText;
  onFile: (file: File) => void;
};

function FileDropZone({
  title,
  description,
  accept,
  file,
  icon: Icon,
  onFile,
}: FileDropZoneProps) {
  const [isDragging, setIsDragging] =
    useState(false);

  function handleInputChange(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const selectedFile =
      event.target.files?.[0];

    if (selectedFile) {
      onFile(selectedFile);
    }

    event.target.value = "";
  }

  function handleDrop(
    event: DragEvent<HTMLLabelElement>,
  ) {
    event.preventDefault();
    setIsDragging(false);

    const droppedFile =
      event.dataTransfer.files?.[0];

    if (droppedFile) {
      onFile(droppedFile);
    }
  }

  return (
    <label
      onDragEnter={(event) => {
        event.preventDefault();
        setIsDragging(true);
      }}
      onDragOver={(event) => {
        event.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => {
        setIsDragging(false);
      }}
      onDrop={handleDrop}
      className={`block cursor-pointer rounded-[2rem] border-2 border-dashed p-6 transition sm:p-8 ${
        isDragging
          ? "border-zinc-950 bg-zinc-100"
          : file
            ? "border-emerald-300 bg-emerald-50"
            : "border-zinc-300 bg-white hover:border-zinc-400 hover:bg-zinc-50"
      }`}
    >
      <input
        type="file"
        accept={accept}
        onChange={handleInputChange}
        className="sr-only"
      />

      <span
        className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
          file
            ? "bg-white text-emerald-700"
            : "bg-zinc-100 text-zinc-700"
        }`}
      >
        {file ? (
          <CheckCircle2
            aria-hidden="true"
            className="h-6 w-6"
          />
        ) : (
          <Icon
            aria-hidden="true"
            className="h-6 w-6"
          />
        )}
      </span>

      <h2 className="mt-5 text-xl font-semibold tracking-[-0.03em] text-zinc-950">
        {title}
      </h2>

      <p className="mt-2 text-sm leading-7 text-zinc-600">
        {description}
      </p>

      {file ? (
        <div className="mt-5 rounded-2xl border border-emerald-200 bg-white p-4">
          <p className="break-all text-sm font-semibold text-zinc-950">
            {file.name}
          </p>

          <p className="mt-1 text-xs text-zinc-500">
            {formatFileSize(file.size)}
          </p>
        </div>
      ) : (
        <p className="mt-5 text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
          Click or drag file here
        </p>
      )}
    </label>
  );
}

function formatFileSize(size: number) {
  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

