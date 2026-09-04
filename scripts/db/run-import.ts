/**
 * Loads supabase/generated/import.sql into the live Supabase Postgres database.
 *
 * This is the checked-in, reusable counterpart to the one-off manual population
 * done via the Supabase MCP server during initial setup. Run it after
 * `npm run db:build-import` whenever the source workbooks or curated constants
 * change and the live database needs to be brought up to date.
 *
 * All statements in import.sql are idempotent upserts (`insert ... on conflict
 * do update/do nothing`), so re-running this script is always safe.
 *
 * Requires SUPABASE_DB_URL: a direct Postgres connection string (Supabase
 * Project Settings -> Database -> Connection string -> URI, using the
 * service-level `postgres` role). Server-side / CI use only — never expose
 * this connection string to browser code.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Client } from "pg";

async function main() {
  const dbUrl = process.env.SUPABASE_DB_URL;
  if (!dbUrl) {
    console.error(
      "SUPABASE_DB_URL is required (a direct Postgres connection string, e.g. from " +
        "Supabase Project Settings -> Database -> Connection string -> URI). " +
        "This script runs statements with a service-level Postgres role and must " +
        "never be run from browser code.",
    );
    process.exit(1);
  }

  const sqlPath = resolve(__dirname, "../../supabase/generated/import.sql");
  const sql = readFileSync(sqlPath, "utf8");

  const client = new Client({ connectionString: dbUrl });
  await client.connect();
  try {
    console.log(`Applying ${sqlPath} (${sql.length} bytes)...`);
    await client.query(sql);
    console.log("Import applied successfully.");
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error("Import failed:", err);
  process.exit(1);
});
