// Provision text source-provenance labels — the SINGLE shared source of
// truth for how provision_versions.status is described to officers. Both
// Provision Detail (src/app/(app)/provisions/[id]/page.tsx) and Source
// Library (src/app/(app)/library/page.tsx) import from here so the two
// surfaces can never drift into describing the same status differently.
//
// This is about SOURCE PROVENANCE of the provision text on file — was it
// checked against the actual official SEBI/MCA statutory source, merely
// captured from an indexed SEBI order that happened to quote it, or not yet
// verified at all — a distinct axis from any human/legal-review workflow
// status (see ScenarioFinding.humanLegalReviewCompleted, and
// cfidVerification.ts for the sibling "verification basis, not a bare
// boolean" pattern this module follows). Because it is provenance rather
// than review-workflow status, it is fine to surface on ordinary
// officer-facing screens, the same distinction cfidVerification.ts draws.
//
// The rule this module exists to enforce: order_cited_text_only text must
// NEVER be presented as "current statutory text". It is text reproduced
// from an indexed SEBI order that quoted the provision — not an independent
// check against the current official statutory source. An officer who reads
// order-cited text as "the current statutory text, already checked" could
// rely on stale, superseded, or context-specific quoted wording as if it
// were the governing in-force text. officially_verified is the only status
// where the text has actually been checked against the official source.
import type { ProvisionVersion } from "@/types/domain";

export type ProvisionTextProvenanceStatus = ProvisionVersion["status"];

export interface ProvisionTextProvenanceInfo {
  /** Short officer-facing label. Reused verbatim everywhere this status is
   * shown (badges, Source Library's computed summary, tests) so the wording
   * never diverges between surfaces. */
  label: string;
  /** One-sentence explanation of what the label does, and — for
   * order_cited_text_only especially — does NOT, mean. */
  description: string;
  /** Coarse visual tone for badge styling. Not a legal judgment, purely a
   * "how much attention should this draw" signal. */
  tone: "positive" | "caution" | "neutral";
}

export const PROVISION_TEXT_PROVENANCE: Record<ProvisionTextProvenanceStatus, ProvisionTextProvenanceInfo> = {
  officially_verified: {
    label: "Officially verified",
    description: "This text has been checked directly against the official SEBI/MCA statutory source.",
    tone: "positive",
  },
  order_cited_text_only: {
    label: "Order-cited text only",
    description:
      "This text was captured/reproduced from an indexed SEBI order that quoted this provision. It has NOT been independently checked against the official, currently in-force statutory source — do not treat it as verified in-force text, and confirm against the official SEBI/MCA source before relying on it.",
    tone: "caution",
  },
  requires_verification: {
    label: "Requires verification",
    description: "No sufficient official statutory verification is on file for this text yet.",
    tone: "neutral",
  },
};

export function provisionTextProvenance(status: ProvisionTextProvenanceStatus): ProvisionTextProvenanceInfo {
  return PROVISION_TEXT_PROVENANCE[status];
}

/** Live-computed counts for Source Library's summary — deliberately at the
 * provision_versions (per-version) grain, since a single provision can carry
 * more than one recorded version with different statuses (a real case on
 * file: some provisions have both an order_cited_text_only and a separate
 * requires_verification version). provisionsWithNoVersionOnFile is tracked
 * as an explicit separate bucket, computed from the full provision count
 * minus provisions that have ANY provision_versions row — a legal_provisions
 * row with zero versions must never be silently folded into
 * requiresVerificationVersions (it has no version row to carry that status
 * at all) or dropped from the summary entirely. */
export interface ProvisionTextProvenanceCounts {
  officiallyVerifiedVersions: number;
  orderCitedTextOnlyVersions: number;
  requiresVerificationVersions: number;
  totalVersions: number;
  /** legal_provisions rows with zero provision_versions rows on file. */
  provisionsWithNoVersionOnFile: number;
}

export function countProvisionTextProvenance(
  totalProvisionCount: number,
  versionsByProvisionId: Map<string, ProvisionVersion[]>
): ProvisionTextProvenanceCounts {
  let officiallyVerifiedVersions = 0;
  let orderCitedTextOnlyVersions = 0;
  let requiresVerificationVersions = 0;
  let totalVersions = 0;
  for (const versions of versionsByProvisionId.values()) {
    for (const v of versions) {
      totalVersions += 1;
      if (v.status === "officially_verified") officiallyVerifiedVersions += 1;
      else if (v.status === "order_cited_text_only") orderCitedTextOnlyVersions += 1;
      else requiresVerificationVersions += 1;
    }
  }
  // versionsByProvisionId is keyed only by provisions that have at least one
  // version row (see getProvisionVersionsByProvisionId in data.ts), so its
  // key count is exactly "provisions with a version on file".
  const provisionsWithAVersion = versionsByProvisionId.size;
  return {
    officiallyVerifiedVersions,
    orderCitedTextOnlyVersions,
    requiresVerificationVersions,
    totalVersions,
    provisionsWithNoVersionOnFile: Math.max(totalProvisionCount - provisionsWithAVersion, 0),
  };
}
