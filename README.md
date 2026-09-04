# CFID Regulatory Navigator

An internal legal-research assistant pilot for one authorised CFID officer. Given a factual scenario, it identifies
potentially applicable SEBI Act sections, regulations and other provisions; matching factual ingredients; supporting
CFID orders with paragraph references; contrary/negative precedents; the procedural status of each finding; missing
facts or evidence; a confidence level; and links to official source documents.

**This is a research-assistance tool.** It does not make findings of guilt and does not conclude that a violation has
occurred merely because a scenario resembles an earlier order. See `/methodology` in the app for full details.

## Stack

Next.js (App Router) + TypeScript + Tailwind CSS. No paid AI API is used or required — the Scenario Analyzer is a
deterministic keyword/synonym/fact-element matching engine over structured data generated from two source workbooks.

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in PILOT_USERNAME, PILOT_PASSWORD, AUTH_SECRET
npm run import:data          # parse the source workbooks into src/data/generated/*.json
npm run validate:data        # generate validation-report.md / .json
npm run dev
```

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run test` | Run the automated test suite (Vitest) |
| `npm run import:data` | Idempotent import from the source `.xlsx` files into `src/data/generated/*.json` |
| `npm run validate:data` | Generate `validation-report.md` / `.json` from the generated data |

The source workbooks (`CFID_Precedent_Library_Pilot.xlsx`, `Verified_CFID_Order_Links.xlsx`,
`Residual_Order_Links.xlsx`) are **never modified** by any script. The original `Links.xlsx` compilation these two
were refined from is no longer used.

## Data model & precedent library

The deep-analyzed scenario-finding precedent database covers exactly three CFID orders (order numbers confirmed to
contain "CFID"): Rajesh Exports Limited (interim) and Seacoast Shipping Services Limited (interim and final).

`Verified_CFID_Order_Links.xlsx` is the broader authoritative list of confirmed CFID orders (89 order rows / 54
cases) — everything in it beyond the two deep-analyzed cases is genuine but still awaiting detailed scenario
analysis. `Residual_Order_Links.xlsx` is an exclusion and pending-link register only (awaiting a link, a duplicate of
a verified order, or confirmed not a CFID order) and is never treated as a source of precedent. Both are shown in
full, never auto-admitted or deleted, on the **Orders Awaiting Analysis** page. See `/methodology` for the full
explanation and the procedure for adding newly analysed orders later.

## Security

Single-user, environment-variable-based authentication (`PILOT_USERNAME`, `PILOT_PASSWORD`, `AUTH_SECRET`) with
signed HTTP-only session cookies, server-side route protection, security headers, and basic rate limiting. No
scenario queries are stored and no analytics/trackers are included. See `.env.example`.
