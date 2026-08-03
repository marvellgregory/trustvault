"use client";

import {
  CheckCircle2,
  CircleAlert,
} from "lucide-react";

import type { CatalogValidationResult } from "@/lib/marketplace/importer/catalog-import-types";

type CatalogValidationPreviewProps = {
  result: CatalogValidationResult;
};

export function CatalogValidationPreview({
  result,
}: CatalogValidationPreviewProps) {
  return (
    <section className="mt-10">
      <div className="flex flex-col gap-4 border-b border-zinc-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
            Validation complete
          </p>

          <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-zinc-950">
            Catalog import preview
          </h2>

          <p className="mt-3 text-sm leading-7 text-zinc-600">
            Review every warning and error before importing products.
          </p>
        </div>

        <p className="text-xs text-zinc-500">
          Validated{" "}
          {new Intl.DateTimeFormat("en", {
            dateStyle: "medium",
            timeStyle: "short",
          }).format(new Date(result.validatedAt))}
        </p>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <ValidationMetric
          label="Total products"
          value={result.summary.totalProducts}
        />

        <ValidationMetric
          label="Valid"
          value={result.summary.validProducts}
          tone="success"
        />

        <ValidationMetric
          label="Warnings"
          value={result.summary.warningProducts}
          tone="warning"
        />

        <ValidationMetric
          label="Invalid"
          value={result.summary.invalidProducts}
          tone="error"
        />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <ValidationMetric
          label="Matched folders"
          value={result.summary.matchedImageFolders}
        />

        <ValidationMetric
          label="Missing folders"
          value={result.summary.missingImageFolders}
          tone={
            result.summary.missingImageFolders > 0
              ? "error"
              : "success"
          }
        />

        <ValidationMetric
          label="Extra folders"
          value={result.summary.extraImageFolders}
          tone={
            result.summary.extraImageFolders > 0
              ? "warning"
              : "success"
          }
        />

        <ValidationMetric
          label="Images scanned"
          value={result.imageArchive.supportedImageFiles}
        />
      </div>

      {(result.summary.duplicateProductIds.length > 0 ||
        result.summary.duplicateSkus.length > 0) && (
        <div className="mt-6 rounded-3xl border border-rose-200 bg-rose-50 p-5">
          <p className="text-sm font-semibold text-rose-950">
            Duplicate catalog identifiers
          </p>

          {result.summary.duplicateProductIds.length > 0 && (
            <p className="mt-3 text-xs leading-6 text-rose-800">
              Duplicate Product IDs:{" "}
              {result.summary.duplicateProductIds.join(", ")}
            </p>
          )}

          {result.summary.duplicateSkus.length > 0 && (
            <p className="mt-2 text-xs leading-6 text-rose-800">
              Duplicate SKUs:{" "}
              {result.summary.duplicateSkus.join(", ")}
            </p>
          )}
        </div>
      )}

      {result.globalIssues.length > 0 && (
        <div className="mt-6 rounded-3xl border border-amber-200 bg-amber-50 p-5">
          <p className="text-sm font-semibold text-amber-950">
            Archive notices
          </p>

          <div className="mt-3 space-y-2">
            {result.globalIssues.map((issue) => (
              <p
                key={`${issue.code}-${issue.message}`}
                className="text-xs leading-6 text-amber-800"
              >
                {issue.message}
              </p>
            ))}
          </div>
        </div>
      )}

      <div className="mt-8 overflow-hidden rounded-[2rem] border border-zinc-200 bg-white">
        <div className="border-b border-zinc-200 bg-zinc-50 px-5 py-4 sm:px-6">
          <p className="text-sm font-semibold text-zinc-950">
            Product validation results
          </p>
        </div>

        <div className="divide-y divide-zinc-200">
          {result.products.map((product) => (
            <ProductValidationRow
              key={`${product.sheetName}-${product.rowNumber}-${product.productId}`}
              product={product}
            />
          ))}
        </div>
      </div>

      <div className="mt-6 rounded-3xl border border-zinc-200 bg-zinc-50 p-5 text-xs leading-6 text-zinc-600">
        Validation does not publish products. Use the import controls below to
        save approved products to the development Marketplace repository.
      </div>
    </section>
  );
}

type ValidationMetricProps = {
  label: string;
  value: number;
  tone?: "default" | "success" | "warning" | "error";
};

function ValidationMetric({
  label,
  value,
  tone = "default",
}: ValidationMetricProps) {
  const toneClasses = {
    default:
      "border-zinc-200 bg-white text-zinc-950",
    success:
      "border-emerald-200 bg-emerald-50 text-emerald-900",
    warning:
      "border-amber-200 bg-amber-50 text-amber-900",
    error:
      "border-rose-200 bg-rose-50 text-rose-900",
  };

  return (
    <div
      className={`rounded-3xl border p-5 ${toneClasses[tone]}`}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.13em] opacity-65">
        {label}
      </p>

      <p className="mt-3 text-3xl font-semibold tracking-[-0.04em]">
        {value}
      </p>
    </div>
  );
}

type ProductValidationRowProps = {
  product: CatalogValidationResult["products"][number];
};

function ProductValidationRow({
  product,
}: ProductValidationRowProps) {
  const tone =
    product.status === "valid"
      ? "success"
      : product.status === "warning"
        ? "warning"
        : "error";

  return (
    <article className="p-5 sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${
            tone === "success"
              ? "bg-emerald-50 text-emerald-700"
              : tone === "warning"
                ? "bg-amber-50 text-amber-700"
                : "bg-rose-50 text-rose-700"
          }`}
        >
          {tone === "success" ? (
            <CheckCircle2
              aria-hidden="true"
              className="h-5 w-5"
            />
          ) : (
            <CircleAlert
              aria-hidden="true"
              className="h-5 w-5"
            />
          )}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-mono text-xs font-semibold text-zinc-500">
              {product.productId || "Missing Product ID"}
            </p>

            <StatusBadge status={product.status} />
          </div>

          <h3 className="mt-2 text-lg font-semibold tracking-[-0.025em] text-zinc-950">
            {product.title || "Untitled product"}
          </h3>

          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-zinc-500">
            <span>SKU: {product.sku || "Missing"}</span>
            <span>
              Category: {product.category || "Missing"}
            </span>
            <span>Sheet: {product.sheetName}</span>
            <span>Row: {product.rowNumber}</span>
            <span>
              Images: {product.imageFolder?.files.length ?? 0}
            </span>
          </div>

          {product.imageFolder && (
            <p className="mt-3 break-all font-mono text-xs leading-5 text-zinc-400">
              {product.imageFolder.folderPath}
            </p>
          )}

          {product.issues.length > 0 && (
            <div className="mt-4 space-y-2">
              {product.issues.map((issue, index) => (
                <div
                  key={`${issue.code}-${index}`}
                  className={`rounded-2xl border px-4 py-3 text-xs leading-5 ${
                    issue.severity === "error"
                      ? "border-rose-200 bg-rose-50 text-rose-800"
                      : "border-amber-200 bg-amber-50 text-amber-800"
                  }`}
                >
                  {issue.message}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

function StatusBadge({
  status,
}: {
  status: "valid" | "warning" | "invalid";
}) {
  const styles = {
    valid: "bg-emerald-50 text-emerald-700",
    warning: "bg-amber-50 text-amber-700",
    invalid: "bg-rose-50 text-rose-700",
  };

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${styles[status]}`}
    >
      {status}
    </span>
  );
}
