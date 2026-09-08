# P0 provision-precision remediation v2

Starting SHA: `82e85f716a9061f4f474ea6e0fd0ae9675bab59a` (`P0 provision-precision remediation: gate PFUTP/SEBI Act 12A on securities nexus`).

This is the second-order follow-up to that commit. The first pass introduced
a provision-level retrieval gate for PFUTP/SEBI Act 12A requiring a
securities-dealing/issue fact connected to fraudulent-or-deceptive conduct,
and validated it against a 100-scenario synthetic stress suite. Passing that
suite did not, on its own, establish that every gate was legally precise:
the gate's own concept tags could still collapse legally distinct predicates
into one signal, and a "requireAllOfGroups" bag-of-tags check could be
satisfied by two facts that were never actually connected in the entered
scenario. This document records what was independently found and fixed in
this second pass, and what remains a disclosed limitation.

## 1. Defects found independently

1. **`price_manipulation_nexus` was over-broad.** One concept tag was being
   used to satisfy PFUTP 4(2)(a) (false appearance of trading), 4(2)(b)
   (artificial price dealing) and 4(2)(e) (price manipulation) alike, even
   though these are textually distinct predicates. A scenario stating only
   "no genuine change in beneficial ownership" (a 4(2)(b) fact) would
   previously have also satisfied 4(2)(e)'s manipulation-specific
   requirement.
2. **Topic co-occurrence was being read as legal nexus.** The first-pass
   gate required a concept from a "dealing/issue" group AND a concept from
   a "fraud conduct" group to be present ANYWHERE in the scenario text, with
   no requirement that the two facts be connected. A scenario stating an
   undisclosed RPT in one sentence and an unrelated, genuine share-price
   rise in a completely separate sentence would previously have satisfied
   both groups and surfaced PFUTP/12A — even though nothing in the scenario
   ties the two together.
