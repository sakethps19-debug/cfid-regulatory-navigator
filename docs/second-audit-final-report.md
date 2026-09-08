# Second correctness/legal-reliability audit: final report

Prepared as a senior CFID investigating officer's defensibility review and a
principal engineer's overclaim-prevention review, per the audit prompt that
opened this pass. Every number below was re-queried against the live
database (project `aytcrvaagqxyetqckbvb`) or the current test suite at the
time this report was written, never carried forward from the audit prompt's
own cited figures.

## A. Baseline

- Starting point: production READY on commit `972182883198a1da7de63112b24c8f7d574a1c0a`
  (as stated in the audit prompt; re-verified as the correct starting
  `main` HEAD before this pass began).
- Ending point: production READY on commit **`47fa14c92c9dad2d2d5bffc4d60a1d1b75857ab4`**
  (Vercel deployment `dpl_6oWCpi7H7dvV1eXQ597niJJ4sC8y`, `readyState: "READY"`,
  confirmed live at the time of this report).
- 12 commits, 42 files changed, +2,914 / -277 lines.
- Live corpus at time of writing: 89 orders, 91 scenario findings (91
  searchable, 0 human-legally-reviewed), 99 legal provisions (8 officially
  verified, all 8 in PFUTP Regulation 4), 871 finding_provisions rows, 79 of
  89 orders actually contributing a structured finding to retrieval.

## B. Confirmed defects (per item in the audit prompt)

