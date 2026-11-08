import { cwd } from "node:process";
import { readFileSync } from "node:fs";
import { loadEnvConfig } from "@next/env";
import { Pool } from "pg";

loadEnvConfig(cwd());

async function main() {
  const sql = readFileSync("drizzle/0051_kajabi_user_status.sql", "utf8")
    .split("--> statement-breakpoint")
    .map((s) => s.trim())
    .filter(Boolean);

  const pool = new Pool({ connectionString: process.env.POSTGRES_URL });
  try {
    for (const stmt of sql) {
      await pool.query(stmt);
      console.log("applied:", stmt.slice(0, 90).replaceAll("\n", " "));
    }

    const r = await pool.query(
      `select column_name from information_schema.columns where table_name = 'user' and column_name like 'kajabi%'`
    );
    console.log("columns:", r.rows);
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
