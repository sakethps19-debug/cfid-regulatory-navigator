// Compare Scenarios: "how has the same broad legal/factual issue been
// treated — across different matters, AND across different stages/orders
// of the same matter?" Complementary to Case Journey, not a narrower
// subset of it: Case Journey follows one matter's own procedural
// chronology (buildCaseJourney, caseJourney.ts) in depth; this module
// compares a chosen scenario across whichever orders and matters matched
// it, side by side, one row per order regardless of whether two matched
// orders happen to share a matter_id (Seacoast's interim + final orders
// both legitimately appear as two independent rows here when both match).
// Post-freeze correction pass (Section C): this module previously
// described itself as the "opposite axis" from Case Journey and its own
// landing page told officers this was "not a cross-order chronology
// within one matter" — technically true (this is a side-by-side
// comparison, not a chronology) but read, in practice, as "don't use this
// for same-matter comparison," which narrowed a genuinely useful
// capability the row-per-order design already supported. Nothing in the
// underlying grouping logic changed for this correction; only the
// dispositions per row now correctly avoid the interim/final stage-leak
// bug below, and the copy stops discouraging same-matter use.
//
// V1 is deliberately conservative: the ONLY inclusion mechanism is the
// existing broadScenariosForFinding (see broadScenarioMatch.ts) — a
// finding's own structured transactionTypes/allegedConduct tags matched
// against a FixedScenario's curated keyConceptIds, the exact same
// mechanism Order Detail's "Broad scenarios arising from this order" and
// Provision Detail's "Broad CFID scenarios" already use. No fuzzy text
// similarity, no finding-score threshold, no LLM classification, and no
// second scenario taxonomy — a row belongs here only because the
// structured corpus already maps that finding to the selected canonical
// scenario id.
//
// One consequence, faithfully preserved rather than worked around:
// FIXED_SCENARIOS deliberately gives two scenarios ("Fraudulent /
// Manipulative Conduct Affecting Investors or the Securities Market", the
// broad catch-all, and "Fraudulent / Deceptive Sale or Mis-selling in
// Connection with an Issue") an EMPTY keyConceptIds array — by that
// file's own design, reachable only through direct Fixed Scenario
// Analysis selection, never through structured concept matching. Selecting
// either of those two scenarios here will therefore always show zero
// comparison rows; this is a correct, honest reflection of the existing
// taxonomy's own design, not a bug in this module, and must never be
// worked around with a looser matching rule.
//
// PROVENANCE CORRECTION (post-review): finding_provisions carries only
// (finding_id, provision_id, relationship, justifying_tags) — confirmed via
// a read-only schema query during this pass. There is NO order-specific
// provision provenance anywhere in the schema: a provision link belongs to
// a FINDING, never to a (finding, order) pair. scenario_findings.orderIds
// (order_id + final_order_id) can legitimately span two orders for one
// finding (e.g. Seacoast's SSSL-* findings, Par Drugs' PDCL-01, each
// linked to both an interim and a later order). For such a finding, its
// provisionLinks prove the provisions were considered IN CONNECTION WITH
// THAT FINDING — they do NOT, by themselves, prove each provision was
// specifically considered in each individual order the finding happens to
// reference. orderProvisionsConsidered() (also used, unmodified, by Case
// Detail) has this exact same limitation baked in: it merges provisionLinks
// across whatever findings it's given with no order-awareness at all, so
// Case Detail's own "Provisions considered" section carries the identical
// assumption today for any multi-order finding. This module does NOT
// refactor Case Detail (out of scope for this pass — see the final
// report); it instead computes, per row, which of that row's cited
// provisions are backed by a finding genuinely linked to ONLY this one
// order (orderSpecific: true) versus a finding that also spans another
// order, where the citation is real and traceable to that finding but not
// proven specific to this order alone (orderSpecific: false) — see
// ComparisonProvisionEntry below. No migration is created for this: the
// schema gap is real and is reported, never invented around.
import type { DirectionOutcome, FindingStatus, Matter, Order, ScenarioFinding } from "@/types/domain";
import { FIXED_SCENARIOS, type FixedScenario } from "@/data/curated/fixed-scenarios";
import { broadScenariosForFinding } from "@/lib/broadScenarioMatch";
import { attributedOrderIdForDisposition } from "@/lib/caseJourney";
import { orderProvisionsConsidered, type ProvisionConsideredSummary } from "@/lib/orderProvisionsConsidered";

