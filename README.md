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
npm run import:data          # parse the two source workbooks into src/data/generated/*.json
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
| `npm run import:data` | Idempotent import from the two source `.xlsx` files into `src/data/generated/*.json` |
| `npm run validate:data` | Generate `validation-report.md` / `.json` from the generated data |

The two source workbooks (`CFID_Precedent_Library_Pilot.xlsx`, `Links.xlsx`) are **never modified** by any script.

## Data model & precedent library

Version 1's verified precedent library is exactly three CFID orders (order numbers confirmed to contain "CFID"):
Rajesh Exports Limited (interim) and Seacoast Shipping Services Limited (interim and final). Everything else in
`Links.xlsx` is held in the **Orders Awaiting Analysis** register for manual review, never auto-admitted. See
`/methodology` for the full explanation and the procedure for adding verified orders later.

## Security

Single-user, environment-variable-based authentication (`PILOT_USERNAME`, `PILOT_PASSWORD`, `AUTH_SECRET`) with
signed HTTP-only session cookies, server-side route protection, security headers, and basic rate limiting. No
scenario queries are stored and no analytics/trackers are included. See `.env.example`.