| # | Item | Status | Notes |
|---|---|---|---|
| P0-1 | Remaining violation language | **Not reproducible** | Grepped current `main` before starting; already fixed in the prior pass. Existing forbidden-phrase test still passes. |
| P0-2 | Factual overlap contaminated by procedural stage | **Confirmed, fixed** | `deriveConfidence` used a `score *= 1.15` finality multiplier and `isFinal`/`isUnresolved` tier-gating. Replaced with `compareByFactualScoreThenFinality`, a ties-only secondary sort key with no scoring effect. |
| P0-3 | `finding_provisions.relationship` unaudited | **Confirmed gap, addressed** | Audited all 871 rows (`docs/finding-provisions-relationship-audit.md`). 625/871 (72%) show genuine per-provision curation, not a mechanical broadcast - but zero `data_change_log` provenance exists for it, and the field conflates "role" with "disposition" (19 `upheld` rows belong to interim-only findings). Schema migration judged unwarranted; every display surface reworded to be precise and hedged instead. |
| P0-4 | Searchable-corpus verification maturity not exposed | **Confirmed gap, fixed** | Built `findingMaturityTier()` (6 tiers, derived from a live 5-flag GROUP BY that found exactly 3 real patterns), wired into every precedent card, both exports, and the Legal Review Queue. |
| P0-5 | Free-text concepts and dropdown filters diverged | **Confirmed defect, fixed** | A dropdown selection added an ad hoc score bonus via a separate code path and was invisible in "matched factual ingredients" unless the same fact was also free-text-detected - a real transparency gap, and it double-counted when a fact was both typed and selected. Unified via `buildEffectiveScenarioConcepts()`; dropdowns are explicitly signals, not filters (renamed accordingly), and neither bug reproduces after the fix. |
| P0-6 | Unmatched concept tags mislabelled as "legal ingredients" | **Confirmed naming collision, fixed** | `PrecedentRef.ingredientsNotEstablished` (mechanical tag subtraction) and `ScenarioFinding.ingredientsNotEstablished` (curated, from `scenario_findings.ingredients_not_established`, populated for 30/91 findings) shared an identical name - and the curated field's own doc comment was wrong, describing it as engine-computed. Renamed the mechanical one, fixed the doc comment, and surfaced the previously-unshown curated content in the UI and exports for the first time. |
| P0-7 | `missingFacts` merged across precedents | **Confirmed defect, fixed** | Flattened evidentiary gaps across every supporting precedent into one deduplicated, unattributed list - two precedents' distinct requirements could read as one undifferentiated (or worse, universal) checklist. Changed to `MissingFactsForPrecedent[]`, grouped per precedent by record id. |
| P1-8 | Supporting precedents undifferentiated | **Confirmed, fixed** | Added `supportCategory()` (Final merits support / Interim-prima facie / Contextual-unresolved), shown per card and in both exports. |
| P1-9 | Contrary-only provisions silently dropped | **Confirmed real defect, fixed** | `if (supporting.length === 0) continue` discarded a provision entirely when its only matches were contrary findings - an officer researching facts similar to a matter where a provision was considered and NOT confirmed had no way to learn that. Added `contraryOnlyProvisionResults`, a distinct "warranting caution" surface. |
| P1-10/11 | Controlled-vocabulary false positives | **Confirmed, 3 fixed** | `related_party_counterparty` carried bare "vendor"/"counterparty" (confirmed live: an existing test asserted a related-party match from a plain vendor-purchase sentence). `director_general` carried bare "director", matching inside every specific director-role phrase via substring search. `revenue_recognition` carried bare "understated". All three narrowed to qualified phrases; aggressive false-positive and true-positive tests added. |
| P1-12/13 | Corpus-coverage queue and law-verification overclaim | **Confirmed, addressed** | 10 of 89 orders (re-verified live, by actual finding presence, not `processing_stage`) contribute zero findings despite all 89 uniformly showing `processing_stage = "citations_checked"`. Built a reasoned, tiered admin queue. Confirmed 8/99 verified provisions are 100% concentrated in PFUTP Reg. 4; added a live-computed verification-concentration summary to the Law Library (previously implicit only, in per-provision badges). |
| P1-14/15/16 | Golden matrix lacked provision-level assertions; no adversarial tests; no blind-harness scaffold | **Confirmed gaps, addressed** | Added must-appear/must-not-appear provision assertions for 3 scenarios (reasoning surfaced and corrected a real premise error mid-work - see section C). Added 2 new adversarial tests (ruled-out diversion, disclosed RPT); vendor/director cases already covered by P1-10/11's own tests. Added `blindHarness.ts`, a scaffold only - explicitly NOT populated, per its own doc comment on why an engineer populating it would defeat the point. |
| P2-17 | Result ordering vs. a 9-step officer-need hierarchy | **Assessed, not reordered** | The specific 9-step hierarchy was not available verbatim to reproduce faithfully from this session's context. Current ordering (factual score, then finality; Final-merits-support before weaker support before contrary; full-text-supplemental always last) already reflects the same dimension model built throughout this pass and was judged defensible; inventing a new scheme without the source spec risked contradicting unstated intent. Flagged as open in section L. |
| P2-18 | `case_name` vs. verified identifiers | **Confirmed real defects, 2 fixed** | Live query found "Brightcom Group Ltd." and "Eros International Media Limited" each span 2 genuinely different `matterId`s under an identical `case_name`. This directly broke this session's own P1-12/13 work (grouped by `caseName`, wrongly classifying an uncovered Eros order as "covered") and the order-detail page's `directionsForCase(caseName)` (ignoring `order_directions.order_id`, a fully-populated foreign key). Both fixed to use verified identifiers (`matterId`, `order_id`), never `case_name` string equality. |
| P2-19 | Result traceability and full-text/deterministic distinction | **Confirmed gap, fixed** | Full-text-supplemental findings were shown on screen but omitted entirely from both exports, and lacked a paragraph reference even on screen. Added to both exports with full traceability (record id, status, review state, maturity, paragraph ref, source) and an explicit "Full-text match only" label distinguishing them from scored deterministic results. |
| Security (20) | RLS/allowlist/no-service-role/no-CRUD | **Confirmed unchanged** | `git diff` of `src/proxy.ts` and `src/lib/supabase/` between the pre-audit baseline and this report's HEAD is empty. No `service_role`/`SERVICE_ROLE` string appears anywhere in `src/`. No new API routes; `flag-result` (the one existing write path) unchanged. No Supabase migrations touched. |
| Visual QA (21) | Honest per-page classification | **See section L** | No service-role key or magic-link bypass was created (none existed before; none added). This pass's changes were verified by code inspection, `tsc`, `eslint`, `vitest` (302 tests) and `next build` only - no browser session was available in this environment. Every page touched is listed as code-inspected-only in section L, matching the same honesty standard the first audit pass established. |
| Data Review Workflow (22) | More Legal Review Queue filters | **Confirmed gap, fixed** | Added "Published but partially verified", "No provisions mapped", "No alleged-conduct tags" filters, alongside the existing per-field ones. Queue remains fully read-only - no new write path was added. |

## C. 13-scenario golden matrix (provision-level layer)

`docs/mandatory-scenario-audit.md`'s existing matrix (13/13 PASS, unchanged
by this pass) asserted only precedent record ids. This pass's addendum adds
must-appear/must-not-appear **provision** assertions for scenarios 1, 6 and
7, reasoned from each fixture record's own curated data.

