/**
 * Check whether mentorship tables exist in the connected database.
 *
 * Usage:
 *   pnpm check:mentorship-schema
 *
 * If tables are missing, apply migrations against the same POSTGRES_URL:
 *   pnpm db:migrate
 */
import { cwd } from "node:process";
import { loadEnvConfig } from "@next/env";
import { Pool } from "@neondatabase/serverless";

loadEnvConfig(cwd());

const MENTORSHIP_TABLES = [
  "mentors",
  "mentorship_matches",
  "mentorship_sessions",
  "mentorship_action_items",
] as const;

const MIGRATION = "0010_nappy_maverick.sql";

async function main() {
  const url = process.env.POSTGRES_URL;
  if (!url) {
    console.error("POSTGRES_URL is not defined");
    process.exit(1);
  }

  const pool = new Pool({ connectionString: url });

  try {
    const missing: string[] = [];

    for (const table of MENTORSHIP_TABLES) {
      const res = await pool.query(
        `SELECT to_regclass('public.${table}') AS regclass`
      );
      if (!res.rows[0]?.regclass) {
        missing.push(table);
      }
    }

    if (missing.length === 0) {
      console.log("OK — all mentorship tables exist:");
      for (const table of MENTORSHIP_TABLES) {
        console.log(`  ✓ ${table}`);
      }
      return;
    }

    console.error("Missing mentorship tables:");
    for (const table of missing) {
      console.error(`  ✗ ${table}`);
    }
    console.error("");
    console.error(
      `These are created in drizzle/${MIGRATION}. Run: pnpm db:migrate`
    );
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
