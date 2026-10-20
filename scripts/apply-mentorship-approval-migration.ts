import { loadEnvConfig } from "@next/env";
import { Pool } from "pg";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { cwd } from "node:process";

loadEnvConfig(cwd());

async function applyMentorshipApprovalMigration() {
  if (!process.env.POSTGRES_URL) {
    throw new Error("POSTGRES_URL is not defined");
  }

  const pool = new Pool({ connectionString: process.env.POSTGRES_URL });
  const sqlPath = join(cwd(), "drizzle", "0050_mentorship_session_approval.sql");
  const raw = readFileSync(sqlPath, "utf8");
  const statements = raw
    .split("--> statement-breakpoint")
    .map((part) => part.trim())
    .filter(Boolean);

  try {
    for (const statement of statements) {
      await pool.query(statement);
    }
    console.log("Applied drizzle/0050_mentorship_session_approval.sql");
  } finally {
    await pool.end();
  }
}

applyMentorshipApprovalMigration().catch((error) => {
  console.error(error);
  process.exit(1);
});
