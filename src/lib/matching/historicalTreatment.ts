// Historical treatment across CFID cases (deterministic-engine completion
// pass) — Question B of the Scenario Analyzer v1 mandate: "how has CFID
// historically treated materially similar facts?", architecturally
// SEPARATE from Question A ("what provisions are potentially relevant to MY
// facts?", answered by provisionResults/gateBlockedProvisionResults/
// contraryOnlyProvisionResults in engine.ts).
//
// CRITICAL INVARIANT: historical frequency must never determine legal
// applicability. This module never decides what counts as a candidate on
// the entered scenario — it only aggregates, for AWARENESS, every provision
// a materially-similar finding has cited, and then cross-references each
// one against the (independently computed) CURRENT candidate-tier result so
// an officer can see both side by side without conflating them. A provision
// appearing here with a high comparableMatterCount, but NOT a current
// candidate, must read as exactly that — never as evidence the provision
// "usually applies" to this fact pattern.
//
// "Materially similar" is deliberately computed the SAME way the precision
// engine computes it (scoreFinding + MIN_FINDING_SCORE from scoring.ts) —
// this is the corpus's one existing, tested notion of factual overlap, not
// a new heuristic invented for this view. What is DIFFERENT from the
// precision engine is that this module does NOT apply the provision-level
// retrieval gate or the actor-applicability check when deciding which
// provisions to list: a materially-similar finding's every cited provision
// is included here, gated or not, exactly because the whole point of this
// view is to show what was HISTORICALLY CITED, not what is currently
// retrievable.
//
// Architecture is generic across every fact pattern this corpus represents
// (RPT, fictitious sales, financial misstatement, diversion, issue-proceeds
// misuse, preferential allotment, market manipulation, governance,
// non-cooperation, accounting violations, etc.) — nothing here branches on
// a specific scenario category; it operates purely on the same
// concept-tag/provision-link data structures the precision engine uses.
import type { DetectedConcept } from "./conceptExtraction";
import { scoreFinding, additionalPrecedentFactsNotMatched, effectiveLinkStatus, MIN_FINDING_SCORE } from "./scoring";
import { legalFunctionForProvision } from "@/data/curated/legal-function-classification";
import type { FindingStatus, LegalProvision, Order, OrderStage, ScenarioFinding } from "@/types/domain";
import type {
  CandidateTier,
  ContraryOnlyProvisionResult,
  GateBlockedProvisionResult,
  HistoricalOrderStageClass,
  HistoricalTreatmentCaseEntry,
  HistoricalTreatmentDispositionBreakdown,
  HistoricalTreatmentProvisionEntry,
  HistoricalTreatmentResult,
  ProvisionResult,
} from "./types";

// Multiple orders can be linked to one finding (finding.orderIds); when
// they map to different stage classes, the FURTHEST-ADVANCED stage is used
// to represent that finding's own case entry — e.g. a finding whose interim
// order was later confirmed is shown as "confirmatory", not "interim",
// since the confirmatory order is the more advanced/current disposition.
// This priority order is itself the disclosed methodology, not a guess.
const STAGE_PRIORITY: HistoricalOrderStageClass[] = [
  "sat_or_supreme_court",
  "final_wtm",
  "adjudication",
  "confirmatory",
  "settlement",
  "interim_or_ex_parte",
  "unresolved_or_not_independently_classified",
];

// Domain OrderStage -> HistoricalOrderStageClass. "Revocation order" maps to
// "confirmatory": both are later-stage dispositions of an earlier interim
// direction, and this corpus's OrderStage enum has no separate SAT/Supreme
// Court value at all (never fabricated here — sat_or_supreme_court stays
// available in the type for future corpus growth but is never assigned from
// current Order data).
const ORDER_STAGE_TO_CLASS: Record<OrderStage, HistoricalOrderStageClass> = {
  "Interim order": "interim_or_ex_parte",
  "Interim order cum show cause notice": "interim_or_ex_parte",
  "Confirmatory order": "confirmatory",
  "Revocation order": "confirmatory",
  "Final order": "final_wtm",
  "Adjudication order": "adjudication",
  "Settlement order": "settlement",
  Other: "unresolved_or_not_independently_classified",
};

