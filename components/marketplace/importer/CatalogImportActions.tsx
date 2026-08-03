"use client";

import {
  CheckCircle2,
  CircleAlert,
  Database,
  ExternalLink,
  Images,
  LoaderCircle,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import type { CatalogValidationResult } from "@/lib/marketplace/importer/catalog-import-types";
import {
  importCatalogImages,
  type CatalogImageImportReport,
} from "@/lib/marketplace/importer/import-catalog-images";
import { browserProductRepository } from "@/lib/marketplace/repository/product-repository";

type CatalogImportActionsProps = {
  result: CatalogValidationResult;
  imageArchiveFile: File;
};

type ImportStatus =
  | "idle"
  | "importing-products"
  | "importing-images"
  | "complete"
  | "error";

type CatalogImportReport = {
  importedProducts: number;
  validProducts: number;
  warningProducts: number;
  skippedInvalidProducts: number;
  imageReport: CatalogImageImportReport;
  importedAt: string;
};

export function CatalogImportActions({
  result,
  imageArchiveFile,
}: CatalogImportActionsProps) {
  const [includeWarnings, setIncludeWarnings] =
    useState(true);

  const [
    replaceExistingCatalog,
    setReplaceExistingCatalog,
  ] = useState(false);

  const [status, setStatus] =
    useState<ImportStatus>("idle");

  const [report, setReport] =
    useState<CatalogImportReport | null>(null);

  const [error, setError] =
    useState<string | null>(null);

  const importableValidations = useMemo(() => {
    return result.products.filter((validation) => {
      if (!validation.product) {
        return false;
      }

      if (validation.status === "valid") {
        return true;
      }

      return (
        includeWarnings &&
        validation.status === "warning"
      );
    });
  }, [includeWarnings, result.products]);

  const validProducts = result.products.filter(
    (validation) =>
      validation.status === "valid" &&
      validation.product,
  ).length;

  const warningProducts = result.products.filter(
    (validation) =>
      validation.status === "warning" &&
      validation.product,
  ).length;

  const invalidProducts = result.products.filter(
    (validation) =>
      validation.status === "invalid",
  ).length;

  async function handleImportCatalog() {
    if (importableValidations.length === 0) {
      setError(
        "There are no valid products available to import.",
      );
      return;
    }

    const confirmed = window.confirm(
      replaceExistingCatalog
        ? `Replace the existing browser catalog and import ${importableValidations.length} product(s) with their images?`
        : `Import ${importableValidations.length} product(s) and their images into the browser catalog?`,
    );

    if (!confirmed) {
      return;
    }

    setStatus("importing-products");
    setError(null);
    setReport(null);

    try {
      if (replaceExistingCatalog) {
        await browserProductRepository.clear();
      }

      const products = importableValidations
        .map((validation) => validation.product)
        .filter(
          (
            product,
          ): product is NonNullable<
            typeof product
          > => Boolean(product),
        );

      const savedProducts =
        await browserProductRepository.saveMany(
          products,
        );

      setStatus("importing-images");

      const filteredValidationResult: CatalogValidationResult =
        {
          ...result,
          products: importableValidations,
        };

      const imageReport =
        await importCatalogImages({
          imageArchiveFile,
          validationResult:
            filteredValidationResult,
          replaceExistingImages:
            replaceExistingCatalog,
        });

      const importedAt =
        new Date().toISOString();

      setReport({
        importedProducts: savedProducts.length,
        validProducts,
        warningProducts: includeWarnings
          ? warningProducts
          : 0,
        skippedInvalidProducts:
          invalidProducts,
        imageReport,
        importedAt,
      });

      setStatus("complete");
    } catch (caughtError) {
      console.error(
        "TrustVault catalog import failed:",
        caughtError,
      );

      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "TrustVault could not import the catalog and product images.",
      );

      setStatus("error");
    }
  }

  const isImporting =
    status === "importing-products" ||
    status === "importing-images";

  const buttonText =
    status === "importing-products"
      ? "Saving products…"
      : status === "importing-images"
        ? "Saving product images…"
        : `Import ${importableValidations.length} products`;

  return (
    <section className="mt-8 rounded-[2rem] border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-700">
          <Database
            aria-hidden="true"
            className="h-5 w-5"
          />
        </span>

        <div>
          <h3 className="text-lg font-semibold tracking-[-0.025em] text-zinc-950">
            Import validated catalog
          </h3>

          <p className="mt-1 text-sm leading-6 text-zinc-600">
            Save approved product records and their
            extracted image files to the development
            Marketplace repositories.
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <ImportMetric
          label="Ready to import"
          value={importableValidations.length}
        />

        <ImportMetric
          label="Warnings available"
          value={warningProducts}
        />

        <ImportMetric
          label="Invalid skipped"
          value={invalidProducts}
        />
      </div>

      <div className="mt-6 space-y-3">
        <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
          <input
            type="checkbox"
            checked={includeWarnings}
            onChange={(event) =>
              setIncludeWarnings(
                event.target.checked,
              )
            }
            disabled={isImporting}
            className="mt-1 h-4 w-4 rounded border-zinc-300 accent-zinc-950"
          />

          <span>
            <span className="block text-sm font-semibold text-zinc-950">
              Include products with warnings
            </span>

            <span className="mt-1 block text-xs leading-5 text-zinc-500">
              Warning products remain importable.
              Invalid products are always skipped.
            </span>
          </span>
        </label>

        <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
          <input
            type="checkbox"
            checked={replaceExistingCatalog}
            onChange={(event) =>
              setReplaceExistingCatalog(
                event.target.checked,
              )
            }
            disabled={isImporting}
            className="mt-1 h-4 w-4 rounded border-zinc-300 accent-zinc-950"
          />

          <span>
            <span className="block text-sm font-semibold text-zinc-950">
              Replace existing browser catalog
            </span>

            <span className="mt-1 block text-xs leading-5 text-zinc-500">
              Clear existing product records and image
              blobs before importing this catalog.
            </span>
          </span>
        </label>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={handleImportCatalog}
          disabled={
            isImporting ||
            importableValidations.length === 0
          }
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-zinc-950 px-6 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-4"
        >
          {isImporting ? (
            <LoaderCircle
              aria-hidden="true"
              className="h-4 w-4 animate-spin"
            />
          ) : (
            <Database
              aria-hidden="true"
              className="h-4 w-4"
            />
          )}

          {buttonText}
        </button>

        {status === "complete" && (
          <Link
            href="/marketplace"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-zinc-300 bg-white px-6 text-sm font-semibold text-zinc-950 transition hover:border-zinc-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950"
          >
            Open Marketplace
            <ExternalLink
              aria-hidden="true"
              className="h-4 w-4"
            />
          </Link>
        )}
      </div>

      {report && (
        <div className="mt-6 rounded-3xl border border-emerald-200 bg-emerald-50 p-5">
          <div className="flex items-start gap-3">
            <CheckCircle2
              aria-hidden="true"
              className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700"
            />

            <div>
              <p className="text-sm font-semibold text-emerald-950">
                Catalog and images imported
              </p>

              <p className="mt-2 text-xs leading-6 text-emerald-800">
                {report.importedProducts} products were
                saved, including{" "}
                {report.validProducts} valid and{" "}
                {report.warningProducts} warning
                products.
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <ReportMetric
              icon={Database}
              label="Products saved"
              value={report.importedProducts}
            />

            <ReportMetric
              icon={Images}
              label="Images saved"
              value={
                report.imageReport.importedImages
              }
            />

            <ReportMetric
              icon={CheckCircle2}
              label="Products with images"
              value={
                report.imageReport.importedProducts
              }
            />
          </div>

          {report.imageReport
            .missingArchiveEntries.length > 0 && (
            <p className="mt-4 text-xs leading-6 text-amber-800">
              {
                report.imageReport
                  .missingArchiveEntries.length
              } expected ZIP image entries could not
              be found.
            </p>
          )}

          <p className="mt-4 text-xs text-emerald-700">
            Imported{" "}
            {new Intl.DateTimeFormat("en", {
              dateStyle: "medium",
              timeStyle: "short",
            }).format(
              new Date(report.importedAt),
            )}
          </p>
        </div>
      )}

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
              Catalog import failed
            </p>

            <p className="mt-1 text-xs leading-5 text-rose-800">
              {error}
            </p>
          </div>
        </div>
      )}

      <p className="mt-5 text-xs leading-6 text-zinc-500">
        Product records are stored in browser local
        storage. Product image blobs are stored in
        IndexedDB. Production will replace these adapters
        with authenticated database and object-storage
        services.
      </p>
    </section>
  );
}

type ImportMetricProps = {
  label: string;
  value: number;
};

function ImportMetric({
  label,
  value,
}: ImportMetricProps) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
        {label}
      </p>

      <p className="mt-2 text-2xl font-semibold tracking-[-0.035em] text-zinc-950">
        {value}
      </p>
    </div>
  );
}

type ReportMetricProps = {
  icon: typeof Database;
  label: string;
  value: number;
};

function ReportMetric({
  icon: Icon,
  label,
  value,
}: ReportMetricProps) {
  return (
    <div className="rounded-2xl border border-emerald-200 bg-white p-4">
      <div className="flex items-center gap-2 text-emerald-700">
        <Icon
          aria-hidden="true"
          className="h-4 w-4"
        />

        <p className="text-xs font-semibold">
          {label}
        </p>
      </div>

      <p className="mt-2 text-2xl font-semibold text-zinc-950">
        {value}
      </p>
    </div>
  );
}
