// Historical treatment across CFID cases (deterministic-engine completion
// pass; corrected in a follow-up review pass — see the three defects fixed
// below) — Question B of the Scenario Analyzer v1 mandate: "how has CFID
// historically treated materially similar facts?", architecturally
// SEPARATE from Question A ("what provisions are potentially relevant to MY
// facts?", answered by provisionResults/gateBlockedProvisionResults/
// contraryOnlyProvisionResults in engine.ts).
//
// CRITICAL INVARIANT: historical frequency must never determine legal
// applicability. This module never decides what counts as a candidate on
// the entered scenario — it only aggregates, for AWARENESS, every provision
// a comparable matter has invoked, and then cross-references each one
// against the (independently computed) CURRENT candidate-tier result so an
// officer can see both side by side without conflating them. A provision
// appearing here with a high comparableMatterCount, but NOT a current
// candidate, must read as exactly that — never as evidence the provision
// "usually applies" to this fact pattern.
//
// Three defects an independent review found in the first version of this
// file, and how this version fixes each:
//
// 1. MATTER IDENTITY. The first version deduplicated matters by bare case
//    name (scenario_findings.case_name). This corpus already has a real
//    matter model: orders.matter_id (a curated foreign key — see
//    data.ts's mapOrder and the P2-18 audit note there) groups an interim
//    order, its confirmatory order, a later adjudication order, etc. under
//    one matter. resolveMatterKey below resolves EVERY case entry's
//    matterKey via that real id, walking the finding's own orderIds (see
//    ScenarioFinding.orderIds — populated from scenario_findings.order_id/
//    final_order_id, both real order foreign keys) to the linked Order's
//    matterId. Only when NO linked order carries a matter_id does this
//    fall back to a case-name-based key — a disclosed, weaker proxy, never
//    silently treated as equivalent (see MatterIdentityBasis in types.ts
//    and matterIdentityStats in the returned result).
//
// 2. HISTORICAL COMPARABILITY. The first version reused the precision
//    engine's own MIN_FINDING_SCORE (a single weight-3 transaction or
//    conduct tag) as "materially similar" for Question B too — too
//    permissive: a matter whose ONLY overlap with the entered scenario is
//    one generic tag (e.g. bare "related-party transaction") could dump
//    every OTHER provision that matter's own finding happened to bundle in
//    (fraud, diversion, governance...) into the historical view, none of
//    it actually connected to the entered facts. This version:
//      (a) computes a genuine 4-tier HistoricalComparabilityTier per
//          finding (see classifyComparability) — a single substantive
//          (transaction or conduct) tag match is "moderately_comparable"
//          at best, never "strongly_comparable" (which requires BOTH);
//      (b) matters whose only overlap is generic actor/evidence overlap
//          ("contextually_related") are counted but contribute NO
//          provision-level case entries at all — a bare shared actor role
//          is too generic to support attributing any SPECIFIC provision to
//          the entered facts;
//      (c) even within a qualifying matter, each PROVISION LINK is
//          filtered by its own finding_provisions.justifying_tags — the
//          same per-link curation the precision engine already applies for
//          Question A (see engine.ts) — so a link whose non-empty
//          justifyingTags point to a DIFFERENT fact within a bundled,
//          multi-issue finding is excluded from THIS query's view of that
//          provision entirely, not silently attributed to an unrelated
//          entered fact. A link with EMPTY justifyingTags (hundreds of
//          live links, per the corpus's own known data-quality state) is
//          still shown — never fabricating certainty either way — but
//          explicitly marked "unverified" (see attributionStatus and the
//          attributedFindingsCount/unverifiedFindingsCount split), never
//          implied to have been "historically invoked for this fact
//          pattern" the way an attributed link is.
//
// 3. NOTICEE-SPECIFIC OUTCOMES. The first version picked ONE
//    representative disposition per (matter, provision) via a finality
//    ranking, which could silently read "company confirmed, one director
//    exonerated" as a single "confirmed" figure. This version groups case
//    entries into HistoricalTreatmentMatterOutcome per matter, and — where
//    the case entries for one matter+provision carry DIFFERENT
//    effectiveStatus values (different noticees, or the same actor's
//    status genuinely changed between an interim and final disposition) —
//    reports an explicit "mixed_noticee_outcome" state (see
//    MatterProvisionOutcomeKind) rather than collapsing to whichever
//    status ranks highest. dispositionBreakdown.mixedNoticeeOutcome tracks
//    this separately from every uniform-outcome bucket.
//
// Architecture remains generic across every fact pattern this corpus
// represents (RPT, fictitious sales, financial misstatement, diversion,
// issue-proceeds misuse, preferential allotment, market manipulation,
// governance, non-cooperation, accounting violations, etc.) — nothing here
// branches on a specific scenario category; it operates purely on the same
// concept-tag/provision-link/order data structures the precision engine
// and data layer already use.
import type { DetectedConcept } from "./conceptExtraction";
import { scoreFinding, additionalPrecedentFactsNotMatched, effectiveLinkStatus, MIN_FINDING_SCORE, type ScoredFinding } from "./scoring";
import { legalFunctionForProvision } from "@/data/curated/legal-function-classification";
import type { FindingStatus, LegalProvision, Order, OrderStage, ScenarioFinding } from "@/types/domain";
import type {
  CandidateTier,
  ContraryOnlyProvisionResult,
  GateBlockedProvisionResult,
  HistoricalComparabilityTier,
  HistoricalOrderStageClass,
  HistoricalTreatmentCaseEntry,
  HistoricalTreatmentDispositionBreakdown,
  HistoricalTreatmentMatterOutcome,
  HistoricalTreatmentProvisionEntry,
  HistoricalTreatmentResult,
  MatterIdentityBasis,
  MatterProvisionOutcomeKind,
  ProvisionResult,
} from "./types";