function classifyOrderStage(finding: ScenarioFinding, orderById: Map<string, Order>): HistoricalOrderStageClass {
  const classes = finding.orderIds
    .map((id) => orderById.get(id))
    .filter((o): o is Order => !!o)
    .map((o) => ORDER_STAGE_TO_CLASS[o.orderStage]);
  if (classes.length === 0) return "unresolved_or_not_independently_classified";
  for (const stage of STAGE_PRIORITY) {
    if (classes.includes(stage)) return stage;
  }
  return "unresolved_or_not_independently_classified";
}

function emptyDispositionBreakdown(): HistoricalTreatmentDispositionBreakdown {
  return {
    alleged: 0,
    primaFacie: 0,
    confirmedAtInterim: 0,
    confirmedFinal: 0,
    partlyUpheld: 0,
    notUpheld: 0,
    withdrawn: 0,
    inconclusive: 0,
    proceduralObservation: 0,
  };
}

function tallyDisposition(breakdown: HistoricalTreatmentDispositionBreakdown, status: FindingStatus): void {
  switch (status) {
    case "Alleged":
      breakdown.alleged++;
      break;
    case "Prima facie":
      breakdown.primaFacie++;
      break;
    case "Confirmed at interim":
      breakdown.confirmedAtInterim++;
      break;
    case "Confirmed in Final Order":
      breakdown.confirmedFinal++;
      break;
    case "Partly Confirmed in Final Order":
      breakdown.partlyUpheld++;
      break;
    case "Not Confirmed in Final Order":
      breakdown.notUpheld++;
      break;
    case "Withdrawn":
      breakdown.withdrawn++;
      break;
    case "Inconclusive":
      breakdown.inconclusive++;
      break;
    case "Procedural observation":
      breakdown.proceduralObservation++;
      break;
  }
}

// Picks ONE representative disposition per matter so a matter with several
// case entries on the same provision (e.g. an interim row and a later final
// row for the same underlying allegation) is still counted once in the
// disposition breakdown, not once per row. This is a FINALITY ranking, not
// merely "resolved vs unresolved": a final disposition — confirmed, partly
// confirmed, not confirmed, OR withdrawn — always outranks a merely interim
// or bare-allegation one, since the whole point is to report the matter's
// most CONCLUSIVE known disposition, never its earliest one. Deliberately
// distinct from engine.ts's deriveConfidence `best`-finding selection (which
// picks the highest-SCORING resolved finding to anchor a confidence figure,
// a different question from "which disposition is most conclusive").
const DISPOSITION_FINALITY_ORDER: FindingStatus[] = [
  "Confirmed in Final Order",
  "Partly Confirmed in Final Order",
  "Not Confirmed in Final Order",
  "Withdrawn",
  "Confirmed at interim",
  "Prima facie",
  "Alleged",
  "Inconclusive",
  "Procedural observation",
];
function representativeCase(cases: HistoricalTreatmentCaseEntry[]): HistoricalTreatmentCaseEntry {
  for (const status of DISPOSITION_FINALITY_ORDER) {
    const found = cases.find((c) => c.effectiveStatus === status);
    if (found) return found;
  }
  return cases[0];
}

