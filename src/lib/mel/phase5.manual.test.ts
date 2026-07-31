import assert from "node:assert/strict";
import { isQuestionVisible, validateInstrumentForPublishing, validateInstrumentResponses, type InstrumentSectionDefinition } from "./instrument-engine";
import { importIdempotencyKey, redactSensitivePayload, resolveImportPayload, sanitizeSpreadsheetCell } from "./import-engine";

function question(code: string, overrides: Partial<InstrumentSectionDefinition["questions"][number]> = {}): InstrumentSectionDefinition["questions"][number] { return { code, label: code, responseType: "short_text", isRequired: false, options: [], visibilityRule: null, validationRules: {}, indicator: null, evidenceRequired: false, ...overrides }; }
function tests() {
  assert.deepEqual(validateInstrumentForPublishing([]), ["Add at least one section before publishing."]);
  const valid = [{ code: "profile", title: "Profile", questions: [question("name", { isRequired: true }), question("revenue", { responseType: "currency", indicator: { code: "REV", unit: "kes" }, validationRules: { min: 0 } })] }];
  assert.deepEqual(validateInstrumentForPublishing(valid), []);
  assert.ok(validateInstrumentForPublishing([{ code: "a", title: "A", questions: [question("choice", { responseType: "single_select" })] }]).some((issue) => issue.includes("option")));
  assert.ok(validateInstrumentForPublishing([{ code: "a", title: "A", questions: [question("one", { visibilityRule: { questionCode: "two", operator: "equals", value: "yes" } }), question("two", { visibilityRule: { questionCode: "one", operator: "equals", value: "yes" } })] }]).some((issue) => issue.includes("Circular")));
  assert.ok(validateInstrumentForPublishing([{ code: "a", title: "A", questions: [question("bad", { responseType: "short_text", indicator: { code: "FIN", unit: "kes" } })] }]).some((issue) => issue.includes("incompatible")));
  assert.equal(isQuestionVisible({ questionCode: "has_jobs", operator: "equals", value: true }, { has_jobs: true }), true);
  assert.deepEqual(validateInstrumentResponses(valid, { name: "", revenue: -1 }), { name: "This question is required.", revenue: "Enter 0 or more." });

  const mapping = { enterpriseIdField: "enterprise", reportingPeriodField: "period", externalSubmissionIdField: "uuid", fieldMap: { sales: "revenue", jobs: "direct_jobs_total" } };
  const resolved = resolveImportPayload({ uuid: "abc", enterprise: "42", period: "PY1-Q1", sales: 1000, jobs: 3, ignored: "private" }, mapping);
  assert.deepEqual(resolved.errors, []); assert.equal(resolved.enterpriseId, 42); assert.deepEqual(resolved.normalized, { revenue: 1000, direct_jobs_total: 3 });
  assert.ok(resolveImportPayload({ enterprise: "bad" }, mapping).errors.length >= 3);
  assert.equal(importIdempotencyKey("kobo", 2, "abc"), importIdempotencyKey("kobo", 2, "abc"));
  for (const value of ["=SUM(A1:A2)", "+cmd", "-1+2", "@IMPORTXML()"]) assert.ok(String(sanitizeSpreadsheetCell(value)).startsWith("'"));
  assert.equal(sanitizeSpreadsheetCell("normal"), "normal");
  assert.deepEqual(redactSensitivePayload({ enterpriseId: 1, email: "a@example.com", token: "secret", count: 3 }), { enterpriseId: 1, email: "[REDACTED]", token: "[REDACTED]", count: 3 });
}
tests();
console.log("MEL Phase 5 instrument, import, and security tests passed.");
