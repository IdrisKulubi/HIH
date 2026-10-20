import * as XLSX from "xlsx";
import { sanitizeExportRows } from "./import-engine";

export type EnterpriseExportCell = string | number | boolean | Date | null;
export type EnterpriseExportRow = Record<string, EnterpriseExportCell>;
export type EnterpriseExportSheet = {
  name: string;
  rows: EnterpriseExportRow[];
};

export function enterpriseExportDateBounds(from: string, to: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
    throw new Error("Choose valid From and To dates.");
  }
  const start = new Date(`${from}T00:00:00+03:00`);
  const toStart = new Date(`${to}T00:00:00+03:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(toStart.getTime()) || start > toStart) {
    throw new Error("The From date must be on or before the To date.");
  }
  return { start, endExclusive: new Date(toStart.getTime() + 86_400_000) };
}

export function isWithinEnterpriseExportRange(
  value: Date | null | undefined,
  bounds: ReturnType<typeof enterpriseExportDateBounds>
) {
  return Boolean(value && value >= bounds.start && value < bounds.endExclusive);
}

export function buildEnterpriseExportWorkbook(
  sheets: EnterpriseExportSheet[],
  metadata: Record<string, EnterpriseExportCell>
) {
  const workbook = XLSX.utils.book_new();
  workbook.Props = {
    Title: "BIRE MEL enterprise export",
    Subject: "Enterprise monitoring data",
    Author: "BIRE MEL System",
    CreatedDate: new Date(),
  };
  appendSheet(workbook, "Export metadata", Object.entries(metadata).map(([Field, Value]) => ({ Field: displayLabel(Field), Value })));
  for (const sheet of sheets) appendSheet(workbook, sheet.name, sheet.rows);
  return workbook;
}

export function buildEnterpriseExportCsv(
  sheets: EnterpriseExportSheet[],
  metadata: Record<string, EnterpriseExportCell>
) {
  const rows: EnterpriseExportRow[] = [];
  for (const [field, value] of Object.entries(metadata)) {
    rows.push({ Section: "Export metadata", Record: 1, Field: field, Value: csvValue(value) });
  }
  for (const sheet of sheets) {
    if (sheet.rows.length === 0) {
      rows.push({ Section: sheet.name, Record: 0, Field: "Notice", Value: "No records matched the selected date range." });
      continue;
    }
    sheet.rows.forEach((row, index) => {
      for (const [field, value] of Object.entries(row)) {
        rows.push({ Section: sheet.name, Record: index + 1, Field: displayLabel(field), Value: csvValue(value) });
      }
    });
  }
  return XLSX.utils.sheet_to_csv(XLSX.utils.json_to_sheet(sanitizeRows(rows)));
}

export function writeEnterpriseExportWorkbook(workbook: XLSX.WorkBook) {
  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx", cellDates: true }) as Buffer;
}

function appendSheet(workbook: XLSX.WorkBook, name: string, rows: EnterpriseExportRow[]) {
  const safeRows = sanitizeRows(rows.length ? rows : [{ Notice: "No records matched the selected date range." }]);
  const worksheet = XLSX.utils.json_to_sheet(safeRows, { cellDates: true });
  const headers = Object.keys(safeRows[0] ?? {});
  const displayHeaders = headers.map(displayLabel);
  XLSX.utils.sheet_add_aoa(worksheet, [displayHeaders], { origin: "A1" });
  worksheet["!cols"] = headers.map((header) => ({
    wch: Math.min(42, Math.max(12, displayLabel(header).length + 2, ...safeRows.map((row) => String(row[header] ?? "").length + 2))),
  }));
  worksheet["!rows"] = [{ hpt: 22 }];
  if (worksheet["!ref"]) worksheet["!autofilter"] = { ref: worksheet["!ref"] };
  applyNumberFormats(worksheet, headers, safeRows.length);
  XLSX.utils.book_append_sheet(workbook, worksheet, name.slice(0, 31));
}

function applyNumberFormats(worksheet: XLSX.WorkSheet, headers: string[], rowCount: number) {
  headers.forEach((header, columnIndex) => {
    const isCurrency = /KES|Revenue|Costs|Profit|Amount|Value/i.test(header);
    const isDate = /Date|At$|Timestamp/i.test(header);
    if (!isCurrency && !isDate) return;
    for (let rowIndex = 1; rowIndex <= rowCount; rowIndex += 1) {
      const cell = worksheet[XLSX.utils.encode_cell({ r: rowIndex, c: columnIndex })];
      if (!cell) continue;
      if (isCurrency && cell.t === "n") cell.z = "#,##0.00";
      if (isDate && cell.t === "d") cell.z = "yyyy-mm-dd hh:mm";
    }
  });
}

function sanitizeRows(rows: EnterpriseExportRow[]) {
  return sanitizeExportRows(rows) as EnterpriseExportRow[];
}

function csvValue(value: EnterpriseExportCell): string | number | boolean | null {
  return value instanceof Date ? value.toISOString() : value;
}

function displayLabel(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