export function getComparableScenario(scenarioId: string): FixedScenario | undefined {
  return FIXED_SCENARIOS.find((s) => s.id === scenarioId);
}

/** Every scenario_finding structurally mapped to the given scenario id, via
 * the SAME mechanism (broadScenariosForFinding) used everywhere else this
 * taxonomy is consumed. Never a substring/name match against caseName,
 * scenarioTitle, or factualPattern. */
export function findingsForScenario(scenarioId: string, findings: ScenarioFinding[]): ScenarioFinding[] {
  return findings.filter((f) => broadScenariosForFinding(f).some((s) => s.id === scenarioId));
}

/** A provision cited by this row's matched finding(s), plus whether that
 * citation is proven specific to THIS order or only traceable to a
 * finding that also spans another order. See this file's header comment
 * for why finding_provisions cannot, by itself, prove order-specificity
 * for a multi-order finding. */
export interface ComparisonProvisionEntry extends ProvisionConsideredSummary {
  /** True when this provision has at least one independent citation from a
   * matched finding linked only to this order (finding.orderIds.length ===
   * 1) — i.e. genuinely unambiguous provenance already exists for it on
   * this row. False when the provision is supported only through
   * multi-order finding(s), in which case the corpus establishes
   * finding-level linkage but not order-specific provenance. A provision
   * with at least one qualifying single-order citation is true even if a
   * different, multi-order finding on the same row also happens to cite
   * it. */
  orderSpecific: boolean;
}

export interface ComparisonRow {
  order: Order;
  /** Resolved from order.matterId against the supplied matters list — null
   * only when the order's matter_id doesn't resolve to a known matters
   * row (never inferred/invented from case name). */
  matter: Matter | null;
  /** ONLY the findings on this order that matched the selected scenario —
   * never every finding recorded against this order. A finding whose
   * orderIds spans two orders (an interim/final pair sharing one finding
   * row, e.g. Seacoast's SSSL-* findings or Par Drugs' PDCL-01) produces
   * an independent row for EACH of its own orders, each still carrying
   * its own order-level directions/provisions — the two orders are never
   * merged into one row. */
  findings: ScenarioFinding[];
  /** Every provision cited by `findings` above, each flagged for whether
   * that citation is proven order-specific or only finding-level (see
   * ComparisonProvisionEntry). A provision cited solely by a DIFFERENT,
   * unmatched finding on this same order never appears here. Carries each
   * provision's legal-function label and notUpheldOnly flag exactly as
   * Case/Order Detail already computes them (via orderProvisionsConsidered,
   * reused unmodified); the Fixed Scenario Analysis candidate-violation
   * exclusion filter is never applied (this is historical-order research,
   * the same distinction orderProvisionsConsidered's own docstring already
   * draws). */
  provisionsConsidered: ComparisonProvisionEntry[];
  /** True when at least one entry in provisionsConsidered has
   * orderSpecific=false — i.e. this row cites at least one provision whose
   * only provenance is a finding that also spans another order. The UI
   * uses this to decide whether to show the finding-level qualifier note;
   * it is never shown when every cited provision is genuinely
   * order-specific. */
  hasFindingLevelOnlyProvisionLinkage: boolean;
  /** This order's own order_directions rows (via directionsForOrderIds at
   * the call site) — order-level, never per-finding, matching the actual
   * order_directions schema (no finding_id column) and Part 15's "exact
   * order_id, never stage-based lookup" requirement. */
  directions: DirectionOutcome[];
  /** Every DISTINCT findingStatus among `findings` that is genuinely
   * ATTRIBUTABLE to this row's own order — never collapsed to one summary
   * value, so a row with both an established and a not-established
   * matched finding shows both, rather than losing one. Section C
   * correction: findingStatus is one overall/controlling value per
   * finding, not one per order-stage. A finding whose orderIds spans an
   * earlier order (e.g. Seacoast's interim order) and a later, controlling
   * order (its final order) used to have that later order's own final
   * disposition rendered under BOTH rows, since this row set previously
   * used the raw findingStatus unconditionally. Reuses
   * attributedOrderIdForDisposition (caseJourney.ts, the same function
   * Case Journey's own stage cards rely on) so a final-adjudicatory
   * disposition is never copied backward into an earlier order's row
   * merely because the same finding also references it. See
   * hasNonAttributableDispositions below. */
  dispositions: FindingStatus[];
  /** True when at least one of this row's matched findings has a
   * disposition that is NOT attributable to this row's own order (i.e.
   * belongs to a different, later order the same finding also
   * references). The UI shows one neutral note for these — never a
   * fabricated or duplicated stage-specific outcome — same convention as
   * Case Journey's own hasNonAttributableDispositions. */
  hasNonAttributableDispositions: boolean;
}

