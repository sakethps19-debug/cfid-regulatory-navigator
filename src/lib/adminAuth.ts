// Server-only admin authorization boundary (independent-audit correction,
// P0-1). Before this, /admin and every /admin/* route were reachable by any
// authenticated, allow-listed research user -- NavBar merely hid the link
// under "More", which the file's own comment openly acknowledged was
// information architecture, not a security boundary. That is now a real
// authorization defect, not a wording defect, and is fixed here.
//
// Design choice (Option A of the two considered): a separate, server-only
// environment variable (ADMIN_ALLOWED_EMAILS), never a schema/RLS change in
// this pass. This closes the Next.js application boundary -- server-side
// middleware (proxy.ts) and every /admin/* page -- immediately, with no
// database write and no migration. It deliberately fails CLOSED: if the env
// var is unset or empty, isAdminEmail() returns false for every address, so
// the honest default is "no one can reach Admin" rather than either
// reverting to today's "everyone can" or silently disabling the check.
//
// KNOWN LIMITATION, not fixed by this file: every application table's RLS
// policy (migration 0002_rls.sql) grants SELECT to any is_allowed_user(),
// with no distinction between "research" and "admin-only" tables
// (validation_issues, residual_register, processing_runs, query_runs
// included). A technically capable allow-listed user could still read those
// tables directly via the Supabase REST API using the public anon key and
// their own session, bypassing this file and the Next.js layer entirely.
// Closing that requires Option B -- an is_admin_user() RLS predicate backed
// by role metadata in (or alongside) app_allowed_emails -- which needs a
// migration and is intentionally NOT applied in this pass pending approval.
// See the session report for the exact proposed migration.
//
// process.env.ADMIN_ALLOWED_EMAILS: a comma-separated list of admin email
// addresses. Deliberately NOT prefixed with NEXT_PUBLIC_, so it is never
// bundled into client JavaScript and is only ever read in this server-only
// module (middleware and Server Components).
function parseAdminAllowlist(): Set<string> {
  const raw = process.env.ADMIN_ALLOWED_EMAILS;
  if (!raw) return new Set();
  return new Set(
    raw
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean)
  );
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return parseAdminAllowlist().has(email.toLowerCase());
}

/** True for any path this app treats as admin-only: the /admin page tree
 * today, and any future /api/admin/* route, so a new admin API added later
 * is gated by construction rather than by remembering to add it here. */
export function isAdminPath(pathname: string): boolean {
  return pathname === "/admin" || pathname.startsWith("/admin/") || pathname.startsWith("/api/admin/");
}
