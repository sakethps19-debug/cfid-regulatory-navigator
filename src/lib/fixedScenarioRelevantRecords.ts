// "Relevant CFID orders and scenarios" for Fixed Scenario Analysis (Part A) —
// architectural normalization pass. Deliberately reuses the SAME two
// mechanisms already powering every other "broad scenario -> captured
// corpus" surface in the app (Law Library's fact search, a provision's
// "broad CFID scenarios" summary, Case/Order Detail's "Broad scenarios
// arising from this order" — see broadScenarioMatch.ts) rather than
// inventing a new relevance model:
//   1. A finding is associated with this scenario only if its own
//      structured transactionTypes/allegedConduct tags intersect the
//      scenario's curated keyConceptIds (never free text, never
//      evidenceTypes/actorRoles — the exact mechanism broadScenarioMatch.ts
//      documents as the fix for the old Ind AS 7/"related party register"
//      leakage).
//   2. Within a matching finding, only its finding_provisions links whose
//      provisionId is one of THIS scenario's own curated provisionIds are
//      shown — never every provision the finding happens to cite, and
//      never a provision reached only because some OTHER finding sharing
//      the same order also cites it. This is the exact "both conditions"
//      requirement: scenario-metadata association AND an exact
//      finding_provisions link.
// A scenario with empty keyConceptIds (the intentionally broad catch-all,
// and the mis-selling sub-product — see fixed-scenarios.ts) never matches
// anything here, exactly as broadScenarioMatch.ts already treats them
// everywhere else — never force-fitting a weak match for those two.
import { FIXED_SCENARIOS } from "@/data/curated/fixed-scenarios";
import { effectiveLinkStatus } from "@/lib/matching/scoring";
import type { FindingStatus, LegalProvision, Order, ScenarioFinding } from "@/types/domain";

export type RelevantRecordBucket = "confirmed_final" | "partly_confirmed" | "not_confirmed_contrary" | "interim_alleged_unresolved";

export const RELEVANT_RECORD_BUCKET_LABELS: Record<RelevantRecordBucket, string> = {
  confirmed_final: "Confirmed in final orders",
  partly_confirmed: "Partly confirmed",
  not_confirmed_contrary: "Not confirmed / contrary treatment",
  interim_alleged_unresolved: "Interim, alleged or otherwise unresolved",
};

export interface RelevantScenarioRecord {
  finding: ScenarioFinding;
  provision: LegalProvision;
  /** This specific finding_provisions link's own relationship-adjusted
   * disposition — see effectiveLinkStatus — never the finding's bare
   * overall findingStatus, since a multi-provision finding can carry a
   * different disposition per linked provision (e.g. Max Financial: the
   * finding overall is "Not Confirmed", and every one of its seven linked
   * provisions carries that same not-established disposition on this
   * specific link, never a positive one). */
  effectiveStatus: FindingStatus;
  bucket: RelevantRecordBucket;
  /** Every order on file for this finding (interim/final can both exist);
   * never assumes which one is "the" relevant order. */
  orders: Order[];
}

function bucketFor(effectiveStatus: FindingStatus): RelevantRecordBucket {
  if (effectiveStatus === "Confirmed in Final Order") return "confirmed_final";
  if (effectiveStatus === "Partly Confirmed in Final Order") return "partly_confirmed";
  if (effectiveStatus === "Not Confirmed in Final Order" || effectiveStatus === "Withdrawn") return "not_confirmed_contrary";
  return "interim_alleged_unresolved"; // Alleged, Prima facie, Confirmed at interim, Inconclusive, Procedural observation
}

/** For the Fixed Scenario with the given id, the captured corpus records
 * that satisfy BOTH the scenario-metadata association and an exact
 * finding_provisions link to one of this scenario's own curated
 * provisions — grouped into the four dispositional buckets. Never dumps
 * every order associated with a provision: a record only appears here
 * because a defensible structured connection (both of the above) exists
 * between the analysed scenario and that specific finding-provision pair. */
export function relevantScenarioRecords(
  scenarioId: string,
  findings: ScenarioFinding[],
  provisions: LegalProvision[],
  orders: Order[]
): RelevantScenarioRecord[] {
  const scenario = FIXED_SCENARIOS.find((s) => s.id === scenarioId);
  if (!scenario || scenario.keyConceptIds.length === 0) return [];
  const keyConceptIds = new Set(scenario.keyConceptIds);
  const scenarioProvisionIds = new Set(scenario.provisionIds);
  const provisionById = new Map(provisions.map((p) => [p.id, p]));
  const orderById = new Map(orders.map((o) => [o.id, o]));

  const records: RelevantScenarioRecord[] = [];
  for (const finding of findings) {
    const findingConceptIds = new Set([...finding.transactionTypes, ...finding.allegedConduct]);
    const isAssociated = [...keyConceptIds].some((id) => findingConceptIds.has(id));
    if (!isAssociated) continue;

    for (const link of finding.provisionLinks) {
      if (!scenarioProvisionIds.has(link.provisionId)) continue;
      const provision = provisionById.get(link.provisionId);
      if (!provision) continue;
      const effectiveStatus = effectiveLinkStatus(finding.findingStatus, link.relationship);
      records.push({
        finding,
        provision,
        effectiveStatus,
        bucket: bucketFor(effectiveStatus),
        orders: finding.orderIds.map((id) => orderById.get(id)).filter((o): o is Order => !!o),
      });
    }
  }
  return records;
}

/** Groups records by bucket in the required display order, each bucket's
 * own records sorted by provision number then record id for a stable,
 * predictable display — never by frequency, never by any signal that
 * could read as legal weight. */
export function groupRelevantScenarioRecords(records: RelevantScenarioRecord[]): { bucket: RelevantRecordBucket; records: RelevantScenarioRecord[] }[] {
  const order: RelevantRecordBucket[] = ["confirmed_final", "partly_confirmed", "not_confirmed_contrary", "interim_alleged_unresolved"];
  return order
    .map((bucket) => ({
      bucket,
      records: records
        .filter((r) => r.bucket === bucket)
        .sort((a, b) => a.provision.provisionNumber.localeCompare(b.provision.provisionNumber) || a.finding.recordId.localeCompare(b.finding.recordId)),
    }))
    .filter((g) => g.records.length > 0);
}
