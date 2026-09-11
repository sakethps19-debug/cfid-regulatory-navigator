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
//
// Order-level provenance (checkpoint correction A): finding_provisions
// establishes a link at the FINDING level, never per-order. A finding
// spanning more than one captured order (finding.orderIds.length > 1 —
// e.g. Seacoast Shipping Services Limited's findings, each carrying both
// an interim and a final order id; Par Drugs and Chemicals Limited's
// PDCL-01, interim + confirmatory) does NOT prove the linked provision was
// itself considered in every one of those orders individually — only that
// the finding (which may synthesize facts across the matter's stages) is
// linked to it. Displaying such orders as if each had independently
// considered the provision would overclaim exactly the same way Compare
// Scenarios and Case Detail's provision lists previously did, before both
// were corrected to flag this with `orderSpecific` (see
// orderProvisionsConsidered.ts / scenarioComparison.ts's
// ComparisonProvisionEntry.orderSpecific — the same pattern is reused here
// rather than inventing a third rule). orderSpecific is true only when the
// finding is linked to exactly one captured order, i.e. unambiguous
// order-level provenance already exists; false for any multi-order
// finding, regardless of how many of its orders are on file.
import { FIXED_SCENARIOS } from "@/data/curated/fixed-scenarios";
import { effectiveLinkStatus } from "@/lib/matching/scoring";
import { findingDispositionLabel } from "@/lib/findingStatusDisplay";
import type { FindingStatus, LegalProvision, Order, ScenarioFinding } from "@/types/domain";

export type RelevantRecordBucket = "confirmed_final" | "partly_confirmed" | "not_confirmed_contrary" | "interim_alleged_unresolved";