// ----- Order-stage classification (unchanged from the prior pass) -----

const STAGE_PRIORITY: HistoricalOrderStageClass[] = [
  "sat_or_supreme_court",
  "final_wtm",
  "adjudication",
  "confirmatory",
  "settlement",
  "interim_or_ex_parte",
  "unresolved_or_not_independently_classified",
];

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

// ----- Defect #1 fix: matter identity via orders.matter_id -----

/** Resolves a finding's matterKey via the REAL matter model where possible.
 * Walks every order linked to the finding (finding.orderIds — populated
 * from scenario_findings.order_id/final_order_id) and uses the first
 * linked order that carries a matter_id. The two key spaces (real
 * matter_id vs. case-name fallback) are disjoint by construction (distinct
 * prefixes) so a fallback key can never collide with, or be mistaken for,
 * a real matter_id key. */
function resolveMatterKey(finding: ScenarioFinding, orderById: Map<string, Order>): { key: string; basis: MatterIdentityBasis } {
  for (const orderId of finding.orderIds) {
    const order = orderById.get(orderId);
    if (order?.matterId) return { key: `matter:${order.matterId}`, basis: "matter_id" };
  }
  return { key: `casename:${finding.caseName.trim().toLowerCase()}`, basis: "case_name_fallback" };
}

// ----- Defect #2 fix: genuine historical-comparability tiering -----

/** A single substantive (transaction OR conduct) tag match is real
 * overlap and still clears MIN_FINDING_SCORE, but must never alone read as
 * "strongly comparable" — that requires overlap on BOTH substantive
 * categories (the same distinction scoreFinding already tracks via
 * substantiveCategoriesMatched, reused here rather than re-derived).
 * "contextually_related" is overlap confined to actor/evidence-type tags
 * only — generic context (a shared "promoter" actor role, a shared "bank
 * statements" evidence type) that recurs across many unrelated matters and
 * cannot, on its own, support attributing any specific provision to the
 * entered facts (see classifyComparability's caller in
 * buildHistoricalTreatment for how that exclusion is enforced). */
function classifyComparability(sf: ScoredFinding): HistoricalComparabilityTier {
  if (sf.score < MIN_FINDING_SCORE) return "weak_excluded";
  if (sf.substantiveCategoriesMatched >= 2) return "strongly_comparable";
  if (sf.substantiveCategoriesMatched === 1) return "moderately_comparable";
  return "contextually_related";
}

// ----- Defect #3 fix: outcome aggregation without a finality-priority collapse -----

function outcomeKindForStatus(status: FindingStatus): MatterProvisionOutcomeKind {
  switch (status) {
    case "Confirmed in Final Order":
      return "uniformly_confirmed_final";
    case "Partly Confirmed in Final Order":
      return "uniformly_partly_upheld";
    case "Not Confirmed in Final Order":
      return "uniformly_not_upheld";
    case "Confirmed at interim":
      return "uniformly_confirmed_interim";
    case "Withdrawn":
      return "uniformly_withdrawn";
    default:
      // Alleged / Prima facie / Inconclusive / Procedural observation
      return "uniformly_alleged_or_unresolved";
  }
}

