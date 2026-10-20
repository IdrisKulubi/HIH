import assert from "node:assert/strict";
import * as XLSX from "xlsx";
import {
  buildEnterpriseExportCsv,
  buildEnterpriseExportWorkbook,
  enterpriseExportDateBounds,
  isWithinEnterpriseExportRange,
  writeEnterpriseExportWorkbook,
} from "./enterprise-export";
import { ENTERPRISE_EXPORT_SECTION_KEYS } from "./enterprise-export-config";

const bounds = enterpriseExportDateBounds("2026-08-06", "2026-08-06");
assert.equal(isWithinEnterpriseExportRange(new Date("2026-08-05T20:59:59Z"), bounds), false);
assert.equal(isWithinEnterpriseExportRange(new Date("2026-08-05T21:00:00Z"), bounds), true);
assert.equal(isWithinEnterpriseExportRange(new Date("2026-08-06T20:59:59Z"), bounds), true);
assert.equal(isWithinEnterpriseExportRange(new Date("2026-08-06T21:00:00Z"), bounds), false);
assert.throws(() => enterpriseExportDateBounds("2026-08-07", "2026-08-06"));

assert.deepEqual(ENTERPRISE_EXPORT_SECTION_KEYS, [
  "profile", "submissions", "responses", "finance", "jobs", "waste", "evidence", "review", "learning",
]);

const sheets = [
  { name: "Enterprise profile", rows: [{ Enterprise_ID: 17, Enterprise: "Green Works" }] },
  { name: "Quarterly responses", rows: [{ Submission_ID: 41, Revenue_KES: 1_000_000, Collector_Comment: "=unsafe formula" }] },
];
const metadata = { Enterprise: "Green Works", Enterprise_ID: 17, Exported_At: new Date("2026-08-06T09:00:00Z") };
const workbook = buildEnterpriseExportWorkbook(sheets, metadata);
assert.deepEqual(workbook.SheetNames, ["Export metadata", "Enterprise profile", "Quarterly responses"]);

const roundTrip = XLSX.read(writeEnterpriseExportWorkbook(workbook), { type: "buffer", cellDates: true });
assert.deepEqual(
  XLSX.utils.sheet_to_json(roundTrip.Sheets["Quarterly responses"], { header: 1 })[0],
  ["Submission ID", "Revenue KES", "Collector Comment"]
);
const csv = buildEnterpriseExportCsv(sheets, metadata);
assert.match(csv, /Quarterly responses/);
assert.match(csv, /Collector Comment/);
assert.match(csv, /'=unsafe formula/);

console.log("MEL enterprise export tests passed.");
