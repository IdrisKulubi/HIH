/**
 * Check which MEL schema objects exist in the connected database.
 *
 * Usage:
 *   pnpm check:mel-schema                 # phases 1–3 (default)
 *   pnpm check:mel-schema -- --all        # phases 1–5
 *   pnpm check:mel-schema -- --phases=1,2,4
 *   pnpm check:mel-schema -- --phases 1 2 4   # PowerShell-safe
 */
import { cwd } from "node:process";
import { loadEnvConfig } from "@next/env";
import { Pool } from "@neondatabase/serverless";

loadEnvConfig(cwd());

interface PhaseCatalog {
  phase: number;
  label: string;
  migration: string;
  tables: string[];
  enums: string[];
}

const MEL_PHASES: PhaseCatalog[] = [
  {
    phase: 1,
    label: "Foundation and reporting periods",
    migration: "0033_mel_phase1_foundation.sql",
    tables: [
      "mel_programme_settings",
      "mel_reporting_periods",
      "mel_indicator_definitions",
      "mel_indicator_baselines",
      "mel_indicator_targets",
      "mel_audit_events",
    ],
    enums: [
      "mel_reporting_period_status",
      "mel_result_level",
      "mel_indicator_unit",
      "mel_indicator_source_type",
      "mel_aggregation",
    ],
  },
  {
    phase: 2,
    label: "Quarterly enterprise monitoring",
    migration: "0034_mel_phase2_monitoring.sql + 0039_mel_monitoring_review_fixes.sql",
    tables: [
      "mel_enterprise_assignments",
      "mel_monitoring_submissions",
      "mel_monitoring_responses",
      "mel_monitoring_jobs",
      "mel_monitoring_waste",
      "mel_monitoring_evidence",
      "mel_monitoring_finance_entries",
      "mel_monitoring_evidence_references",
      "mel_enterprise_achievements",
    ],
    enums: [
      "mel_monitoring_status",
      "mel_monitoring_source_mode",
      "mel_job_type",
      "mel_finance_type",
      "mel_evidence_status",
      "mel_achievement_status",
    ],
  },
  {
    phase: 3,
    label: "Review, DQA, evidence and learning",
    migration: "0035_mel_phase3_review_dqa.sql",
    tables: [
      "mel_monitoring_versions",
      "mel_review_decisions",
      "mel_dqa_issues",
      "mel_evidence_reviews",
      "mel_learning_actions",
      "mel_notification_outbox",
    ],
    enums: [
      "mel_review_stage",
      "mel_review_action",
      "mel_dqa_category",
      "mel_dqa_status",
      "mel_evidence_review_status",
      "mel_learning_action_status",
      "mel_notification_status",
    ],
  },
  {
    phase: 4,
    label: "ITT dashboards, GIS and reporting",
    migration: "0036_mel_phase4_reporting.sql",
    tables: ["mel_programme_results", "mel_indicator_results"],
    enums: ["mel_programme_result_status", "mel_traffic_light"],
  },
  {
    phase: 5,
    label: "Configurable tools, integrations and rollout",
    migration: "0037_mel_phase5_operations.sql",
    tables: [
      "mel_instruments",
      "mel_instrument_versions",
      "mel_instrument_sections",
      "mel_instrument_questions",
      "mel_integration_connections",
      "mel_import_mappings",
      "mel_import_batches",
      "mel_import_records",
      "mel_instrument_submissions",
      "mel_operational_events",
      "mel_operational_checks",
      "mel_rollout_control",
      "mel_rate_limit_buckets",
    ],
    enums: [
      "mel_instrument_type",
      "mel_instrument_status",
      "mel_question_response_type",
      "mel_import_provider",
      "mel_import_status",
      "mel_import_record_status",
      "mel_operational_check_status",
      "mel_rollout_stage",
    ],
  },
];

