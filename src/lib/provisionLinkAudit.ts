import type { ScenarioFinding } from "@/types/domain";
import { retrievalRuleForProvision } from "@/data/curated/provision-retrieval-rules";

/** P0 provision-precision remediation: a provision-level retrieval gate
 * (provision-retrieval-rules.ts) stops a scenario query from surfacing a
 * candidate it hasn't stated the nexus for, but it is a global, query-time
 * backstop — it does not by itself certify that any individual
 * finding_provisions link to a gated provision is correctly attributed.
 * Originally built for the PFUTP/SEBI-Act-12A family alone (every one of
 * whose 498 live links had an empty justifying_tags array); generalized by
 * the later non-PFUTP remediation pass to every provision family that now
 * carries a retrieval rule (LODR, SEBI Act non-12A, ICDR, Ind AS), since
 * the same "no finding-specific legal review of which facts justify this
 * link" concern applies identically there. Surfaces this as a prioritized,
 * read-only queue rather than leaving it invisible now that the gate has
 * made the underlying imprecision harder to notice from the Scenario
 * Analyzer alone. */
export interface ProvisionLinkAuditEntry {
  recordId: string;
  scenarioTitle: string;
  caseName: string;
  officialSourceUrl: string;
  /** Gated provision ids (any family with a provision-retrieval-rules.ts
   * rule) this finding links with an empty justifyingTags array — i.e.
   * currently treated as universal, pending finding-specific legal review
   * of which of this finding's own facts actually justify each one. */
  unreviewedGatedProvisionIds: string[];
  humanLegalReviewCompleted: boolean;
}

/** Pure function over already-loaded findings (see getScenarioFindings in
 * lib/data.ts for the DB fetch) so it can be unit-tested without a live
 * database connection, consistent with computeVerificationSummary
 * (LawLibraryClient.tsx) and the DATA_QUALITY_FILTERS predicates
 * (LegalReviewQueueClient.tsx). Ordered by how many unreviewed gated links a
 * finding carries, most first, so the highest-impact review work surfaces
 * at the top. */
export function getGatedProvisionLinkAuditQueue(findings: ScenarioFinding[]): ProvisionLinkAuditEntry[] {
  const entries: ProvisionLinkAuditEntry[] = [];
  for (const finding of findings) {
    const unreviewedGatedProvisionIds = finding.provisionLinks
      .filter((link) => link.justifyingTags.length === 0 && retrievalRuleForProvision(link.provisionId) !== undefined)
      .map((link) => link.provisionId);
    if (unreviewedGatedProvisionIds.length === 0) continue;
    entries.push({
      recordId: finding.recordId,
      scenarioTitle: finding.scenarioTitle,
      caseName: finding.caseName,
      officialSourceUrl: finding.officialSourceUrl,
      unreviewedGatedProvisionIds,
      humanLegalReviewCompleted: finding.humanLegalReviewCompleted,
    });
  }
  return entries.sort((a, b) => b.unreviewedGatedProvisionIds.length - a.unreviewedGatedProvisionIds.length);
}