/** Builds one comparison row per order that has at least one finding
 * matched to the selected scenario. matterOf resolves each order's own
 * matterId (never a company-name or fuzzy lookup) — pass a Map built from
 * getMatters(). directionsByOrderId must already be scoped to exactly the
 * order ids appearing among the matched findings (e.g. via
 * directionsForOrderIds(...) at the call site), grouped by order_id. */
export function buildScenarioComparison(
  scenarioId: string,
  allOrders: Order[],
  allFindings: ScenarioFinding[],
  directionsByOrderId: Map<string, DirectionOutcome[]>,
  matterById: Map<string, Matter>
): ComparisonRow[] {
  const matched = findingsForScenario(scenarioId, allFindings);
  const orderById = new Map(allOrders.map((o) => [o.id, o]));

  const findingsByOrderId = new Map<string, ScenarioFinding[]>();
  for (const finding of matched) {
    for (const orderId of finding.orderIds) {
      const list = findingsByOrderId.get(orderId) ?? [];
      list.push(finding);
      findingsByOrderId.set(orderId, list);
    }
  }

  const rows: ComparisonRow[] = [];
  for (const [orderId, findingsForOrder] of findingsByOrderId) {
    const order = orderById.get(orderId);
    if (!order) continue; // a referenced order not in the provided set -- skip rather than guess
    const dispositions: FindingStatus[] = [];
    let hasNonAttributableDispositions = false;
    for (const f of findingsForOrder) {
      if (attributedOrderIdForDisposition(f) === orderId) {
        if (!dispositions.includes(f.findingStatus)) dispositions.push(f.findingStatus);
      } else {
        hasNonAttributableDispositions = true;
      }
    }

    // A finding genuinely linked to only ONE order (orderIds.length === 1)
    // carries unambiguous order-specific provenance for this row; a
    // finding also linked to another order does not (see this file's
    // header comment). A provision confirmed via at least one
    // single-order finding is order-specific even if a different,
    // multi-order finding on the same row also cites it.
    const orderSpecificFindings = findingsForOrder.filter((f) => f.orderIds.length === 1);
    const orderSpecificProvisionIds = new Set(orderProvisionsConsidered(orderSpecificFindings).map((p) => p.provisionId));
    const provisionsConsidered: ComparisonProvisionEntry[] = orderProvisionsConsidered(findingsForOrder).map((summary) => ({
      ...summary,
      orderSpecific: orderSpecificProvisionIds.has(summary.provisionId),
    }));

    rows.push({
      order,
      matter: order.matterId ? (matterById.get(order.matterId) ?? null) : null,
      findings: findingsForOrder,
      provisionsConsidered,
      hasFindingLevelOnlyProvisionLinkage: provisionsConsidered.some((p) => !p.orderSpecific),
      directions: directionsByOrderId.get(orderId) ?? [],
      dispositions,
      hasNonAttributableDispositions,
    });
  }
  return rows;
}

