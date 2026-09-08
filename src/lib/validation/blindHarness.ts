/** P1-16 scaffold for a blind validation harness — SCAFFOLD ONLY. This file
 * defines the shape and scoring machinery for a future blind precision/
 * recall study (a target of 30-50 scenarios, per the audit that requested
 * this); it deliberately does NOT populate BLIND_VALIDATION_SCENARIOS with
 * real data, and nothing in this codebase claims such a study has been run.
 *
 * The whole point of "blind" is that the gold-standard answer (which
 * provisions SHOULD be retrieved) must be written by a CFID officer who
 * reasons independently from the facts and the Law Library — never by
 * running the engine first and recording whatever it returned, and never
 * by the engineer who wrote the matching logic. That is the reason this
 * file ships empty: an engineer populating it would defeat its purpose.
 *
 * How this is meant to be populated (out of scope for this pass):
 *   1. A CFID officer, without running the Scenario Analyzer, drafts a
 *      realistic fact pattern and independently decides which provisions
 *      it should surface (mustAppearProvisionIds) and which specific,
 *      plausibly-confusable provisions it should NOT (mustNotAppearProvisionIds),
 *      recording their own name and the date.
 *   2. Only after every scenario is drafted blind does anyone run
 *      runBlindValidation() against the live engine and compute metrics.
 *   3. Results should be published alongside the scenario set, including
 *      every disagreement — never silently dropped or re-labelled to
 *      improve the score. */
import type { LegalProvision, LegalTest, ScenarioFinding } from "@/types/domain";
import { analyzeScenario } from "@/lib/matching/engine";

export interface BlindValidationScenario {
  /** Short, human-assigned id, e.g. "BV-01" — never derived from what the
   * engine returns. */
  id: string;
  freeText: string;
  /** Provision ids a reasoning-first (not engine-first) reviewer expects
   * to appear among result.provisionResults. */
  mustAppearProvisionIds: string[];
  /** Provision ids the reviewer specifically expects NOT to appear —
   * chosen because they are plausibly confusable with the scenario's
   * actual topic (a bare must-not-appear list of everything unrelated in
   * the corpus is not useful; this should name genuine near-misses). */
  mustNotAppearProvisionIds: string[];
  /** Who drafted this scenario's gold answer, and when — required so a
   * reviewer's own track record and any conflict of interest (e.g. the
   * same person who tuned the matching engine) can be checked later. */
  reviewedBy: string;
  reviewedOn: string; // ISO date
  /** Brief statement of the reviewer's own reasoning for the expected
   * answer — required so a disagreement can be examined on the merits,
   * not just as a pass/fail count. */
  rationale: string;
}

/** Deliberately empty. See the module-level comment for why populating
 * this is out of scope for an engineer to do unilaterally, and what a
 * real population pass requires. Do not add entries here without an
 * actual blind-reviewing CFID officer's independently-reasoned answer. */
export const BLIND_VALIDATION_SCENARIOS: BlindValidationScenario[] = [];

export interface BlindValidationResult {
  scenarioId: string;
  truePositives: string[]; // mustAppear ids that were actually returned
  falseNegatives: string[]; // mustAppear ids that were NOT returned
  falsePositives: string[]; // mustNotAppear ids that WERE returned
  precision: number | null; // null when the scenario returned nothing to divide by
  recall: number | null; // null when mustAppearProvisionIds is empty
}

export interface BlindValidationSummary {
  scenarioCount: number;
  results: BlindValidationResult[];
  /** Micro-averaged precision/recall across all scenarios combined (sums
   * true/false positives and false negatives across scenarios before
   * dividing) — the standard choice when scenarios may name different
   * numbers of expected provisions, so a scenario with more expected
   * provisions is not silently under-weighted relative to one with few. */
  microPrecision: number | null;
  microRecall: number | null;
  microF1: number | null;
}

function scoreOneScenario(
  scenario: BlindValidationScenario,
  scenarioFindings: ScenarioFinding[],
  provisions: LegalProvision[],
  legalTests: LegalTest[]
): BlindValidationResult {
  const result = analyzeScenario({ freeText: scenario.freeText }, scenarioFindings, provisions, legalTests);
  const returnedIds = new Set(result.provisionResults.map((pr) => pr.provision.id));

  const truePositives = scenario.mustAppearProvisionIds.filter((id) => returnedIds.has(id));
  const falseNegatives = scenario.mustAppearProvisionIds.filter((id) => !returnedIds.has(id));
  const falsePositives = scenario.mustNotAppearProvisionIds.filter((id) => returnedIds.has(id));

  const precisionDenominator = truePositives.length + falsePositives.length;
  const precision = precisionDenominator > 0 ? truePositives.length / precisionDenominator : null;
  const recall = scenario.mustAppearProvisionIds.length > 0 ? truePositives.length / scenario.mustAppearProvisionIds.length : null;

  return { scenarioId: scenario.id, truePositives, falseNegatives, falsePositives, precision, recall };
}

/** Runs every scenario in `scenarios` against the live matching engine and
 * computes per-scenario and micro-averaged precision/recall. Callers pass
 * the scenario/provision/legal-test corpus explicitly (rather than this
 * module reaching into the database itself) so it can be run against
 * either the live corpus or a fixture set. Returns a summary with
 * scenarioCount: 0 and null metrics when given an empty scenario list —
 * this must never be mistaken for "0 errors found"; it means no blind
 * study has been populated yet. */
export function runBlindValidation(
  scenarios: BlindValidationScenario[],
  scenarioFindings: ScenarioFinding[],
  provisions: LegalProvision[],
  legalTests: LegalTest[]
): BlindValidationSummary {
  const results = scenarios.map((s) => scoreOneScenario(s, scenarioFindings, provisions, legalTests));

  let tp = 0;
  let fp = 0;
  let fn = 0;
  for (const r of results) {
    tp += r.truePositives.length;
    fp += r.falsePositives.length;
    fn += r.falseNegatives.length;
  }
  const microPrecision = tp + fp > 0 ? tp / (tp + fp) : null;
  const microRecall = tp + fn > 0 ? tp / (tp + fn) : null;
  const microF1 =
    microPrecision !== null && microRecall !== null && microPrecision + microRecall > 0
      ? (2 * microPrecision * microRecall) / (microPrecision + microRecall)
      : null;

  return { scenarioCount: scenarios.length, results, microPrecision, microRecall, microF1 };
}
