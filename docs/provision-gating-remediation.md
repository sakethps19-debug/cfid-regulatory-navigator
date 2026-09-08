# P0 Provision-Precision Remediation

## Why this pass

An independent 100-scenario CFID-officer stress test against production
(commit `972182883198a1da7de63112b24c8f7d574a1c0a`) confirmed a systemic
provision-precision defect: a pure, undisclosed related-party-transaction
scenario with no fraud, diversion, price-manipulation or securities-dealing
allegation returned PFUTP Regulations 3(a)-(d), 4(1), several 4(2) clauses,
and SEBI Act 12A candidates. The same over-retrieval pattern was reproduced
for pure fund diversion, pure fictitious sales, pure accounting error, pure
investigation non-cooperation, and several other fact patterns with no
securities-market nexus stated.

## Root cause 1 (confirmed): provision leakage from matched findings

`analyzeScenario` (`src/lib/matching/engine.ts`) surfaces a provision
whenever ANY finding it matches on ANY tag also cites that provision, unless
the specific finding-provision link's `justifying_tags` narrows it. Live
re-query at the start of this pass:

| Provision | Total links | Links with empty justifying_tags |
|---|---|---|
| PFUTP-3-a | 11 | 11 |
| PFUTP-3-b | 41 | 41 |
| PFUTP-3-c | 46 | 46 |
| PFUTP-3-d | 46 | 46 |
| PFUTP-4-1 | 50 | 50 |
| PFUTP-4-2-a | 2 | 2 |
| PFUTP-4-2-b | 1 | 1 |
| PFUTP-4-2-c | 1 | 1 |
| PFUTP-4-2-e | 23 | 23 |
| PFUTP-4-2-f | 42 | 42 |
| PFUTP-4-2-k | 34 | 34 |
| PFUTP-4-2-r | 36 | 36 |
| SEBI-ACT-12A-a | 51 | 51 |
| SEBI-ACT-12A-b | 57 | 57 |
| SEBI-ACT-12A-c | 57 | 57 |
| **Total** | **498** | **498 (100%)** |

Every single PFUTP/SEBI-Act-12A `finding_provisions` link is currently
treated as universal. A single historical finding routinely bundles several
distinct allegations (an RPT plus a separately-alleged securities-fraud
scheme, or a fund diversion plus a separately-alleged PFUTP charge), so any
scenario matching that finding on ANY of its bundled tags pulled in the
FULL provision bundle, including PFUTP/12A clauses that had nothing to do
with what the present scenario actually described.

## Root cause 2 (not reproduced as a new defect; already substantially
addressed): finding-level status too coarse for provision-specific
disposition

`finding_provisions.relationship` (`alleged | applied | upheld | not_upheld`)
was already audited in the prior remediation pass — see
`docs/finding-provisions-relationship-audit.md`. That audit live-confirmed
625 of 871 rows (72%) deviate from a pure mechanical broadcast of the
parent finding's own status, i.e. genuine per-provision curation exists for
the large majority of resolved findings, and concluded a schema migration
was not warranted. This pass re-confirms those same live counts (871 total,
unchanged) and did not find a new instance of the finding's overall status
being presented as though it applied uniformly to every cited provision.
The remaining gap that audit already disclosed — no recorded reviewer
methodology/provenance for that curation, and 0 of 91 findings with
`human_legal_review_completed = true` — still stands and is not
re-litigated here.

## The fix: a provision-level retrieval gate

`src/data/curated/provision-retrieval-rules.ts` adds an independent,
provision-keyed gate applied IN ADDITION TO (never instead of) the existing
per-link `justifyingTags` check. Each gated provision declares
`requireAllOfGroups: string[][]` — the query's effective concepts (free
text + dropdown signals, unified via `buildEffectiveScenarioConcepts`) must
contain at least one id from EVERY group for the provision to be retrieved.
A provision with no rule is completely unaffected (LODR, Ind AS,
investigation/governance provisions — the large majority of the corpus).

Reusable concept groups (composed entirely from the existing curated
vocabulary, no new tag ids invented):

- `SECURITIES_ISSUE_OR_DEALING_NEXUS` — preferential allotment, rights/IPO
  issue, sham/unsupported-consideration allotment, price-manipulation
  conduct.
- `DECEPTIVE_OR_FRAUDULENT_CONDUCT` — fictitious sales/assets, financial
  statement misstatement, false corporate announcement, sham allotment,
  unsupported consideration, price manipulation, related-party
  misrepresentation.
- `INVESTOR_COMMUNICATION_CHANNEL` — financial statement/annual
  report/corporate announcement/segment disclosure (the channel through
  which information reaches investors).
- `TRADING_OR_PRICE_CONDUCT` — the price-manipulation conduct tag alone (the
  only curated signal presently capturing synchronized/wash trading,
  artificial price, no genuine ownership change, inducement to trade).

### Gate assignments

