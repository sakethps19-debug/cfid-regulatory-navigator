# Blind validation harness (P1-16) — scaffold only

## Status: not populated, no study has been run

`src/lib/validation/blindHarness.ts` defines the types and scoring logic
for a future blind precision/recall study of the Scenario Analyzer, at a
target size of 30-50 scenarios. `BLIND_VALIDATION_SCENARIOS` in that file
is currently an empty array. No claim anywhere in this codebase, this
report, or the application itself states that such a study has been
conducted. This document exists so the *next* pass — or a human CFID
reviewer — has a ready structure to populate, not to imply the work is
already done.

## Why this is a scaffold, not a populated dataset

A validation study is only meaningful if the expected answer for each
scenario is written *blind*: a reviewer reasons from the facts and the Law
Library independently, before ever running the tool, and records what they
independently expect. If the engineer who built or tuned the matching
engine writes the "expected" answers — or if the answers are captured by
running the engine first and recording whatever it returned — the study
proves nothing except that the code agrees with itself. That is exactly the
trap the rest of this audit pass has been working to avoid elsewhere (see
`docs/mandatory-scenario-audit.md`'s own note on reasoning from curated
data, not from current output), and it applies with even more force here,
since this harness's whole purpose is an independent check.

## How to actually populate this (future work)

1. A CFID officer (or someone playing that role, without access to this
   codebase's internals) drafts 30-50 realistic fact patterns, spanning:
   - Clear positive cases (should retrieve specific, named provisions).
   - Adversarial/near-miss cases (superficially similar wording that
     should NOT retrieve a plausible-looking but wrong provision — e.g.
     the vendor/related-party and generic-director distinctions already
     guarded in `tests/false-positive-vocabulary.test.ts`, but as blind,
     independently-authored scenarios, not reused from that file).
   - Cases spanning multiple regulatory instruments, not just PFUTP/SEBI
     Act (see the Law Library verification-concentration note in
     `docs/mandatory-scenario-audit.md`'s addendum, and the P1-13
     overclaim-prevention work in `LawLibraryClient.tsx`).
2. For each scenario, the reviewer records (per the `BlindValidationScenario`
   shape): `mustAppearProvisionIds`, `mustNotAppearProvisionIds` (named,
   plausibly-confusable near-misses — not an exhaustive list of every
   unrelated provision in the corpus), their own name, the date, and a
   one-line rationale for each expected answer.
3. Only after every scenario is drafted does anyone call
   `runBlindValidation(BLIND_VALIDATION_SCENARIOS, scenarioFindings,
   provisions, legalTests)` against the live corpus (via `getScenarioFindings()`
   /`getProvisions()`/`getLegalTests()` in `src/lib/data.ts`) and compute
   `microPrecision`/`microRecall`/`microF1`.
4. Every scenario's `falsePositives`/`falseNegatives` should be published
   alongside the aggregate metrics, and every disagreement between the
   engine and the reviewer's blind answer should be individually reviewed —
   for either a genuine engine defect or a reviewer misunderstanding of the
   deterministic, keyword-based matching model. Neither the scenario set
   nor the reviewer's answers should be adjusted after seeing the engine's
   output; a disagreement is a finding to investigate and report, not a
   test to make pass.

## What this scaffold intentionally does not do

- It does not connect to the live database itself — `runBlindValidation`
  takes the scenario/provision/legal-test corpus as plain arguments, so it
  can be run against either the live corpus or a fixture set, and stays a
  pure function with no side effects.
- It does not compute a per-scenario mean of precision/recall; it
  micro-averages (sums true/false positives and false negatives across all
  scenarios before dividing), so a scenario naming more expected provisions
  is not silently under-weighted relative to one naming few. See
  `tests/blind-validation-harness.test.ts` for a worked example of why this
  differs from a naive mean.
- It does not score precedent-record retrieval, only provision-id
  retrieval, since the golden-scenario work in `tests/golden-scenario-
  provisions.test.ts` established that provision-level assertions are the
  layer the existing 13-scenario matrix was missing; a future pass could
  extend `BlindValidationScenario` with expected precedent record ids too.