// ---------------------------------------------------------------------
// Sorting -- newest order date first is the only default; every other
// order is explicit, never a proxy for "importance" (never by provision
// count or match frequency).
// ---------------------------------------------------------------------
export type ComparisonSortKey = "date_desc" | "date_asc" | "stage" | "disposition";

const STAGE_SORT_ORDER: Record<Order["orderStage"], number> = {
  "Interim order": 0,
  "Interim order cum show cause notice": 1,
  "Confirmatory order": 2,
  "Adjudication order": 3,
  "Final order": 4,
  "Revocation order": 5,
  "Settlement order": 6,
  Other: 7,
};

const DISPOSITION_SORT_ORDER: Record<FindingStatus, number> = {
  "Confirmed in Final Order": 0,
  "Partly Confirmed in Final Order": 1,
  "Confirmed at interim": 2,
  "Prima facie": 3,
  "Not Confirmed in Final Order": 4,
  Alleged: 5,
  Inconclusive: 6,
  "Procedural observation": 7,
  Withdrawn: 8,
};

/** The best (lowest sort-order) disposition among a row's own dispositions
 * -- used only to place a row within stage/disposition sort, never shown
 * as a collapsed "the" disposition (the UI always renders every distinct
 * disposition in `dispositions`). */
function primaryDispositionRank(row: ComparisonRow): number {
  return Math.min(...row.dispositions.map((d) => DISPOSITION_SORT_ORDER[d]));
}

export function sortComparisonRows(rows: ComparisonRow[], sortKey: ComparisonSortKey): ComparisonRow[] {
  const sorted = [...rows];
  switch (sortKey) {
    case "date_desc":
      sorted.sort((a, b) => (b.order.orderDate ?? "").localeCompare(a.order.orderDate ?? "") || a.order.caseName.localeCompare(b.order.caseName));
      break;
    case "date_asc":
      sorted.sort((a, b) => (a.order.orderDate ?? "").localeCompare(b.order.orderDate ?? "") || a.order.caseName.localeCompare(b.order.caseName));
      break;
    case "stage":
      sorted.sort((a, b) => STAGE_SORT_ORDER[a.order.orderStage] - STAGE_SORT_ORDER[b.order.orderStage] || (b.order.orderDate ?? "").localeCompare(a.order.orderDate ?? ""));
      break;
    case "disposition":
      sorted.sort((a, b) => primaryDispositionRank(a) - primaryDispositionRank(b) || (b.order.orderDate ?? "").localeCompare(a.order.orderDate ?? ""));
      break;
  }
  return sorted;
}

// ---------------------------------------------------------------------
// Filters -- kept as pure, testable predicates rather than inline React
// state logic, so the actual filtering behaviour is unit-testable outside
// a browser/DOM. Every filter genuinely narrows the row set (never a
// scoring-style pseudo-filter); omitting a field leaves that dimension
// unfiltered.
// ---------------------------------------------------------------------
export interface ComparisonFilters {
  stage?: Order["orderStage"];
  disposition?: FindingStatus;
  /** Filters to rows whose provisionsConsidered includes this exact
   * canonical provision id (never an instrument-only fuzzy match). */
  provisionId?: string;
  /** Matched against the row's own display matter label (matter's
   * normalizedMatterName, falling back to the order's caseName only when
   * no matter resolved) -- never a fuzzy/partial match. */
  matterLabel?: string;
  /** Inclusive ISO date bounds (YYYY-MM-DD), compared against
   * order.orderDate. An order with no date on file never matches a bound. */
  dateFrom?: string;
  dateTo?: string;
}

export function comparisonRowMatterLabel(row: ComparisonRow): string {
  return row.matter?.normalizedMatterName ?? row.order.caseName;
}

