import * as XLSX from "xlsx";

import type {
  CatalogSheetData,
  CatalogWorkbookData,
  CatalogWorkbookRow,
} from "@/lib/marketplace/importer/catalog-import-types";

const SUPPORTED_WORKBOOK_EXTENSIONS = [
  "xlsx",
  "xls",
  "xlsm",
  "xlsb",
  "csv",
];

function getFileExtension(fileName: string) {
  return (
    fileName.split(".").pop()?.trim().toLowerCase() ?? ""
  );
}

function normalizeHeader(value: unknown, index: number) {
  const header = String(value ?? "")
    .replace(/\uFEFF/g, "")
    .replace(/\s+/g, " ")
    .trim();

  return header || `Unnamed Column ${index + 1}`;
}

function normalizeCellValue(
  value: unknown,
): string | number | boolean | null {
  if (value === undefined || value === null) {
    return null;
  }

  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return typeof value === "string"
      ? value.trim()
      : value;
  }

  return String(value).trim();
}

function isRowEmpty(row: CatalogWorkbookRow) {
  return Object.values(row).every((value) => {
    if (value === null || value === undefined) {
      return true;
    }

    return typeof value === "string"
      ? value.trim().length === 0
      : false;
  });
}

function readSheet(
  workbook: XLSX.WorkBook,
  sheetName: string,
): CatalogSheetData {
  const worksheet = workbook.Sheets[sheetName];

  if (!worksheet) {
    return {
      sheetName,
      rows: [],
    };
  }

  const matrix = XLSX.utils.sheet_to_json<unknown[]>(
    worksheet,
    {
      header: 1,
      defval: null,
      raw: false,
      blankrows: false,
    },
  );

  if (matrix.length === 0) {
    return {
      sheetName,
      rows: [],
    };
  }

  const firstNonEmptyRowIndex = matrix.findIndex((row) =>
    row.some(
      (value) =>
        value !== null &&
        value !== undefined &&
        String(value).trim() !== "",
    ),
  );

  if (firstNonEmptyRowIndex === -1) {
    return {
      sheetName,
      rows: [],
    };
  }

  const headerRow = matrix[firstNonEmptyRowIndex];

  const headers = headerRow.map((value, index) =>
    normalizeHeader(value, index),
  );

  const rows = matrix
    .slice(firstNonEmptyRowIndex + 1)
    .map((sourceRow) => {
      const row: CatalogWorkbookRow = {};

      headers.forEach((header, index) => {
        row[header] = normalizeCellValue(
          sourceRow[index],
        );
      });

      return row;
    })
    .filter((row) => !isRowEmpty(row));

  return {
    sheetName,
    rows,
  };
}

export async function readCatalogWorkbook(
  file: File,
): Promise<CatalogWorkbookData> {
  const extension = getFileExtension(file.name);

  if (!SUPPORTED_WORKBOOK_EXTENSIONS.includes(extension)) {
    throw new Error(
      "Upload an Excel workbook or CSV file.",
    );
  }

  if (file.size === 0) {
    throw new Error("The workbook file is empty.");
  }

  const arrayBuffer = await file.arrayBuffer();

  let workbook: XLSX.WorkBook;

  try {
    workbook = XLSX.read(arrayBuffer, {
      type: "array",
      cellDates: false,
      cellText: true,
      dense: false,
    });
  } catch {
    throw new Error(
      "TrustVault could not read the workbook. Confirm that the file is a valid Excel or CSV document.",
    );
  }

  const sheets = workbook.SheetNames.map((sheetName) =>
    readSheet(workbook, sheetName),
  ).filter((sheet) => sheet.rows.length > 0);

  const totalRows = sheets.reduce(
    (total, sheet) => total + sheet.rows.length,
    0,
  );

  if (totalRows === 0) {
    throw new Error(
      "The workbook does not contain any populated product rows.",
    );
  }

  return {
    fileName: file.name,
    sheetNames: sheets.map((sheet) => sheet.sheetName),
    sheets,
    totalRows,
  };
}
