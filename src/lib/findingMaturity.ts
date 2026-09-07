import type { ScenarioFinding } from "@/types/domain";
import { isSearchableFinding } from "@/lib/publicationLifecycle";

/** How mature/verified a finding's underlying curated record is — a
 * question entirely separate from findingStatus (what the order decided)
 * or matchStrengthLabel (how factually similar it is to the entered
 * scenario). A searchable finding whose provision mapping is unverified
 * must never look identical to a fully field-verified, human-reviewed
 * one; this is the single shared classification both the analyzer's
 * precedent cards/exports and the Legal Review Queue use, so the two can
 * never present a different maturity picture for the same finding.
 *
 * Live corpus at time of writing (91 searchable findings): 66 fully
 * field-verified (review pending), 14 fully field-verified except
 * provision mapping, 11 fully unverified, 0 human-reviewed, 0 Draft/
 * Quarantined — see docs/finding-maturity-model.md. */
export type FindingMaturityTier =
  | "Draft / Quarantined"
  | "Unverified candidate material"
  | "Partially verified"
  | "Source-verified, provision-mapping pending"
  | "Field-verified, human review pending"
  | "Human reviewed";

const VERIFICATION_FIELDS = [
  "sourceDocumentVerified",
  "paragraphCitationVerified",
  "findingStatusVerified",
  "provisionMappingVerified",
  "noticeeMappingVerified",
] as const;

export function findingMaturityTier(finding: ScenarioFinding): FindingMaturityTier {
  if (!isSearchableFinding(finding)) return "Draft / Quarantined";
  if (finding.humanLegalReviewCompleted) return "Human reviewed";

  const flags = VERIFICATION_FIELDS.map((f) => finding[f]);
  const allVerified = flags.every(Boolean);
  const noneVerified = flags.every((v) => !v);

  if (allVerified) return "Field-verified, human review pending";
  if (noneVerified) return "Unverified candidate material";
  if (
    finding.sourceDocumentVerified &&
    finding.paragraphCitationVerified &&
    finding.findingStatusVerified &&
    !finding.provisionMappingVerified &&
    finding.noticeeMappingVerified
  ) {
    return "Source-verified, provision-mapping pending";
  }
  return "Partially verified";
}

/** One-line explanation for each tier, safe to show as a tooltip/caption
 * next to the badge — states plainly what has and has not been checked,
 * never implying more certainty than the tier itself supports. */
export const FINDING_MATURITY_EXPLANATION: Record<FindingMaturityTier, string> = {
  "Draft / Quarantined": "Excluded from normal Scenario Analyzer retrieval; not shown as a precedent.",
  "Unverified candidate material":
    "None of source document, paragraph citation, finding status, provision mapping or noticee mapping has been independently verified yet.",
  "Partially verified": "One or more of source document, paragraph citation, finding status, provision mapping or noticee mapping remains unverified.",
  "Source-verified, provision-mapping pending":
    "Source document, paragraph citation, finding status and noticee mapping are verified; the provision mapping specifically has not been.",
  "Field-verified, human review pending":
    "All recorded verification fields (source document, paragraph citation, finding status, provision mapping, noticee mapping) are verified, but no CFID officer has yet completed a full human legal review of this finding.",
  "Human reviewed": "A CFID officer has completed human legal review of this finding.",
};