// A final-stage disposition SUPERSEDES an interim/unresolved one for the
// SAME allegation — an interim "Confirmed at interim" row later followed
// by a "Confirmed in Final Order" row for the same matter+provision is
// PROGRESSION, not disagreement, and must read as the (uniform) final
// outcome, never as "mixed". "Mixed" is reserved for genuine disagreement
// AT THE SAME (most-advanced) stage — e.g. the company confirmed and a
// director not confirmed, both at final-order stage. See
// deriveMatterOutcome below.
const FINAL_STAGE_STATUSES = new Set<FindingStatus>(["Confirmed in Final Order", "Partly Confirmed in Final Order", "Not Confirmed in Final Order", "Withdrawn"]);

/** The outcome for one (matter, provision) group. First narrows to the
 * most-advanced stage actually reached (final-stage entries, if any exist,
 * otherwise whatever interim/unresolved entries there are — see
 * FINAL_STAGE_STATUSES above), THEN checks whether that narrowed set is
 * uniform or split. This is deliberately a two-step reduction, not a bare
 * "any two entries differ = mixed" check: an interim row superseded by a
 * later final row for the same allegation is progression, not a mixed
 * outcome, while two final-stage entries that genuinely disagree (company
 * confirmed, one noticee exonerated) ARE a mixed outcome — computed BEFORE
 * any finality-priority pick is applied, so a genuinely mixed result can
 * never be silently collapsed to whichever single status would rank
 * highest. */
function deriveMatterOutcome(cases: HistoricalTreatmentCaseEntry[]): { outcome: MatterProvisionOutcomeKind; representativeStatus: FindingStatus } {
  const finalStageCases = cases.filter((c) => FINAL_STAGE_STATUSES.has(c.effectiveStatus));
  const consideredCases = finalStageCases.length > 0 ? finalStageCases : cases;
  const distinctStatuses = new Set(consideredCases.map((c) => c.effectiveStatus));
  const representativeStatus = consideredCases[0].effectiveStatus;
  if (distinctStatuses.size > 1) return { outcome: "mixed_noticee_outcome", representativeStatus };
  return { outcome: outcomeKindForStatus(representativeStatus), representativeStatus };
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
    mixedNoticeeOutcome: 0,
  };
}

/** Tallies ONE (matter, provision) group's outcome into the breakdown.
 * Mixed groups increment ONLY mixedNoticeeOutcome; every other bucket is
 * incremented only for a genuinely UNIFORM group, so a split outcome can
 * never inflate (or masquerade as) any single-status count. */