3. **A provision's own per-link disposition was never consulted.**
   `finding_provisions.relationship` is curated per-provision-per-finding
   data (from an earlier pass) recording whether a specific linked provision
   was itself "alleged" (cited, not the basis of the disposition),
   "not_upheld" (decided negatively), or "upheld" within a bundled, multi-
   provision finding. The matching engine never read this field: it derived
   every linked provision's supporting/contrary/upheld classification
   purely from the finding's own overall `findingStatus`. A finding that is
   "Partly Confirmed in Final Order" overall (because its LODR disclosure
   provision was confirmed) was therefore shown as a positive supporting
   precedent for its bundled PFUTP/12A provisions too, even where the
   `relationship` field (and the order's own text) recorded those specific
   charges as alleged-only or expressly not established. Found via the
   live-corpus integration trace (section 9 below): FRL-01 (Future Retail
   Limited) surfaced as a supporting precedent for PFUTP-4-1/3(b)/3(c)/3(d)/
   SEBI Act 12A(a)/(b)/(c) on a trading-manipulation query, despite the
   final order's own text holding "Fraud under Section 12A SEBI Act and
   Regulations 3(b),(c),(d),4(1),4(2)(f) PFUTP Regulations: not established
   ... no deliberate concealment or misleading intent found" and imposing no
   PFUTP/fraud penalty on any noticee.
4. **A single-catalogued-version provision was presented without a temporal
   caveat.** Every provision in this corpus has exactly one recorded
   version, `officially_verified`, with no predecessor. The engine
   previously presented this as simply "the applicable version" with no
   signal that older conduct in the corpus (pre-dating that version's
   effective date) has not had its then-applicable wording independently
   verified.

## 2. `price_manipulation_nexus` split

Removed entirely; replaced with four concept tags (`src/data/curated/concept-tags.ts`), each tracking one statutory predicate:

| New tag | Statutory predicate | Example synonyms |
|---|---|---|
| `false_appearance_of_trading` | PFUTP 4(2)(a): knowingly creating a false/misleading appearance of trading | synchronized trading, wash trades, matched trades |
| `non_genuine_dealing_or_ownership` | PFUTP 4(2)(b): dealing involving no genuine change in beneficial ownership | no genuine change in beneficial ownership |
| `actual_price_manipulation` | PFUTP 4(2)(e): an act/omission amounting to manipulation of the security's price | price manipulation, artificial price rise, manipulation of the security price |
| `investor_inducement_to_trade` | PFUTP 4(2)(r)/(k)'s inducement qualifier | induced investors to trade, inducing trades |

"False appearance of financial health" was deliberately dropped rather than
remapped: it described a financial-statement effect, not a trading fact, and
had no legitimate home among the split tags.

## 3. New concept groups and the connectivity requirement

`src/data/curated/provision-retrieval-rules.ts` (fully rewritten) composes
five reusable groups from the existing curated vocabulary:

- `SECURITIES_DEALING_OR_ISSUE_NEXUS` — an issue/allotment event or actual
  trading conduct occurred.
- `FALSE_INFORMATION_CONTENT` — false, fictitious or misrepresented content.
- `TRADING_CONDUCT_ANY` — any of the three trading/price-conduct predicates.
- `FRAUDULENT_OR_DECEPTIVE_CONDUCT` — the union of the above two; governance/
  disclosure lapses (RPT non-disclosure, Audit Committee/Compliance Officer
  deficiencies) are deliberately excluded, since those are gated by their
  own home instrument, never by PFUTP/SEBI Act 12A.
- `INVESTOR_COMMUNICATION_CHANNEL` — the channel through which information
  reaches investors/the market (financial statements, annual report,
  corporate announcement, etc.).

`passesRetrievalGate` requires, for a rule with 2+ groups, that at least one
matching concept per group be **connected**: the same sentence in the
entered free text, or a dropdown signal (`DetectedConcept.sentenceIndices`
is `[]` for a dropdown-derived concept — a deliberate, explicit officer
assertion about the scenario as a whole, treated as compatible with any
sentence). This directly targets defect #2: two facts merely co-occurring
anywhere in a long scenario no longer satisfy a two-group gate.

A deliberate consequence of this design, confirmed correct through the
blind suite: a single **self-contained** trading-conduct fact (e.g.
synchronized trading, or a sham allotment) sits in both
`SECURITIES_DEALING_OR_ISSUE_NEXUS`/`TRADING_CONDUCT_ANY` and
`FRAUDULENT_OR_DECEPTIVE_CONDUCT` simultaneously, so it can satisfy both
groups of a two-group gate on its own — trivially "connected to itself".
This is not a loophole: trading manipulation intrinsically fuses a dealing
act and the fraudulent act into one fact, so requiring it to also connect to
some second, unrelated group member would be legally wrong.

## 4. Clause-by-clause PFUTP / SEBI Act 12A gate matrix

| Clause | Minimum prerequisite (gate, not legal test) | Groups |
|---|---|---|
| PFUTP 3(a)-(d), 4(1) | Securities transaction connected to fraudulent/deceptive conduct | `SECURITIES_DEALING_OR_ISSUE_NEXUS` + `FRAUDULENT_OR_DECEPTIVE_CONDUCT` |
| PFUTP 4(2)(a) | False/misleading appearance of trading specifically | `["false_appearance_of_trading"]` (single group) |
| PFUTP 4(2)(b) | Any trading/dealing act connected to artificial-price/false-appearance/non-genuine-ownership | `TRADING_CONDUCT_ANY` (single group; the trading fact itself is the required predicate) |
| PFUTP 4(2)(c) | Trading/dealing act connected to a false-information fact | `TRADING_CONDUCT_ANY` + `FALSE_INFORMATION_CONTENT` |
| PFUTP 4(2)(e) | Actual/alleged price-manipulation effect specifically | `["actual_price_manipulation"]` (single group) |
| PFUTP 4(2)(f) | False/fictitious content connected to a communication-channel fact | `FALSE_INFORMATION_CONTENT` + `INVESTOR_COMMUNICATION_CHANNEL` |
| PFUTP 4(2)(k) | False/fictitious content connected to a channel OR an explicit inducement fact | `FALSE_INFORMATION_CONTENT` + (`INVESTOR_COMMUNICATION_CHANNEL` ∪ `investor_inducement_to_trade`) |
| PFUTP 4(2)(r) | False/fictitious content connected to an explicit trading-inducement fact | `FALSE_INFORMATION_CONTENT` + `["investor_inducement_to_trade"]` |
| SEBI Act 12A(a) | Mirrors PFUTP 3(b) | same as 3(b) |
| SEBI Act 12A(b) | Mirrors PFUTP 3(c) | same as 3(c) |
| SEBI Act 12A(c) | Mirrors PFUTP 3(d) | same as 3(d) |

`PFUTP-4-2-c` was newly added to the rule set and to the blind suite's
provision universe in this pass (it existed as a live provision but had no
retrieval rule and no test coverage before).

Per-clause guidance followed in this pass, per the original prompt:
- 4(2)(a)/(b)/(e) are never conflated: each gates on its own narrower
  predicate (false appearance of trading; any trading act plus an
  artificial-price/appearance/ownership fact; actual price-manipulation
  specifically), not a shared broad tag.
- 4(2)(f) requires the false content to have reached a communication
  channel; an internal, unpublished misstatement or an accounting error
  alone does not satisfy it (see blind scenario #33: unpublished internal
  fictitious accounting correctly stays gated out of 4(2)(f)/(k)).
- Statutory wording for every clause above was taken from the existing
  curated provision text on file (`legal_provisions`/`provision_versions`);
  no clause wording was independently re-verified against a new official
  source in this pass beyond what the prior pass already recorded — see
  section 6 for the resulting temporal/version caveat this implies.

## 5. Hard invariant: connection is represented, not inferred from co-presence

The examples given as explicit non-nexus in the originating instructions are
all now correctly excluded by the connectivity requirement, and are locked
in as blind-suite scenarios:

- `rights_issue` + `financial_statement_misstatement` in unconnected
  sentences ≠ PFUTP 3(b)/(c)/(d) (scenario #20 vs #21).
- `preferential_allotment` + an unrelated false-accounting fact ≠ an issue-
  connected deceptive scheme unless stated in the same sentence (scenario
  #15 vs the RPT-only scenarios #1-#14).
- A listed company plus an unrelated fraud fact elsewhere in the order ≠
  securities-market fraud (scenario #123's residual limitation, see section
  15, is the one case where this invariant is not fully enforced at the
  provision-scoping level).
- Published financial statements plus a bona fide accounting error ≠ PFUTP
  (scenario #31).
- A price increase after disclosure, with no stated artificiality, ≠ proof
  of manipulation (scenario #109, `PFUTP-4-2-e` explicitly excluded).

## 6. Temporal versioning

Every provision in this corpus has exactly one catalogued version, status
`officially_verified`, with no recorded predecessor. `buildApplicableVersionNote`
(engine.ts) now appends, for every provision in this state: "This is the
only version of this provision currently catalogued; if the conduct being
examined predates [effective date], the wording in force at that time has
not been independently verified and should not be assumed identical." No
historical version was fabricated or backfilled in this pass — the corpus
genuinely has no verified predecessor text for any provision, so exposing
the uncertainty (rather than presenting the current text as temporally
universal) was the only honest option available without new legal research
into pre-amendment wording, which is out of scope for this deterministic
pass.

## 7. Per-link relationship now honored (supporting precedent must mean supporting)

`PrecedentRef.effectiveStatus` (new field, `src/lib/matching/types.ts`) and
`effectiveLinkStatus()` (`src/lib/matching/engine.ts`) resolve, per
finding-provision link, the status that link should be treated as carrying:

- `relationship: "not_upheld"` → treated as `"Not Confirmed in Final Order"`
  for this provision regardless of the finding's overall status (excluded
  from supporting/upheld; eligible for contrary).
- `relationship: "alleged"` → treated as `"Alleged"` for this provision
  (still shown as a weak, "Contextual / unresolved" supporting signal —
  consistent with how a bare-Alleged finding is already treated elsewhere —
  but never "Final merits support" and never counted in `upheldPrecedents`).
- `relationship: "upheld"`, or no relationship curated at all → unchanged,
  uses the finding's own overall `findingStatus` (the default, majority
  case; no regression for links without this curation).

This is a downgrade-only mechanism: a link can never be shown as MORE
positive than the finding's own overall status, only as accurately
less positive when the finding's own curated data says so for that specific
provision. The UI (`ScenarioAnalyzerClient.tsx`) now shows this
provision-specific status on supporting/contrary precedent cards (badge,
support category, and CSV/plain-text export), with a note when it diverges
from the finding's overall status.

Two live corrections were made as a direct result (see section 10):
FRL-01's remaining PFUTP/SEBI Act 12A links (previously `alleged`) were
corrected to `not_upheld`, and DBRL-01's PFUTP/SEBI Act 12A links likewise —
both fully justified by their own final orders' express holdings, both
logged to `data_change_log`.

## 8. Polarity on the new concepts

The four split tags participate in the same negation-aware `detectConcepts`
pipeline as every other tag — no separate polarity mechanism was needed.
Blind-suite scenarios exercise "it is unclear whether...", explicit
disclaimers ("no evidence establishes that the price rise was itself
artificial"), and rejected allegations ("the allegation of fictitious sales
... was expressly rejected") to confirm unknown/negated facts are never
read as positive (scenarios #24, #36, #109, #113, #115, #116, #124).

## 9. Blind validation suite v2

`tests/blind-validation-suite-v2.test.ts` — 124 independently-authored
scenarios (not a paraphrase of the prior 100-scenario suite), organized in
the ten prescribed groups (RPT/corporate; fund diversion; financial
statements; trading manipulation; announcements/information; preferential
allotment/issue; IPO/rights/issue proceeds; investigation/governance/
auditor; adversarial mixed, #107-124). Each scenario carries an explicit
MUST/MUST-NOT expectation (`must`/`mustNot`/`mustNotFraudFamily`/
`mustIncludeFraudFamily`) plus a `note` explaining the legal reasoning, not
a bare pass/fail. All 124 pass against the synthetic `ALL_FINDINGS`/
`ALL_PROVISIONS` fixtures built for that file.

## 10. Live-corpus integration trace

Since `getScenarioFindings()`/`getProvisions()` are SSR-only (cookie-based
Supabase client) and cannot run standalone, 25 of the 124 blind scenarios
(spanning every group, weighted toward the adversarial-mixed group) were
traced end-to-end against the REAL production corpus (91 `scenario_findings`,
99 `legal_provisions`, fetched live via SQL and converted to the app's
shapes with the same label maps as `src/lib/data.ts`) using a standalone
script: `detectConcepts()` → `analyzeScenario()` → per-provision gate
outcome → final candidate → supporting/contrary precedent. All 25/25
matched their MUST/MUST-NOT expectation exactly (0 false positives, 0 false
negatives) both before and after the relationship-classification fix in
section 7 (that fix changes precedent classification, not gate pass/fail,
so the MUST/MUST-NOT outcomes are identical; the observable change is that
FRL-01 no longer appears as any kind of supporting precedent for
PFUTP-4-1). This traced FRL-01's incorrect supporting-precedent
classification (section 1, defect #3) — a defect the synthetic blind suite
alone could not have found, since it only exists in the real corpus's own
curated `relationship` data.

The trace script itself was a temporary, uncommitted file (per this
project's scratch-file hygiene) and is not part of the repository; its
output is preserved in this session's transcript.

## 11. Historical PFUTP/12A link review (priority subset)

The ~498 live PFUTP/SEBI Act 12A `finding_provisions` links were **not**
mass-reviewed or mass-assigned `justifying_tags` in this pass. Instead, the
30 distinct findings actually surfaced as PFUTP/12A supporting precedents
across the 25-scenario live trace were prioritized, and each finding's
source order text (`factual_pattern`, `qualification`,
`ingredients_not_established`, paragraph references, `official_source_url`)
was read to classify its PFUTP/12A family:

| Record | Classification | Basis |
|---|---|---|
| FRL-01 | **not-established** (corrected this pass) | Final order paras 196-199: fraud/PFUTP charge not made out; no penalty imposed |
| DBRL-01 | **not-established** (corrected this pass) | Final order paras 17-21: fraud charge "not tenable" on the evidence presented |
| CGPOWER-01 | established (company-wide); not-established as to Noticee 8 (MD/CEO) specifically | Final order paras 49.1-49.9 — noticee-specific, not a link-wide correction |
| RICOH-01 | partly-established: established for the core fictitious-sales scheme; not-established for the auditor-collusion charge against Noticees 7-8 specifically | Final order paras 287-295 |
| ARCOTECH-01 | partly-established: established against Arcotech/Pattanayak/Sidhant; Noticee 9 exonerated on documented resignation timing | Order paras 267-269 |
| FEEL-01 | established; Noticee 5 (Company Secretary) exonerated on the one MSPL-approval allegation specifically (documented maternity leave) | Final order para 68 |
| BGL-PREF-02 | partly-established: 18/22 allottees confirmed; Shankar Sharma not-established (proved full payment); two minors' shares transferred without a merits finding | Confirmatory order paras 27-34, 51-55 |
| ASERL-WOAL-01, MFL-01 | alleged-only | Interim order/SCN stage; no confirmatory or final order on file yet |
| LSIL-01, BGDL-01, GENSOL-01 | interim-unresolved | `confirmed_at_interim`; confirmatory order sustained interim findings but investigation/final disposition remains open |
| SSSL-01/02/04/05, KWALITY-01, DAIL-01, OMAXE-01, BDMCL-01, SICL-01, SANWARIA-01, SETUB-01, ROHL-01, ONECAL-01, LEEL-01, VCL-01, SHARON-01, SKT-01, BGL-PREF-01 | established | Final/confirmatory order confirms the PFUTP/12A charge; see each record's `finalParagraphReferences`/`officialSourceUrl` for the specific citation (already on file in `scenario_findings`) |

This is a priority subset, not a completed review of all 498 links; the
remainder (links never surfaced by this pass's blind suite or live trace)
remain unreviewed and are not claimed as source-verified. "72% curated"
(from an earlier pass) is not treated as equivalent to this kind of
paragraph-level legal source verification.

## 12. Noticee-specific liability

No liability engine was built (explicitly out of scope). Confirmed:
`noticeeActors` is surfaced only as a flat, informational list (see
`PrecedentCompareClient.tsx`) alongside other case-context fields, never
attributed per-provision or presented as a liability determination. Several
of the findings reviewed in section 11 (CGPOWER-01, RICOH-01, ARCOTECH-01,
FEEL-01, BGL-PREF-02) already carry noticee-specific exoneration nuance in
their curated `qualification`/`ingredientsNotEstablished` free text, which
the UI displays verbatim per precedent — the existing architecture already
avoids implying that because a company violated a provision, every named
officer automatically did; this pass found no case where the app asserted
otherwise.

## 13. What was deliberately NOT done

- No LLM was introduced; every fix in this pass is deterministic substring/
  connectivity/status-lookup logic.
- No sophisticated temporal scoring was built — only an honest caveat.
- No mass `justifying_tags` assignment across the 498 PFUTP/12A links.
- No liability engine.
- No provision, tag, or gate was changed outside the PFUTP/SEBI Act 12A
  family and the two live-data corrections in section 11.

## 14. Known residual limitation

Blind scenario #123 (adversarial-mixed group) documents a residual,
disclosed limitation: the provision-level gate is satisfied once ANY
dealing/issue-flavoured tag and ANY fraud-conduct tag pass their
connectivity check somewhere in a scenario's matched findings, but the
gate operates at the FINDING level for scoring purposes, not at the level
of "this exact clause's predicate must derive from the same underlying
episode as the other". A genuinely clean issue-proceeds fact and a wholly
separate, self-contained fictitious-sales fact elsewhere in the same
scenario can each independently satisfy the general gate on their own
terms once matched to findings, without the two needing to relate to each
other. This is narrower than the pre-remediation defect (which required no
connectivity at all) but is not a complete fix of connectivity scoped to
"the same underlying episode" — see the scenario's own `note` field for the
full reasoning. Recommended for a future pass, not fixed here to avoid
over-engineering a fix without a clear minimal design.
