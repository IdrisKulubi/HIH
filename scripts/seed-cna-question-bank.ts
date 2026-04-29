import { existsSync } from "node:fs";
import path from "node:path";
import { cwd } from "node:process";
import { loadEnvConfig } from "@next/env";
import XLSX from "xlsx";

type WorkbookRole = "BDS" | "TA" | "IA" | "MEAL" | "";
type ProductRole = "bds_edo" | "mentor" | "investment_analyst" | "mel";

const SECTION_CODES: Record<string, string> = {
  "Product Assessment": "A",
  "Business Model": "B",
  "Market + Customer Assessment": "C",
  "Finance Management Assessment": "D",
  "Business Technical Capacity": "E",
  "Systems, Processes & Digital Capacity": "F",
  "Distribution Channel Assessments": "G",
  "Growth & Scalability Assessment": "H",
  "Access to Finance – Investment Readiness": "I",
  "Access to Finance - Investment Readiness": "I",
  "Risk Assessment": "J",
  "Climate & ESG Assessment": "K",
  Impact: "L",
};

const ROLE_MAP: Record<WorkbookRole, ProductRole> = {
  BDS: "bds_edo",
  TA: "mentor",
  IA: "investment_analyst",
  MEAL: "mel",
  "": "bds_edo",
};

function cleanCell(value: unknown) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function isQuestion(text: string) {
  return text.length > 10 && (text.includes("?") || /^How\b/i.test(text));
}

async function main() {
  loadEnvConfig(cwd());
  const [{ default: db }, { cnaQuestionBank }] = await Promise.all([
    import("../db/drizzle"),
    import("../db/schema"),
  ]);

  const workbookPath =
    process.env.CNA_QUESTION_BANK_XLSX ??
    "C:\\Users\\Idris Kulubi\\Downloads\\El vaso glasswear Sample Outline (1).xlsx";
  const sheetName = process.env.CNA_QUESTION_BANK_SHEET ?? "BDS Needs Assessment";

  if (!existsSync(workbookPath)) {
    throw new Error(`Workbook not found: ${workbookPath}`);
  }

  const workbook = XLSX.readFile(workbookPath);
  const worksheet = workbook.Sheets[sheetName];
  if (!worksheet) {
    throw new Error(`Sheet "${sheetName}" not found in ${path.basename(workbookPath)}`);
  }

  const rows = XLSX.utils.sheet_to_json<unknown[]>(worksheet, { header: 1, defval: "" });
  let currentSection = "";
  let sortOrder = 0;
  let inserted = 0;
  let skipped = 0;

  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];
    const maybeCode = cleanCell(row[1]);
    const maybeSection = cleanCell(row[2]);
    if (/^[A-L]$/.test(maybeCode) && SECTION_CODES[maybeSection]) {
      currentSection = maybeSection;
      continue;
    }

    const questionText = cleanCell(row[2]);
    if (!currentSection || !isQuestion(questionText) || SECTION_CODES[questionText]) {
      continue;
    }

    const sourceRoleLabel = cleanCell(row[6]) as WorkbookRole;
    const sectionCode = SECTION_CODES[currentSection];
    sortOrder += 1;

    const result = await db
      .insert(cnaQuestionBank)
      .values({
        sectionCode: sectionCode as any,
        sectionName: currentSection,
        questionText,
        assignedRole: ROLE_MAP[sourceRoleLabel] ?? "bds_edo",
        sourceRoleLabel: sourceRoleLabel || "BDS",
        sourceSheet: sheetName,
        sourceRow: i + 1,
        sortOrder,
      })
      .onConflictDoNothing()
      .returning({ id: cnaQuestionBank.id });

    if (result.length > 0) inserted += 1;
    else skipped += 1;
  }

  console.log(`CNA question bank seed complete. Inserted: ${inserted}. Skipped existing: ${skipped}.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
