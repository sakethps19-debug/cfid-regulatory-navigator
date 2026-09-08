import type { ScenarioFinding } from "@/types/domain";
import { retrievalRuleForProvision } from "@/data/curated/provision-retrieval-rules";

/** P0 provision-precision remediation: the provision-level retrieval gate
 * (provision-retrieval-rules.ts) stops a scenario query from surfacing
 * PFUTP/SEBI-Act-12A candidates it hasn't stated the nexus for, but it is a
 * global, query-time backstop — it does not by itself certify that any
 * individual finding_provisions link to one of those provisions is
 * correctly attributed. Every one of the 498 live PFUTP/SEBI-Act-12A links
 * has an empty justifying_tags array (re-queried live before this pass;
 * see docs/provision-gating-remediation.md), meaning none of them has yet
 * had the specific, finding-level legal review the audit prompt calls for
 * ("Which specific facts in this historical finding made THIS provision
 * relevant?"). This surfaces that as a prioritized, read-only queue rather
 * than leaving it invisible now that the gate has made the underlying
 * imprecision harder to notice from the Scenario Analyzer alone. */
export interface ProvisionLinkAuditEntry {
  recordId: string;
  scenarioTitle: string;
  caseName: string;
  officialSourceUrl: string;
  /** Broad-fraud-family provision ids (PFUTP / SEBI Act 12A) this finding
   * links with an empty justifyingTags array — i.e. currently treated as
   * universal, pending finding-specific legal review of which of this
   * finding's own facts actually justify each one. */
  unreviewedBroadFraudProvisionIds: string[];
  humanLegalReviewCompleted: boolean;
}

/** Pure function over already-loaded findings (see getScenarioFindings in
 * lib/data.ts for the DB fetch) so it can be unit-tested without a live
 * database connection, consistent with computeVerificationSummary
 * (LawLibraryClient.tsx) and the DATA_QUALITY_FILTERS predicates
 * (LegalReviewQueueClient.tsx). Ordered by how many unreviewed broad-fraud
 * links a finding carries, most first, so the highest-impact review work
 * surfaces at the top. */
export function getBroadFraudProvisionLinkAuditQueue(findings: ScenarioFinding[]): ProvisionLinkAuditEntry[] {
  const entries: ProvisionLinkAuditEntry[] = [];
  for (const finding of findings) {
    const unreviewedBroadFraudProvisionIds = finding.provisionLinks
      .filter((link) => link.justifyingTags.length === 0 && retrievalRuleForProvision(link.provisionId) !== undefined)
      .map((link) => link.provisionId);
    if (unreviewedBroadFraudProvisionIds.length === 0) continue;
    entries.push({
      recordId: finding.recordId,
      scenarioTitle: finding.scenarioTitle,
      caseName: finding.caseName,
      officialSourceUrl: finding.officialSourceUrl,
      unreviewedBroadFraudProvisionIds,
      humanLegalReviewCompleted: finding.humanLegalReviewCompleted,
    });
  }
  return entries.sort((a, b) => b.unreviewedBroadFraudProvisionIds.length - a.unreviewedBroadFraudProvisionIds.length);
}