Building the scenario-6 assertion is documented in full because it produced
a genuine correction, not a forced pass: an initial assertion ("Audit
Committee lapse must never surface the Compliance-Officer-specific
provision") failed on first run. Investigating why - rather than weakening
the assertion - found a real curated record, `SSSL-22`
("Compliance Officers failed to ensure Audit Committee compliance"), whose
own `allegedConduct` legitimately carries both `audit_committee_deficiency`
and `compliance_officer_deficiency`. The assertion's own premise was wrong;
it was corrected to match the corpus's real, reasoned shape. All 10
resulting provision-level assertions (7 must-appear/must-not-appear pairs
across 3 scenarios, after the correction) pass.

## D. Adversarial/negative matrix

| Case | Assertion | Result |
|---|---|---|
| Bare "vendor" mention | Must NOT detect `related_party_counterparty` | PASS |
| Bare "counterparty" mention | Must NOT detect `related_party_counterparty` | PASS |
| Bare "customer" mention | Must NOT detect `related_party_counterparty` | PASS |
| "Managing Director" mention | Must NOT double-count as `director_general` | PASS |
| "Independent Director" mention | Must NOT double-count as `director_general` | PASS |
| "Nominee Director" mention | Must NOT double-count as `director_general` | PASS |
| Risk/liability "understated" (unrelated to revenue) | Must NOT detect `revenue_recognition` | PASS |
| Fund routing explicitly ruled out as diversion | Must NOT match via `fund_diversion` conduct | PASS |
| Related-party transaction stated as disclosed/reviewed | Must NOT match `non_disclosure_of_information` or `related_party_misrepresentation` | PASS |

Every case above ships as an automated regression test
(`tests/false-positive-vocabulary.test.ts`,
`tests/golden-scenario-provisions.test.ts`), not a one-off manual check.

## E. Matching architecture (unchanged premise, now more precisely separated)

Four genuinely independent dimensions, none of which may influence another:

1. **Factual overlap** (`ConfidenceLevel`/`matchStrengthLabel`) - transaction/
   actor/conduct/evidence tag overlap only. As of P0-2, structurally
   decontaminated from procedural stage (no multiplier, no tier-gating).
2. **Procedural authority/stage** - final/confirmatory/interim/allegation-only,
   shown via `StatusBadge`/`findingStatusLabel`; breaks ties in display
   order only (`compareByFactualScoreThenFinality`), never the score itself.
3. **Historical disposition** - confirmed/not-confirmed/no-determination,
   folded into the same status label.
4. **Data-verification maturity** (new, P0-4) - `findingMaturityTier`, a
   6-tier classification of how much of a finding's own record has been
   independently checked, entirely separate from what the finding says.

Plus, as of this pass, an explicit fifth question the UI now answers
separately: **is this provision link recorded as cited/considered, or as the
basis of the finding's own disposition** (`finding_provisions.relationship`,
see section F) - never conflated with dimension 2 or 3 above.

## F. Provision-relationship audit (`finding_provisions.relationship`)

Re-confirmed live, unchanged from the P0-3 audit this pass conducted:

| Category | Count | Basis |
|---|---|---|
| Cited / considered only | 806 | `relationship = 'alleged'` |
| Recorded as basis of disposition | 65 | `relationship in ('upheld','not_upheld')` |
| — of which final-order-confirmed | 39 | `relationship='upheld'` and finding status final-confirmed |
| — of which interim-confirmed only | 19 | `relationship='upheld'` and finding status `confirmed_at_interim` |
| — of which not-confirmed | 7 | `relationship='not_upheld'` |
| Unknown/other | 0 | no rows outside the three values above |

72% of rows (625/871) deviate from a pure mechanical broadcast, evidencing
genuine per-provision curation - but with zero recorded provenance
(`data_change_log` has no entries for this field). See
`docs/finding-provisions-relationship-audit.md` for the full methodology.

## G. Searchable-corpus verification-maturity counts

Re-queried live at time of writing (unchanged from the P0-4 design query):

| Pattern | Count |
|---|---|
| All 5 verification fields true (Field-verified, human review pending) | 66 |
| All fields true except provision mapping (Source-verified, provision-mapping pending) | 14 |
| All 5 verification fields false (Unverified candidate material) | 11 |
| Human-legally-reviewed | 0 |
| **Total searchable findings** | **91** |

No finding has been human-legally-reviewed. `FindingMaturityBadge` shows
this tier on every precedent card and in both exports; it was previously
invisible outside raw per-flag badges on the admin-only Legal Review Queue.

## H. Corpus coverage

- 89 total orders; **79 contribute at least one structured finding** to
  retrieval (confirmed by actual `scenario_findings.order_id`/
  `final_order_id` presence, not by `processing_stage`, which uniformly
  reads `citations_checked` - i.e. "complete" - for all 89, a genuine
  label/reality mismatch this pass found and worked around rather than
  trusting).