// Checkpoint correction A: bucket labels now describe the FINDING's
// disposition ("Findings ...") rather than a bare disposition label that
// could be misread as a claim about every order listed underneath it — a
// multi-order finding confirmed at final stage may still list an interim
// order alongside the final one, and the label must not imply that
// interim order was itself a final confirmation.
export const RELEVANT_RECORD_BUCKET_LABELS: Record<RelevantRecordBucket, string> = {
  confirmed_final: "Findings confirmed at final stage",
  partly_confirmed: "Findings partly confirmed at final stage",
  not_confirmed_contrary: "Findings not confirmed / contrary treatment",
  interim_alleged_unresolved: "Findings interim, alleged or otherwise unresolved",
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
   * never assumes which one is "the" relevant order. Whether this
   * provision-link's provenance is proven order-specific for each of them
   * is `orderSpecific` below — these orders are shown either way (they
   * genuinely belong to the finding), just labelled accordingly. */
  orders: Order[];
  /** True only when the finding is linked to exactly one captured order —
   * unambiguous order-level provenance for this provision link already
   * exists. False for any multi-order finding: the corpus then establishes
   * only finding-level linkage, and the orders above must be presented as
   * "captured orders linked to this finding", never as orders individually
   * proven to have considered the provision. Same conservative pattern as
   * scenarioComparison.ts / orderProvisionsConsidered.ts's own
   * `orderSpecific`. */
  orderSpecific: boolean;
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
        orderSpecific: finding.orderIds.length === 1,
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

// ---------------------------------------------------------------------
// Order-centric presentation (live-officer-review correction): the primary
// unit an officer scans for should be the CAPTURED ORDER, not the raw
// finding/provision-link record — the same company otherwise appears
// repeatedly purely because it has several structured findings (e.g. Royal
// Orchid Hotels: ROHL-01/02/03 as three separate cards for one order). Every
// finding-provision record above is grouped into exactly one card per
// distinct order id it is linked to; a finding linked to more than one
// order (interim + final) contributes to EACH of those orders' own cards —
// never merged into one, since order stage is legally material (a matter's
// Interim Order and Final Order remain two separate cards even though they
// share a company/matter). Provisions are deduped within an order card;
// disposition text is drawn per-finding from findingDispositionLabel, never
// aggregated into one guessed "order outcome" the underlying data doesn't
// itself support.
export interface RelevantOrderProvisionEntry {
  provision: LegalProvision;
  /** Which of this order's relevant findings actually justify listing this
   * provision here — never a provision shown merely because some OTHER
   * order's finding happens to cite it. */
  findingRecordIds: string[];
  /** False if ANY contributing finding-provision link's provenance is not
   * proven order-specific (see RelevantScenarioRecord.orderSpecific) — the
   * card must then disclose that this provision's linkage may span more
   * than one captured order, never silently presented as if this order
   * alone had been shown to consider it. */
  orderSpecific: boolean;
}

export interface RelevantOrderFindingEntry {
  finding: ScenarioFinding;
  /** This finding's own broad factual issue, as recorded — never invented
   * summary prose. */
  scenarioTitle: string;
  /** This finding's disposition, disposition-only (no guessed order
   * stage) — null for Alleged/Prima facie, which are not disposition facts
   * and must never render as a status badge (global officer-facing product
   * rule); omit the "Outcome" line for those rather than fabricate one. */
  dispositionLabel: string | null;
  provisionIds: string[];
  /** True only if THIS finding is linked to exactly one captured order
   * (this one) — see RelevantScenarioRecord.orderSpecific. */
  orderSpecific: boolean;
}

export interface RelevantOrderGroup {
  order: Order;
  findings: RelevantOrderFindingEntry[];
  provisions: RelevantOrderProvisionEntry[];
  /** True if any finding under this order carries provision linkage that
   * is only proven at finding level (may span more than one captured
   * order) — drives the neutral provenance disclosure on the card. Never
   * silently dropped; see provision-retrieval-remediation's "Order-level
   * provenance" invariant, reused here rather than a new rule. */
  hasFindingLevelOnlyLinkage: boolean;
}

/** Groups relevantScenarioRecords by the CAPTURED ORDER each contributing
 * finding is linked to. One captured order = one card; provisions and
 * findings are deduped within it. A finding linked to several orders
 * (finding.orderIds.length > 1) contributes to every one of those orders'
 * own cards — this is NOT the same as merging the orders themselves: two
 * distinct Order rows for the same matter (e.g. an Interim Order and its
 * later Final Order) always remain two separate groups/cards here, keyed
 * by order.id, never combined by matter or company name. Sorted newest
 * order first (orders with no recorded date last), then by case name for a
 * stable tie-break — never by finding count or disposition, which would
 * read as a legal-weight ranking this function has no basis to make. */
export function groupRelevantRecordsByOrder(records: RelevantScenarioRecord[]): RelevantOrderGroup[] {
  const byOrderId = new Map<string, RelevantOrderGroup>();

  for (const record of records) {
    for (const order of record.orders) {
      let group = byOrderId.get(order.id);
      if (!group) {
        group = { order, findings: [], provisions: [], hasFindingLevelOnlyLinkage: false };
        byOrderId.set(order.id, group);
      }

      if (!group.findings.some((f) => f.finding.recordId === record.finding.recordId)) {
        group.findings.push({
          finding: record.finding,
          scenarioTitle: record.finding.scenarioTitle,
          dispositionLabel: findingDispositionLabel(record.effectiveStatus),
          provisionIds: [],
          orderSpecific: record.orderSpecific,
        });
      }
      const findingEntry = group.findings.find((f) => f.finding.recordId === record.finding.recordId)!;
      if (!findingEntry.provisionIds.includes(record.provision.id)) findingEntry.provisionIds.push(record.provision.id);

      const existingProvision = group.provisions.find((p) => p.provision.id === record.provision.id);
      if (existingProvision) {
        if (!existingProvision.findingRecordIds.includes(record.finding.recordId)) {
          existingProvision.findingRecordIds.push(record.finding.recordId);
        }
        existingProvision.orderSpecific = existingProvision.orderSpecific && record.orderSpecific;
      } else {
        group.provisions.push({ provision: record.provision, findingRecordIds: [record.finding.recordId], orderSpecific: record.orderSpecific });
      }

      if (!record.orderSpecific) group.hasFindingLevelOnlyLinkage = true;
    }
  }

  for (const group of byOrderId.values()) {
    group.findings.sort((a, b) => a.finding.recordId.localeCompare(b.finding.recordId));
    group.provisions.sort((a, b) => a.provision.provisionNumber.localeCompare(b.provision.provisionNumber));
  }

  return [...byOrderId.values()].sort((a, b) => {
    if (a.order.orderDate && b.order.orderDate && a.order.orderDate !== b.order.orderDate) {
      return b.order.orderDate.localeCompare(a.order.orderDate);
    }
    if (a.order.orderDate && !b.order.orderDate) return -1;
    if (!a.order.orderDate && b.order.orderDate) return 1;
    return a.order.caseName.localeCompare(b.order.caseName);
  });
}
