import type { ConfidenceLevel } from "@/lib/matching/types";

/** User-facing labels for the engine's internal ConfidenceLevel score.
 * "High/Medium/Low confidence" reads, to a busy officer skimming results,
 * as if it were assessing the likelihood a violation occurred - it is not:
 * it is purely a measure of how many independent factual categories
 * (transaction type, actor role, conduct, evidence) overlap between the
 * entered facts and the strongest matching precedent, and whether that
 * precedent is itself a final-order finding. Renamed here to "factual
 * overlap" so the label itself carries that distinction, rather than
 * relying on a reader to find and remember a footnote elsewhere. The
 * underlying ConfidenceLevel type/scoring is unchanged - this is a display
 * mapping only, same pattern as findingStatusDisplay.ts for FindingStatus. */
const MATCH_STRENGTH_LABEL: Record<ConfidenceLevel, string> = {
  High: "Strong factual overlap",
  Medium: "Moderate factual overlap",
  Low: "Limited factual overlap",
};

export function matchStrengthLabel(level: ConfidenceLevel): string {
  return MATCH_STRENGTH_LABEL[level];
}

/** Shown once, near the first badge an officer encounters, so the
 * distinction is visible in context rather than requiring a trip to
 * Methodology. Deliberately lowercase-leading so it reads naturally both
 * as a sentence continuation ("...below measures factual overlap...") and
 * inside a parenthetical - callers needing a capitalized, standalone
 * sentence should capitalize it themselves. */
export const MATCH_STRENGTH_EXPLAINER =
  "measures factual overlap with indexed precedents, not the likelihood that a violation occurred.";
