import { createHash } from "node:crypto";

export type ImportMapping = {
  enterpriseIdField: string;
  reportingPeriodField: string;
  externalSubmissionIdField: string;
  fieldMap: Record<string, string>;
};

export type ImportResolution = {
  externalSubmissionId: string | null;
  enterpriseId: number | null;
  reportingPeriodCode: string | null;
  normalized: Record<string, unknown>;
  errors: string[];
};

export function resolveImportPayload(payload: Record<string, unknown>, mapping: ImportMapping): ImportResolution {
  const errors: string[] = [];
  const externalSubmissionId = scalar(payload[mapping.externalSubmissionIdField]);
  const enterpriseRaw = scalar(payload[mapping.enterpriseIdField]);
  const reportingPeriodCode = scalar(payload[mapping.reportingPeriodField]);
  const enterpriseId = enterpriseRaw && /^\d+$/.test(enterpriseRaw) ? Number(enterpriseRaw) : null;
  if (!externalSubmissionId) errors.push(`Missing external submission identifier field ${mapping.externalSubmissionIdField}.`);
  if (!enterpriseId) errors.push(`Enterprise identifier ${enterpriseRaw ?? "is missing or invalid"}.`);
  if (!reportingPeriodCode) errors.push(`Missing reporting period field ${mapping.reportingPeriodField}.`);
  const normalized: Record<string, unknown> = {};
  for (const [externalField, questionCode] of Object.entries(mapping.fieldMap)) {
    if (payload[externalField] !== undefined) normalized[questionCode] = payload[externalField];
  }
  return { externalSubmissionId, enterpriseId, reportingPeriodCode, normalized, errors };
}

export function importIdempotencyKey(provider: string, connectionId: number, externalSubmissionId: string): string {
  return `${provider}:${connectionId}:${createHash("sha256").update(externalSubmissionId).digest("hex")}`;
}

export function sourceChecksum(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

export function sanitizeSpreadsheetCell(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const trimmedStart = value.trimStart();
  return /^[=+\-@]/.test(trimmedStart) ? `'${value}` : value;
}

export function sanitizeExportRows(rows: Array<Record<string, unknown>>): Array<Record<string, unknown>> {
  return rows.map((row) => Object.fromEntries(Object.entries(row).map(([key, value]) => [key, sanitizeSpreadsheetCell(value)])));
}

export function redactSensitivePayload(payload: Record<string, unknown>): Record<string, unknown> {
  const sensitive = /name|email|phone|passport|identity|answer|file|url|token|secret/i;
  return Object.fromEntries(Object.entries(payload).map(([key, value]) => [key, sensitive.test(key) ? "[REDACTED]" : value]));
}

function scalar(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
}
