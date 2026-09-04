/**
 * Runs the data-integrity and RLS verification queries
 * (scripts/db/verify-data-integrity.sql and scripts/db/verify-rls.sql)
 * against the live database and prints every statement's result.
 *
 * Requires SUPABASE_DB_URL (see scripts/db/run-import.ts).
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Client } from "pg";

function splitStatements(sql: string): string[] {
  return sql
    .split(/;\s*(?:\r?\n|$)/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith("--"));
}

async function runFile(client: Client, relativePath: string) {
  const filePath = resolve(__dirname, relativePath);
  const sql = readFileSync(filePath, "utf8");
  console.log(`\n=== ${relativePath} ===`);
  for (const statement of splitStatements(sql)) {
    const result = await client.query(statement);
    if (result.rows.length > 0 || /^select/i.test(statement.trim())) {
      console.log(`-- ${statement.split("\n")[0].slice(0, 80)}`);
      console.table(result.rows);
    }
  }
}

async function main() {
  const dbUrl = process.env.SUPABASE_DB_URL;
  if (!dbUrl) {
    console.error("SUPABASE_DB_URL is required (see scripts/db/run-import.ts).");
    process.exit(1);
  }
  const client = new Client({ connectionString: dbUrl });
  await client.connect();
  try {
    await runFile(client, "verify-data-integrity.sql");
    await runFile(client, "verify-rls.sql");
    console.log("\nAll checks completed. Every count above should read 0 (or, for the Seacoast");
    console.log("check, show SSSL-03 as not_upheld) — investigate anything else before trusting the data.");
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