function parsePhases(argv: string[]): number[] {
  if (argv.includes("--all")) return MEL_PHASES.map((phase) => phase.phase);

  const joined = argv.join(" ");
  const flagMatch = joined.match(/--phases(?:=|\s+)([\d,\s-]+)/i);
  if (!flagMatch) return [1, 2, 3];

  const parsed = flagMatch[1]
    .split(/[,\s]+/)
    .map((part) => Number(part.trim()))
    .filter((value) => Number.isInteger(value) && value >= 1 && value <= 5);

  return parsed.length ? [...new Set(parsed)].sort((a, b) => a - b) : [1, 2, 3];
}

function mark(ok: boolean) {
  return ok ? "OK" : "MISSING";
}

async function main() {
  if (!process.env.POSTGRES_URL) {
    throw new Error("POSTGRES_URL is not defined");
  }

  const selectedPhases = parsePhases(process.argv.slice(2));
  const catalog = MEL_PHASES.filter((phase) => selectedPhases.includes(phase.phase));
  const expectedTables = catalog.flatMap((phase) => phase.tables);
  const expectedEnums = catalog.flatMap((phase) => phase.enums);

  const pool = new Pool({ connectionString: process.env.POSTGRES_URL });
  try {
    const tablesResult = await pool.query<{ table_name: string }>(
      `SELECT table_name
       FROM information_schema.tables
       WHERE table_schema = 'public'
         AND table_type = 'BASE TABLE'
         AND table_name = ANY($1::text[])`,
      [expectedTables]
    );
    const enumsResult = await pool.query<{ typname: string }>(
      `SELECT t.typname
       FROM pg_type t
       JOIN pg_namespace n ON n.oid = t.typnamespace
       WHERE n.nspname = 'public'
         AND t.typtype = 'e'
         AND t.typname = ANY($1::text[])`,
      [expectedEnums]
    );

    const presentTables = new Set(tablesResult.rows.map((row) => row.table_name));
    const presentEnums = new Set(enumsResult.rows.map((row) => row.typname));

    let missingTables = 0;
    let missingEnums = 0;

    console.log(`MEL schema check against ${process.env.POSTGRES_URL.replace(/:[^:@/]+@/, ":***@")}`);
    console.log(`Checking phases: ${selectedPhases.join(", ")}\n`);

    for (const phase of catalog) {
      const phaseMissingTables = phase.tables.filter((table) => !presentTables.has(table));
      const phaseMissingEnums = phase.enums.filter((enumName) => !presentEnums.has(enumName));
      missingTables += phaseMissingTables.length;
      missingEnums += phaseMissingEnums.length;

      const complete = phaseMissingTables.length === 0 && phaseMissingEnums.length === 0;
      console.log(
        `Phase ${phase.phase} · ${phase.label} [${complete ? "complete" : "incomplete"}]`
      );
      console.log(`  migration: drizzle/${phase.migration}`);

      for (const table of phase.tables) {
        const ok = presentTables.has(table);
        console.log(`  table  ${mark(ok).padEnd(7)} ${table}`);
      }
      for (const enumName of phase.enums) {
        const ok = presentEnums.has(enumName);
        console.log(`  enum   ${mark(ok).padEnd(7)} ${enumName}`);
      }
      console.log("");
    }

    const totalTables = expectedTables.length;
    const totalEnums = expectedEnums.length;
    console.log("Summary");
    console.log(
      `  tables  ${totalTables - missingTables}/${totalTables} present` +
        (missingTables ? ` · missing: ${missingTables}` : "")
    );
    console.log(
      `  enums   ${totalEnums - missingEnums}/${totalEnums} present` +
        (missingEnums ? ` · missing: ${missingEnums}` : "")
    );

    if (missingTables || missingEnums) {
      console.log("\nMissing objects");
      for (const phase of catalog) {
        for (const table of phase.tables) {
          if (!presentTables.has(table)) {
            console.log(`  - table ${table} (phase ${phase.phase})`);
          }
        }
        for (const enumName of phase.enums) {
          if (!presentEnums.has(enumName)) {
            console.log(`  - enum  ${enumName} (phase ${phase.phase})`);
          }
        }
      }
      console.log("\nApply pending migrations with: pnpm db:migrate");
      process.exitCode = 1;
      return;
    }

    console.log("\nAll checked MEL schema objects are present.");
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
