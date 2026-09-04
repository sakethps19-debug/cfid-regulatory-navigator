# CFID Regulatory Navigator

An internal legal-research assistant pilot for one authorised CFID officer. Given a factual scenario, it identifies
potentially applicable SEBI Act sections, regulations and other provisions; matching factual ingredients; supporting
CFID orders with paragraph references; contrary/negative precedents; the procedural status of each finding; missing
facts or evidence; a confidence level; and links to official source documents.

**This is a research-assistance tool.** It does not make findings of guilt and does not conclude that a violation has
occurred merely because a scenario resembles an earlier order. See `/methodology` in the app for full details.

## Stack

Next.js (App Router) + TypeScript + Tailwind CSS, backed by a Postgres database (Supabase) with Row-Level Security
and Supabase Auth. **No paid AI API is used or required by the deployed application** — the Scenario Analyzer is a
deterministic keyword/synonym/fact-element matching engine, complemented by Postgres full-text search, over
structured data stored in the database. An LLM may assist a human during development or one-off data extraction, but
the running app never calls one.

## Getting started

```bash
npm install
cp .env.example .env.local
# fill in NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, ALLOWED_EMAILS
# (SUPABASE_DB_URL / SUPABASE_SERVICE_ROLE_KEY are only needed for the db:* scripts below)
npm run dev
```

The app expects the Supabase project's schema and data to already exist (see **Database** below) — `npm run dev`
alone does not create or seed anything.

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run test` | Run the automated test suite (Vitest) — offline, no database connection needed |
| `npm run import:data` | Parses the source `.xlsx` files into `src/data/generated/*.json`, which now serve only as fixtures for `npm test`, not as the live app's data source |
| `npm run validate:data` | Generates `validation-report.md` / `.json` from the generated JSON |
| `npm run db:build-import` | Regenerates `supabase/generated/import.sql` from the source workbooks and curated constants |
| `npm run db:run-import` | Applies `supabase/generated/import.sql` to the live database (requires `SUPABASE_DB_URL`) |
| `npm run db:verify` | Runs the RLS and data-integrity verification queries against the live database and prints the results (requires `SUPABASE_DB_URL`) |

The source workbooks (`CFID_Precedent_Library_Pilot.xlsx`, `Verified_CFID_Order_Links.xlsx`,
`Residual_Order_Links.xlsx`) are **never modified** by any script. The original `Links.xlsx` compilation these two
were refined from is no longer used.

## Database

Schema and RLS policies live in `supabase/migrations/*.sql`, applied in order. Summary:

- **14 required tables** plus `order_directions` (preserves the pilot workbook's directions/outcomes data):
  `orders`, `order_relationships`, `noticees`, `order_noticees`, `scenario_findings`, `legal_instruments`,
  `legal_provisions`, `provision_versions`, `finding_provisions`, `legal_tests`, `source_documents`,
  `processing_runs`, `validation_issues`, `residual_register`, `query_runs` (disabled by default — see
  `ENABLE_QUERY_LOGGING`).
- **Row-Level Security is enabled on every table**, enforced by an `is_allowed_user()` security-definer function
  that checks the caller's JWT email against `app_allowed_emails` (itself RLS-locked to the service role — no policy
  grants it to anyone). There is no anonymous read or write access anywhere, and no write policies at all — writes
  only happen via the service role (i.e. the `db:*` scripts above), never from the browser.
- `scenario_findings.search_vector` is a generated, indexed `tsvector` column backing the full-text-search
  complement to the deterministic matching engine.

To (re)populate the database after a schema or workbook change: `npm run db:build-import` then
`npm run db:run-import`, then `npm run db:verify` to confirm nothing regressed.

## Data model & precedent library

The **Case Library** (`/case-library`) is the full 89-order universe from `Verified_CFID_Order_Links.xlsx` — every
order number has been confirmed to contain "CFID". Each row's `processing_stage` shows exactly where it stands:
`indexed` → `downloaded` → `text_extracted` → `scenario_findings_extracted` → `legally_reviewed` (fully
deep-analyzed), or `retrieval_failed` / `needs_manual_review`. Today, 3 orders (2 cases: Rajesh Exports Limited
interim order; Seacoast Shipping Services Limited interim and final orders) are `legally_reviewed`, broken down into
34 scenario findings with paragraph citations. The remaining 86 are `retrieval_failed`: `sebi.gov.in` is not
reachable from the environment these were processed in (confirmed via direct network tests, not assumed), so they
are recorded as failed rather than fabricated — see `/admin` and `/admin/validation-issues` for the full accounting,
and **Continuing the case library** below for how to actually retrieve and analyse them.

`Residual_Order_Links.xlsx` (→ the `residual_register` table) is an exclusion and pending-link register only
(awaiting a link, a duplicate of a verified order, or confirmed not a CFID order) and is never treated as a source
of precedent. Both registers are shown in full, never auto-admitted or silently dropped, on the
**Orders Awaiting Analysis** page. See `/methodology` for the full sourcing policy.

The **Law Library** (`/law-library`) lists every legal instrument and provision actually cited in the analysed
orders, sourced only from the official SEBI/MCA websites — never law-firm articles, blogs, news, or commercial
databases. `provision_versions` is where a provision's *historically applicable* text would go once independently
verified; today every provision's version is marked "Requires verification" rather than assuming current text
applied at the time of the conduct.

## Continuing the case library

To move another order from `retrieval_failed` (or any earlier stage) to `legally_reviewed`:

1. Retrieve the order from its official SEBI URL (the `orders.official_url` column already has it).
2. Confirm the order number contains "CFID" from the document itself (already true for all 89 rows here, but always
   re-confirm from the actual document, not the workbook).
3. Extract scenario findings, the provisions considered, and exact paragraph references — verbatim from the order,
   never inferred or invented. Flag anything ambiguous as `needs_manual_review` rather than guessing.
4. Add the rows via `scripts/db/build-import-sql.ts` (extend it with the new case, following the existing pilot-order
   pattern) or by hand-writing idempotent `insert ... on conflict` SQL against the schema above, then
   `npm run db:run-import` and `npm run db:verify`.
5. Update `orders.processing_stage` to `legally_reviewed` only once paragraph citations and the official URL are in
   place for every finding — never mark a stage complete based on a partial extraction.

## Security

Supabase Auth (email + password) gated by an `ALLOWED_EMAILS` allow-list, enforced both in the Next.js middleware
(`src/proxy.ts`, via the `is_allowed_user()` RPC) and — the real security boundary — by Row-Level Security on every
table, so an unlisted or unauthenticated caller reads nothing regardless of the app layer. No service-role key is
ever present in browser code. Security headers, and basic rate limiting are applied to every request. No scenario
queries are stored by default (`ENABLE_QUERY_LOGGING=false`) and no analytics/trackers are included. See
`.env.example` for every required variable, and `scripts/db/verify-rls.sql` / `npm run db:verify` for the RLS
verification queries (run manually against the live project — this sandbox's own network policy blocks it from
reaching the Supabase project directly, the same restriction that blocks `sebi.gov.in`).