function tallyOutcome(breakdown: HistoricalTreatmentDispositionBreakdown, outcome: MatterProvisionOutcomeKind, representativeStatus: FindingStatus): void {
  if (outcome === "mixed_noticee_outcome") {
    breakdown.mixedNoticeeOutcome++;
    return;
  }
  switch (representativeStatus) {
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
  const detectedIds = new Set(effectiveConcepts.map((c) => c.id));

  const scored = scenarioFindings.map((f) => {
    const sf = scoreFinding(f, effectiveConcepts);
    return { sf, tier: classifyComparability(sf) };
  });

  // Overall (whole-query) matter counts, deduplicated by matterKey,
  // independent of any single provision's own breakdown — see
  // HistoricalTreatmentResult.overallMatterCounts. Computed from the BEST
  // (highest) tier reached by any finding sharing that matterKey, since one
  // matter can have several scenario_findings rows of differing relevance.
  const TIER_RANK: Record<HistoricalComparabilityTier, number> = { strongly_comparable: 3, moderately_comparable: 2, contextually_related: 1, weak_excluded: 0 };
  const bestTierByMatter = new Map<string, HistoricalComparabilityTier>();
  const matterIdBasisByMatter = new Map<string, MatterIdentityBasis>();
  let resolvedViaMatterId = 0;
  let resolvedViaFallback = 0;
  const fallbackRecordIds: string[] = [];
  for (const { sf, tier } of scored) {
    const { key, basis } = resolveMatterKey(sf.finding, orderById);
    matterIdBasisByMatter.set(key, basis);
    if (basis === "matter_id") resolvedViaMatterId++;
    else {
      resolvedViaFallback++;
      fallbackRecordIds.push(sf.finding.recordId);
    }
    const existing = bestTierByMatter.get(key);
    if (!existing || TIER_RANK[tier] > TIER_RANK[existing]) bestTierByMatter.set(key, tier);
  }
  const overallMatterCounts = { stronglyComparable: 0, moderatelyComparable: 0, contextuallyRelated: 0, weakExcluded: 0 };
  for (const tier of bestTierByMatter.values()) {
    if (tier === "strongly_comparable") overallMatterCounts.stronglyComparable++;
    else if (tier === "moderately_comparable") overallMatterCounts.moderatelyComparable++;
    else if (tier === "contextually_related") overallMatterCounts.contextuallyRelated++;
    else overallMatterCounts.weakExcluded++;
  }

  // Contextually-related findings never contribute a case entry (see
  // header comment, defect #2), but a provision's own card should still
  // disclose how many such matters ALSO happened to cite it — tracked here
  // as matter KEYS per provision id (never case entries, never attribution
  // status, since a contextually-related match carries no substantive
  // fact connection to hang either claim on).
  const contextualMattersByProvision = new Map<string, Set<string>>();
  for (const { sf, tier } of scored) {
    if (tier !== "contextually_related") continue;
    const { key: matterKey } = resolveMatterKey(sf.finding, orderById);
    for (const link of sf.finding.provisionLinks) {
      const set = contextualMattersByProvision.get(link.provisionId) ?? new Set<string>();
      set.add(matterKey);
      contextualMattersByProvision.set(link.provisionId, set);
    }
  }

  // Provision-level case entries: only findings at strongly_comparable or
  // moderately_comparable tier contribute — contextually_related and
  // weak_excluded findings are excluded from every provision's case list
  // (see this file's header comment, defect #2). Within a qualifying
  // finding, each provision LINK is further filtered by its own
  // justifyingTags, exactly mirroring the precision engine's per-link gate
  // in engine.ts (see defect #2(c)).
  const casesByProvision = new Map<string, HistoricalTreatmentCaseEntry[]>();
  for (const { sf, tier } of scored) {
    if (tier !== "strongly_comparable" && tier !== "moderately_comparable") continue;
    const { key: matterKey, basis: matterIdBasis } = resolveMatterKey(sf.finding, orderById);
    for (const link of sf.finding.provisionLinks) {
      const hasCuratedTags = link.justifyingTags.length > 0;
      if (hasCuratedTags && !link.justifyingTags.some((t) => detectedIds.has(t))) continue; // curated evidence: different fact within this finding
      const entry: HistoricalTreatmentCaseEntry = {
        recordId: sf.finding.recordId,
        caseName: sf.finding.caseName,
        matterKey,
        matterIdBasis,
        findingStatus: sf.finding.findingStatus,
        effectiveStatus: effectiveLinkStatus(sf.finding.findingStatus, link.relationship),
        orderStageClass: classifyOrderStage(sf.finding, orderById),
        noticeeActors: sf.finding.noticeeActors,
        factualSimilarities: sf.matchedIngredients,
        factualDifferences: additionalPrecedentFactsNotMatched(sf.finding, sf.matchedIngredients),
        attributionStatus: hasCuratedTags ? "attributed" : "unverified",
        paragraphReference: sf.finding.finalParagraphReferences ?? sf.finding.interimParagraphReferences,
        officialSourceUrl: sf.finding.officialSourceUrl,
      };
      casesByProvision.set(link.provisionId, [...(casesByProvision.get(link.provisionId) ?? []), entry]);
    }
  }

  // Cross-reference into the CURRENT precision-engine result, by provision
  // id (unchanged from the prior pass) — see the critical invariant above.
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

    // Matter-level grouping (defect #1 + #3 fix): group by the REAL
    // matterKey, then derive an explicit uniform/mixed outcome per matter
    // rather than picking one representative case by finality ranking.
    const casesByMatter = new Map<string, HistoricalTreatmentCaseEntry[]>();
    for (const c of cases) casesByMatter.set(c.matterKey, [...(casesByMatter.get(c.matterKey) ?? []), c]);

    const dispositionBreakdown = emptyDispositionBreakdown();
    const matterOutcomes: HistoricalTreatmentMatterOutcome[] = [];
    let stronglyComparableMatterCount = 0;
    let moderatelyComparableMatterCount = 0;
    for (const [matterKey, matterCases] of casesByMatter.entries()) {
      const { outcome, representativeStatus } = deriveMatterOutcome(matterCases);
      tallyOutcome(dispositionBreakdown, outcome, representativeStatus);
      const tier = bestTierByMatter.get(matterKey) ?? "moderately_comparable";
      if (tier === "strongly_comparable") stronglyComparableMatterCount++;
      else moderatelyComparableMatterCount++;
      matterOutcomes.push({
        matterKey,
        matterIdBasis: matterCases[0].matterIdBasis,
        caseName: matterCases[0].caseName,
        comparabilityTier: tier,
        outcome,
        cases: matterCases,
      });
    }
    matterOutcomes.sort((a, b) => b.cases.length - a.cases.length);

    const comparableMatterCount = casesByMatter.size;
    const contextuallyRelatedMatterCount = contextualMattersByProvision.get(provisionId)?.size ?? 0;
    const attributedFindingsCount = cases.filter((c) => c.attributionStatus === "attributed").length;
    const unverifiedFindingsCount = cases.filter((c) => c.attributionStatus === "unverified").length;

    const current = currentByProvision.get(provisionId);
    const currentApplicabilityNote = current
      ? `Historically considered in ${comparableMatterCount} comparable matter${comparableMatterCount === 1 ? "" : "s"}. ${current.note}`
      : `Historically considered in ${comparableMatterCount} comparable matter${comparableMatterCount === 1 ? "" : "s"}, but the current scenario does not presently state the factual prerequisite required to retrieve this provision.`;

    entries.push({
      provision,
      legalFunction: legalFunctionForProvision(provisionId),
      comparableMatterCount,
      stronglyComparableMatterCount,
      moderatelyComparableMatterCount,
      contextuallyRelatedMatterCount,
      totalFindingsCount: cases.length,
      attributedFindingsCount,
      unverifiedFindingsCount,
      dispositionBreakdown,
      matterOutcomes,
      cases,
      currentCandidateTier: current?.tier ?? "not_currently_a_candidate",
      currentApplicabilityNote,
    });
  }

  // Provisions cited ONLY by contextually-related matters (never by a
  // strongly/moderately comparable one) still deserve an entry — an
  // officer should be able to see "this was cited in N contextually
  // related matters" even where no matter cleared the bar to attribute a
  // specific fact to it. No cases, no dispositionBreakdown content (none
  // was ever computed for a tier this weak) — comparableMatterCount stays
  // 0 so the critical invariant (contextual relevance is never read as
  // comparable-matter support) holds structurally, not by convention.
  for (const [provisionId, matterKeys] of contextualMattersByProvision.entries()) {
    if (casesByProvision.has(provisionId)) continue;
    const provision = provisionById.get(provisionId);
    if (!provision) continue;
    const current = currentByProvision.get(provisionId);
    entries.push({
      provision,
      legalFunction: legalFunctionForProvision(provisionId),
      comparableMatterCount: 0,
      stronglyComparableMatterCount: 0,
      moderatelyComparableMatterCount: 0,
      contextuallyRelatedMatterCount: matterKeys.size,
      totalFindingsCount: 0,
      attributedFindingsCount: 0,
      unverifiedFindingsCount: 0,
      dispositionBreakdown: emptyDispositionBreakdown(),
      matterOutcomes: [],
      cases: [],
      currentCandidateTier: current?.tier ?? "not_currently_a_candidate",
      currentApplicabilityNote: `Cited in ${matterKeys.size} contextually related matter${matterKeys.size === 1 ? "" : "s"} (generic actor/evidence overlap only — no comparable-matter support for this specific provision).${current ? ` ${current.note}` : ""}`,
    });
  }

  // Attributed provisions sort first: an entry where at least one case is
  // positively connected to the entered facts via justifyingTags reads as
  // materially more informative than one where every case is merely
  // "cited in a comparable matter, not independently attributed" — this is
  // a display-priority choice only, never a filter (both kinds of entry
  // remain in the result either way), aimed directly at the "must not
  // dump unrelated provisions" concern: an officer scanning top-to-bottom
  // sees the attributed set first, with the cited-only set clearly
  // separated after it (see the UI, which renders these as two
  // subsections using this same attributedFindingsCount > 0 boundary).
  entries.sort(
    (a, b) =>
      Number(b.attributedFindingsCount > 0) - Number(a.attributedFindingsCount > 0) ||
      b.comparableMatterCount - a.comparableMatterCount ||
      b.contextuallyRelatedMatterCount - a.contextuallyRelatedMatterCount
  );

  return {
    matterDedupBasis:
      "Matters are deduplicated by orders.matter_id (a real, curated foreign key threaded via each finding's own orderIds) wherever at least one linked order carries one; only where none does — no order data linked at all, or the linked order(s) predate matter_id curation — does this fall back to a normalized case-name key, a disclosed, weaker proxy that can undercount (two different matters sharing a case-name string merge) but never inflates one matter's own sibling orders into independent precedents the way a case-name-only scheme could. See matterIdentityStats for exactly how many case entries used each basis.",
    matterIdentityStats: { resolvedViaMatterId, resolvedViaFallback, fallbackRecordIds },
    overallMatterCounts,
    entries,
  };
}
