import type { ScenarioFinding } from "@/types/domain";

// Same negative-outcome classification the matching engine uses for
// contrary-precedent detection (see NEGATIVE_STATUSES in
// lib/matching/engine.ts) — kept as an independent constant here since this
// is a display concern (which findings get shown as an interim→final
// reversal), not a scoring concern, but the two sets must be read as
// describing the same thing and kept in sync if a new negative status is
// ever added.
const FINAL_NEGATIVE_STATUSES = new Set<ScenarioFinding["findingStatus"]>(["Not Confirmed in Final Order", "Withdrawn"]);

// interimParagraphReferences is occasionally a non-null explanatory note
// rather than an actual citation — curators use this recurring phrasing
// (e.g. "Not applicable — the interim order itself is not in this
// register") specifically to record that no interim-stage text exists to
// compare against, distinct from leaving the field genuinely empty. A
// reversal display must treat these the same as null, or it ends up
// showing a fabricated-looking "at interim" panel with nothing real in it.
const NO_INTERIM_TEXT_ON_FILE = /not applicable|not (?:itself )?in this register/i;

function hasComparableInterimText(f: ScenarioFinding): boolean {
  return !!f.interimParagraphReferences && !NO_INTERIM_TEXT_ON_FILE.test(f.interimParagraphReferences);
}

/** A finding counts as an interim→final reversal only when it was actually
 * raised at the interim stage (a real interim paragraph citation is on
 * file, not just a note that no interim order exists in this register) AND
 * actually disposed of at a final stage (finalParagraphReferences on file)
 * AND that disposition was negative. A negative final status with nothing
 * comparable on file for the interim stage (e.g. an allegation raised for
 * the first time in a final order) is not a reversal — there is nothing on
 * file to compare it against. */
export function isInterimFinalReversal(f: ScenarioFinding): boolean {
  return FINAL_NEGATIVE_STATUSES.has(f.findingStatus) && hasComparableInterimText(f) && !!f.finalParagraphReferences;
}

export function interimFinalReversals(findings: ScenarioFinding[]): ScenarioFinding[] {
  return findings.filter(isInterimFinalReversal);
}