| Provision | Gate |
|---|---|
| PFUTP-3-a/b/c/d, PFUTP-4-1, SEBI-ACT-12A-a/b/c (+ legacy bundled `SEBI-ACT-12A`, `PFUTP-3-a-d`) | Dealing/issue nexus AND deceptive/fraudulent conduct |
| PFUTP-4-2-a, PFUTP-4-2-b, PFUTP-4-2-e | Trading/price conduct alone (each clause is textually about trading/price specifically) |
| PFUTP-4-2-c | Trading/price conduct AND a false-information fact |
| PFUTP-4-2-f, PFUTP-4-2-k | Deceptive/fraudulent conduct AND an investor-communication channel |
| PFUTP-4-2-r | A false-information fact (excluding trading-manipulation conduct counted twice) AND trading/price conduct |

Blocked provisions are never silently dropped: `AnalysisResult.
gateBlockedProvisionResults` surfaces the related factual precedent(s)
under "Provisions not shown as potentially relevant: retrieval prerequisite
not met", with the gate's own plain-language explanation, in both the
on-screen result and both exports — the same never-silently-drop principle
already applied to `contraryOnlyProvisionResults`.

### Known limitation: ICDR and SEBI Act 11(2)(e) not gated

ICDR-160/167/158-CH-V (preferential-allotment compliance requirements —
fully-paid-up, lock-in, genuine-loan exemption) are structurally like
LODR-23-2, not like PFUTP: they are compliance REQUIREMENTS tied to an
allotment already occurring, not broad fraud prohibitions, so gating them
was not needed and none was added. SEBI Act Section 11(2)(e) (SEBI's
general power to prohibit unfair trade practices) was deliberately left
outside this pass's gate — only 1 live link exists, and `buildWhyRelevant`'s
pre-existing fund-movement explanation mechanism remains the operative
safeguard for it (see `tests/reviewer-feedback-fixes.test.ts`). Flagged as
a candidate for a future pass, not treated as a defect of this one.

## Vocabulary and negation fixes

- `fund_transfer_promoter_entity`: removed bare relationship-only phrases
  ("promoter-connected entity", "connected to the promoter", "linked to the
  promoter") that described WHO a counterparty is, not that funds moved to
  them — the same false-positive shape as the P1-10/11 `related_party_
  counterparty` fix.
- `non_disclosure_of_information`: added "undisclosed" (a common phrasing
  the prior synonym list missed entirely); moved "failed to furnish" to
  `non_cooperation_with_investigation` (ambiguous between market-disclosure
  and investigator-cooperation; the CFID stress-test phrasing is the
  latter).
- `sham_preferential_allotment`: added "without paying any/genuine
  consideration" phrasings (natural variants of the already-listed "no
  genuine payment"/"shares without consideration").
- `conceptExtraction.ts`: two new, purely ADDITIVE negation mechanisms —
  `hasListNegationInEffect` (cue phrases like "no allegation of X, Y, Z"
  negate the rest of the sentence, not just the next word) and
  `isWholeSentenceNegated` (a sentence starting with "no"/"none"/"nil"/
  "without" and ending in "is/are/was/were alleged/stated/present/
  involved/suggested" negates every match in it). Both only ever catch a
  negation the prior 3-6-word window missed; neither can suppress a match a
  prior test already relied on.

## Test coverage

- `tests/pfutp-provision-gating.test.ts` (57 tests): positive/near-miss/
  negative scenario for every gated PFUTP/SEBI-Act-12A clause.
- `tests/hundred-scenario-stress-suite.test.ts` (101 tests): the 100-scenario
  suite in the prompt's own ten groups of ten, committed as regression
  fixtures, plus a group-count sanity check.
- `tests/provision-link-audit.test.ts` (5 tests): the new legal-review-queue
  pure function.
- Six pre-existing tests encoded the now-corrected assumption directly
  (that PFUTP/SEBI-Act-12A should surface merely because a matched finding
  also happened to cite them) and were rewritten with reasoning, never
  weakened to force green: `tests/golden-scenario-provisions.test.ts`,
  `tests/narrow-scope-provisions.test.ts`, `tests/reviewer-feedback-fixes.
  test.ts`, `tests/sssl-02-conduct-tagging.test.ts`,
  `tests/factual-overlap-finality-separation.test.ts`,
  `tests/mandatory-scenarios-8-13.test.ts`. Each rewrite documents, inline,
  why the original premise no longer holds and what the corrected
  expectation is reasoned from.

## Follow-up: per-link justifying-tags backfill

The gate is a provision-level, query-time backstop. It does not itself
certify that any of the 498 individual `finding_provisions` links to
PFUTP/SEBI-Act-12A is correctly attributed to that finding's own facts —
that requires per-link legal review against each source order, which this
pass did not attempt at the scale of 871 total live links. A new read-only
admin queue (`/admin/provision-link-audit`, linked from `/admin`) lists
every one of the 64 findings currently carrying an unreviewed
(empty-`justifying_tags`) broad-fraud link, so that review work is visible
and trackable rather than newly invisible now that the gate has made the
underlying imprecision harder to notice from the Scenario Analyzer alone.