- The 10 non-contributing orders are now a named, prioritized, reasoned
  queue on the Admin Processing Dashboard (never a mass-generated flat
  list): grouped correctly by `matterId` after the P2-18 fix, none of the
  10 represents a fully-uncovered matter (Tier 1 count: 0 after the fix,
  though the mechanism is real and would surface one if it existed); the
  Eros order specifically moved from a wrongly-assigned Tier 3 to the
  correct Tier 1 as a direct result of the P2-18 fix.

## I. Law-library verification status

- 8 of 99 legal provisions are officially verified against an official
  source - all 8 within PFUTP Regulation 4(1)-(2)(r), zero in any other
  instrument (SEBI Act, LODR, ICDR, Companies Act, accounting standards).
- This concentration is now stated explicitly and live-computed
  (`computeVerificationSummary`) as a banner on the Law Library landing
  page, a per-regulator count on every browse card, and a per-instrument
  count on the instrument detail page - not merely inferable from scanning
  individual provision badges, which was the prior state.

## J. Security

- RLS, the `app_allowed_emails` allowlist gate, and the absence of
  self-registration or any service-role-key usage in application code were
  all re-confirmed unchanged: `git diff` of `src/proxy.ts` and
  `src/lib/supabase/` between the pre-audit baseline and this report's HEAD
  is empty, and no `service_role`/`SERVICE_ROLE` string exists anywhere in
  `src/`.
- No new API route was added; the sole existing write path
  (`/api/flag-result`, inserting into `validation_issues`) is unchanged.
- No Supabase migration was applied or modified this pass.
- The Legal Review Queue's 3 new filters (section 22/Data Review Workflow)
  are pure client-side predicates over already-fetched, read-only data - no
  new query, no new write capability.

## K. Tests

- 302 tests passing (up from 233 at the end of the first audit pass), 0
  failing, across 48 test files.
- `npx tsc --noEmit`, `npx eslint .`, and `npx next build` all clean at the
  time of this report.
- Every new test added this pass was written against reasoned expectations
  (fixture data's own curated tags, live-queried corpus shapes, or hand-
  worked arithmetic for the blind-harness metrics), not captured from
  current output - including the one documented case (golden scenario 6)
  where the initial reasoning was itself wrong and the test was corrected,
  not the code, after investigation confirmed the code was right.
- No existing test was deleted or weakened to reach a green suite; every
  test whose expected value changed (P0-2's finality-decontamination
  fallout, the P1-10/11 vendor-based test, the P1-14 scenario-6 assertion)
  carries an inline explanation of why the new expected value is the
  correct one.

## L. Remaining limitations (honestly disclosed, not fixed this pass)

- **P2-17 (result ordering)**: not reordered against the audit prompt's
  9-step hierarchy, since the exact steps were not available to reproduce
  verbatim in this session; current ordering is defensible but not proven
  identical to what was originally specified.
- **Visual QA**: every page this pass touched or could have affected was
  verified by code inspection, `tsc`, `eslint`, `vitest`, and `next build`
  only - no live browser session was available in this remote environment,
  and (per explicit prior instruction) no service-role key or magic-link
  bypass was created to work around that. Pages touched this pass:
  `/analyzer` (ScenarioAnalyzerClient - extensively), `/admin` (new
  coverage-gap section), `/admin/legal-review-queue` (new filters + badge),
  `/law-library` and its `[regulator]`/`[instrumentId]` sub-pages
  (verification summary), `/orders/[id]` (directions fix). All are
  code-inspected-only for this pass; none has been freshly browser-tested
  since the first audit pass's own browser-testing work (which covered a
  different, earlier commit).
- **Blind validation harness**: a scaffold only, `BLIND_VALIDATION_SCENARIOS`
  is genuinely empty. No blind study has been conducted; populating it
  requires an independently-reasoning reviewer, not an engineer, per the
  scaffold's own documentation (`docs/blind-validation-harness.md`).
- **0 human-legally-reviewed findings**: unchanged fact, now maximally
  visible (badges everywhere, exports, Law Library and Legal Review Queue
  summaries) rather than fixed - this pass cannot itself perform legal
  review, only ensure the absence of it is never hidden.
- **8/99 verified provisions**: a real, disclosed, narrow verification
  base; this pass made the narrowness impossible to miss rather than
  expanding it (expanding it is substantive legal-verification work outside
  an engineering pass's scope).

## M. Deployment

- Final branch: `claude/cfid-regulatory-navigator-pilot-20sp70`, merged
  fast-forward into `main`.
- Final commit: **`47fa14c92c9dad2d2d5bffc4d60a1d1b75857ab4`**.
- Vercel production deployment `dpl_6oWCpi7H7dvV1eXQ597niJJ4sC8y`:
  `readyState: "READY"`, confirmed live at the time of this report, serving
  `cfid-regulatory-navigator.vercel.app`.