export function buildHistoricalTreatment(
  effectiveConcepts: DetectedConcept[],
  scenarioFindings: ScenarioFinding[],
  provisions: LegalProvision[],
  orders: Order[],
  provisionResults: ProvisionResult[],
  gateBlockedProvisionResults: GateBlockedProvisionResult[],
  contraryOnlyProvisionResults: ContraryOnlyProvisionResult[]
): HistoricalTreatmentResult {
  const orderById = new Map(orders.map((o) => [o.id, o]));
  const provisionById = new Map(provisions.map((p) => [p.id, p]));

  // Same factual-overlap notion and threshold as the precision engine — see
  // this file's header comment for why. Deliberately NOT filtered by the
  // publication lifecycle a second time here: callers (engine.ts) already
  // pass only published findings, matching the precision engine's own
  // input.
  const materiallySimilar = scenarioFindings
    .map((f) => scoreFinding(f, effectiveConcepts))
    .filter((sf) => sf.score >= MIN_FINDING_SCORE);

  const casesByProvision = new Map<string, HistoricalTreatmentCaseEntry[]>();
  for (const sf of materiallySimilar) {
    for (const link of sf.finding.provisionLinks) {
      const entry: HistoricalTreatmentCaseEntry = {
        recordId: sf.finding.recordId,
        caseName: sf.finding.caseName,
        matterKey: sf.finding.caseName,
        findingStatus: sf.finding.findingStatus,
        effectiveStatus: effectiveLinkStatus(sf.finding.findingStatus, link.relationship),
        orderStageClass: classifyOrderStage(sf.finding, orderById),
        noticeeActors: sf.finding.noticeeActors,
        factualSimilarities: sf.matchedIngredients,
        factualDifferences: additionalPrecedentFactsNotMatched(sf.finding, sf.matchedIngredients),
        paragraphReference: sf.finding.finalParagraphReferences ?? sf.finding.interimParagraphReferences,
        officialSourceUrl: sf.finding.officialSourceUrl,
      };
      casesByProvision.set(link.provisionId, [...(casesByProvision.get(link.provisionId) ?? []), entry]);
    }
  }

  // Cross-reference into the CURRENT precision-engine result, by provision
  // id, so each historical entry can report both its own historical count
  // AND its (independently computed) current-scenario status — never
  // derived FROM the historical count. See the critical invariant above.
  const currentByProvision = new Map<string, { tier: CandidateTier; note: string }>();
  for (const pr of provisionResults) {
    const tierLabel = pr.candidateTier === "primary_candidate" ? "a primary candidate" : "a related/ancillary candidate (it rides on another established violation, not an independent trigger)";
    currentByProvision.set(pr.provision.id, {
      tier: pr.candidateTier,
      note: `On the present facts, this provision IS currently ${tierLabel} — see the main results above.`,
    });
  }
  for (const g of gateBlockedProvisionResults) {
    if (currentByProvision.has(g.provision.id)) continue;
    currentByProvision.set(g.provision.id, {
      tier: g.candidateTier,
      note: `On the present facts, this provision is NOT currently a candidate: the entered scenario does not presently state the factual prerequisite (or, where applicable, a compatible actor) required to retrieve it. ${g.gateExplanation}`,
    });
  }
  for (const c of contraryOnlyProvisionResults) {
    if (currentByProvision.has(c.provision.id)) continue;
    currentByProvision.set(c.provision.id, {
      tier: c.candidateTier,
      note: `On the present facts, the only comparable precedent(s) for this provision were NOT confirmed — no supporting precedent exists for it here.`,
    });
  }

  const entries: HistoricalTreatmentProvisionEntry[] = [];
  for (const [provisionId, cases] of casesByProvision.entries()) {
    const provision = provisionById.get(provisionId);
    if (!provision) continue;

    // Matter-level dedup: group by matterKey (caseName — see the disclosed
    // methodology note below) so ONE matter with multiple order-stage rows
    // (e.g. an interim finding later superseded by a confirmatory one
    // recorded as a SEPARATE scenario_findings row, rather than updated in
    // place) is never read as multiple independent factual precedents.
    const casesByMatter = new Map<string, HistoricalTreatmentCaseEntry[]>();
    for (const c of cases) casesByMatter.set(c.matterKey, [...(casesByMatter.get(c.matterKey) ?? []), c]);

    const dispositionBreakdown = emptyDispositionBreakdown();
    for (const matterCases of casesByMatter.values()) {
      tallyDisposition(dispositionBreakdown, representativeCase(matterCases).effectiveStatus);
    }

    const current = currentByProvision.get(provisionId);
    const comparableMatterCount = casesByMatter.size;
    const currentApplicabilityNote = current
      ? `Historically considered in ${comparableMatterCount} comparable matter${comparableMatterCount === 1 ? "" : "s"}. ${current.note}`
      : `Historically considered in ${comparableMatterCount} comparable matter${comparableMatterCount === 1 ? "" : "s"}, but the current scenario does not presently state the factual prerequisite required to retrieve this provision.`;

    entries.push({
      provision,
      legalFunction: legalFunctionForProvision(provisionId),
      comparableMatterCount,
      totalFindingsCount: cases.length,
      dispositionBreakdown,
      cases,
      currentCandidateTier: current?.tier ?? "not_currently_a_candidate",
      currentApplicabilityNote,
    });
  }

  entries.sort((a, b) => b.comparableMatterCount - a.comparableMatterCount);

  return {
    matterDedupBasis:
      "Comparable-matter counts are deduplicated by case name (scenario_findings.case_name), a conservative choice: a genuinely different matter that happens to share an identical case-name string would be undercounted rather than double-counted, which this corpus's own data model (Order.matterId is not threaded into this view) does not let this module rule out with certainty. Multiple order-stage rows belonging to the SAME finding record are never double-counted, since each scenario_findings row already represents one finding spanning both its interim and final citations.",
    entries,
  };
}
