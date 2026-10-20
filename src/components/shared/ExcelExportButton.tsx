"use client";

import { useState } from "react";
import * as XLSX from "xlsx";
import { FileSpreadsheet, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

type ExcelCellValue = string | number | boolean | Date | null | undefined;

export type ExcelExportColumn<Row extends Record<string, ExcelCellValue>> = {
  key: Extract<keyof Row, string>;
  header: string;
  width?: number;
};

function safeFileName(value: string) {
  const normalized = value.trim().replace(/[<>:"/\\|?*]+/g, "-");
  return normalized.toLowerCase().endsWith(".xlsx") ? normalized : `${normalized || "report"}.xlsx`;
}

function safeSheetName(value: string) {
  return value.replace(/[\\/?*\[\]:]+/g, " ").trim().slice(0, 31) || "Report";
}

function downloadWorkbook(buffer: ArrayBuffer, fileName: string) {
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function ExcelExportButton<Row extends Record<string, ExcelCellValue>>({
  rows,
  columns,
  fileName,
  sheetName = "Report",
  label = "Export Excel",
  disabled = false,
  variant = "outline",
  size = "sm",
  className,
}: {
  rows: Row[];
  columns?: ExcelExportColumn<Row>[];
  fileName: string;
  sheetName?: string;
  label?: string;
  disabled?: boolean;
  variant?: React.ComponentProps<typeof Button>["variant"];
  size?: React.ComponentProps<typeof Button>["size"];
  className?: string;
}) {
  const [exporting, setExporting] = useState(false);

  const exportRows = () => {
    if (rows.length === 0) {
      toast.error("There is no data to export in this view.");
      return;
    }

    setExporting(true);
    try {
      const resolvedColumns: ExcelExportColumn<Row>[] =
        columns ??
        Object.keys(rows[0]).map((key) => ({
          key: key as Extract<keyof Row, string>,
          header: key,
        }));
      const data = rows.map((row) =>
        Object.fromEntries(resolvedColumns.map((column) => [column.header, row[column.key] ?? ""]))
      );
      const worksheet = XLSX.utils.json_to_sheet(data, { cellDates: true });
      worksheet["!cols"] = resolvedColumns.map((column) => ({
        wch: column.width ?? Math.max(14, Math.min(36, column.header.length + 4)),
      }));
      worksheet["!autofilter"] = { ref: worksheet["!ref"] ?? "A1:A1" };

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, safeSheetName(sheetName));
      const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" }) as ArrayBuffer;
      const resolvedFileName = safeFileName(fileName);
      downloadWorkbook(buffer, resolvedFileName);
      toast.success(`Exported ${rows.length} row${rows.length === 1 ? "" : "s"} to ${resolvedFileName}.`);
    } catch (error) {
      console.error("Excel export failed", error);
      toast.error("Failed to create the Excel report.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={className}
      onClick={exportRows}
      disabled={disabled || exporting || rows.length === 0}
    >
      {exporting ? <Loader2 className="size-4 animate-spin" /> : <FileSpreadsheet className="size-4" />}
      {exporting ? "Preparing Excel..." : label}
    </Button>
  );
}
