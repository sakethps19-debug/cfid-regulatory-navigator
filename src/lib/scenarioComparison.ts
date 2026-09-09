// Compare Scenarios: "how has the same broad legal/factual issue been
// treated across different matters/orders?" — a cross-matter comparison,
// the opposite axis from Case Journey (which stays WITHIN one matter_id).
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
import type { DirectionOutcome, FindingStatus, Matter, Order, ScenarioFinding } from "@/types/domain";
import { FIXED_SCENARIOS, type FixedScenario } from "@/data/curated/fixed-scenarios";
import { broadScenariosForFinding } from "@/lib/broadScenarioMatch";
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
  /** orderProvisionsConsidered(findings above), reused verbatim and scoped
   * to only the matched findings — a provision cited solely by a
   * DIFFERENT, unmatched finding on this same order never appears here.
   * Carries each provision's legal-function label and notUpheldOnly flag
   * exactly as Case/Order Detail already computes them; the Fixed
   * Scenario Analysis candidate-violation exclusion filter is never
   * applied (this is historical-order research, the same distinction
   * orderProvisionsConsidered's own docstring already draws). */
  provisionsConsidered: ProvisionConsideredSummary[];
  /** This order's own order_directions rows (via directionsForOrderIds at
   * the call site) — order-level, never per-finding, matching the actual
   * order_directions schema (no finding_id column) and Part 15's "exact
   * order_id, never stage-based lookup" requirement. */
  directions: DirectionOutcome[];
  /** Every DISTINCT findingStatus among `findings`, in the order they
   * first appear — never collapsed to one summary value, so a row with
   * both an established and a not-established matched finding shows
   * both, rather than losing one. */
  dispositions: FindingStatus[];
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
    for (const f of findingsForOrder) {
      if (!dispositions.includes(f.findingStatus)) dispositions.push(f.findingStatus);
    }
    rows.push({
      order,
      matter: order.matterId ? (matterById.get(order.matterId) ?? null) : null,
      findings: findingsForOrder,
      provisionsConsidered: orderProvisionsConsidered(findingsForOrder),
      directions: directionsByOrderId.get(orderId) ?? [],
      dispositions,
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
  /** Findings whose own recorded disposition is a positive
   * establishment at some stage (Confirmed in Final Order, Partly
   * Confirmed in Final Order, or Confirmed at interim). Findings whose
   * disposition is Prima facie/Alleged/Inconclusive/Withdrawn/Procedural
   * observation are counted in NEITHER this nor notEstablishedFindings --
   * they are not yet a determination either way, and forcing them into
   * either bucket would misstate the record. */
  establishedOrPartlyEstablishedFindings: number;
  /** Findings recorded as Not Confirmed in Final Order -- the negative/
   * non-establishment precedents this feature must never hide. */
  notEstablishedFindings: number;
}

export function summarizeScenarioComparison(rows: ComparisonRow[]): ScenarioComparisonSummary {
  const matterIds = new Set<string>();
  let finalOrders = 0;
  let establishedOrPartlyEstablishedFindings = 0;
  let notEstablishedFindings = 0;

  for (const row of rows) {
    if (row.matter) matterIds.add(row.matter.id);
    if (row.order.orderStage === "Final order") finalOrders += 1;
    for (const f of row.findings) {
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