export function filterComparisonRows(rows: ComparisonRow[], filters: ComparisonFilters): ComparisonRow[] {
  return rows.filter((row) => {
    if (filters.stage && row.order.orderStage !== filters.stage) return false;
    if (filters.disposition && !row.dispositions.includes(filters.disposition)) return false;
    if (filters.provisionId && !row.provisionsConsidered.some((p) => p.provisionId === filters.provisionId)) return false;
    if (filters.matterLabel && comparisonRowMatterLabel(row) !== filters.matterLabel) return false;
    if (filters.dateFrom && (!row.order.orderDate || row.order.orderDate < filters.dateFrom)) return false;
    if (filters.dateTo && (!row.order.orderDate || row.order.orderDate > filters.dateTo)) return false;
    return true;
  });
}

// ---------------------------------------------------------------------
// Descriptive corpus counts only -- never a rate/percentage, never
// "success"/"violation"/"win" language. See callers for the exact labels
// shown to the officer.
// ---------------------------------------------------------------------
export interface ScenarioComparisonSummary {
  mattersRepresented: number;
  ordersRepresented: number;
  finalOrders: number;
  /** Every non-final-order stage combined (interim, interim-cum-SCN,
   * confirmatory, adjudication, revocation, settlement, other) -- deliberately
   * one combined bucket here; the table/filter itself still shows each
   * order's own exact stage. */
  interimConfirmatorySpecialOrders: number;
  /** UNIQUE findings (deduplicated by recordId — see below) whose own
   * recorded disposition is a positive establishment at some stage
   * (Confirmed in Final Order, Partly Confirmed in Final Order, or
   * Confirmed at interim). Findings whose disposition is Prima facie/
   * Alleged/Inconclusive/Withdrawn/Procedural observation are counted in
   * NEITHER this nor notEstablishedFindings -- they are not yet a
   * determination either way, and forcing them into either bucket would
   * misstate the record. */
  establishedOrPartlyEstablishedFindings: number;
  /** UNIQUE findings (deduplicated by recordId) recorded as Not Confirmed
   * in Final Order -- the negative/non-establishment precedents this
   * feature must never hide. */
  notEstablishedFindings: number;
}

/** rows.length already counts each ORDER once (buildScenarioComparison
 * groups by order id), so mattersRepresented/ordersRepresented/finalOrders
 * need no deduplication. Findings are a different unit: a single finding
 * genuinely linked to two orders (e.g. Seacoast's SSSL-* findings, Par
 * Drugs' PDCL-01) appears once per order's own row (correctly -- each
 * order gets its own row), but must still be counted ONCE, not once per
 * row, in the finding-level established/not-established counts below --
 * these are descriptive counts of distinct findings, never of
 * row-finding occurrences. Deduplicated by ScenarioFinding.recordId, the
 * corpus's own stable finding identifier. */
export function summarizeScenarioComparison(rows: ComparisonRow[]): ScenarioComparisonSummary {
  const matterIds = new Set<string>();
  let finalOrders = 0;
  const seenFindingRecordIds = new Set<string>();
  let establishedOrPartlyEstablishedFindings = 0;
  let notEstablishedFindings = 0;

  for (const row of rows) {
    if (row.matter) matterIds.add(row.matter.id);
    if (row.order.orderStage === "Final order") finalOrders += 1;
    for (const f of row.findings) {
      if (seenFindingRecordIds.has(f.recordId)) continue;
      seenFindingRecordIds.add(f.recordId);
      if (f.findingStatus === "Confirmed in Final Order" || f.findingStatus === "Partly Confirmed in Final Order" || f.findingStatus === "Confirmed at interim") {
        establishedOrPartlyEstablishedFindings += 1;
      } else if (f.findingStatus === "Not Confirmed in Final Order") {
        notEstablishedFindings += 1;
      }
    }
  }

  return {
    mattersRepresented: matterIds.size,
    ordersRepresented: rows.length,
    finalOrders,
    interimConfirmatorySpecialOrders: rows.length - finalOrders,
    establishedOrPartlyEstablishedFindings,
    notEstablishedFindings,
  };
}
