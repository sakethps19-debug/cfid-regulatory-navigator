// Historical treatment across CFID cases (deterministic-engine completion
// pass; corrected in two follow-up review passes — see the defects fixed
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
// ROUND 1 defects (independent review) and how they were fixed:
//
// 1. MATTER IDENTITY. Deduplicated matters by bare case name instead of the
//    real matter model (orders.matter_id, a curated foreign key). Fixed by
//    resolveMatterKey below, which walks the finding's own orderIds to the
//    linked Order's matterId first.
// 2. HISTORICAL COMPARABILITY. Reused the precision engine's own
//    MIN_FINDING_SCORE (a single weight-3 tag) as "materially similar" —
//    too permissive. Fixed with a genuine 4-tier HistoricalComparabilityTier
//    (see assessComparability) requiring overlap on BOTH substantive
//    categories for "strongly comparable", plus a per-link justifyingTags
//    filter mirroring the precision engine's own Question-A gate.
// 3. NOTICEE-SPECIFIC OUTCOMES. Collapsed multi-noticee outcomes to one
//    representative disposition via a finality ranking. Fixed by
//    deriveMatterOutcome, which surfaces an explicit "mixed_noticee_outcome"
//    state instead.
//
// ROUND 2 defects (live-database validation) and how THIS version fixes
// each:
//
// 4. MATTER IDENTITY, remaining gap. orders.matter_id was preferred, but
//    when absent the fallback skipped straight to the FINDING's own
//    case_name text — even where the linked ORDER already carried its own
//    curated normalized_matter_name showing two findings with different
//    case names belong to one investigation (concrete example: ADANI-AC-01
//    / ADANI-MR-01, whose linked orders both already carry the identical
//    normalized_matter_name "Investigation into Hindenburg allegations wrt
//    Rehvar and Milestone in the matter of Adani Group"). resolveMatterKey
//    now has a genuine three-tier resolution: matter_id, then
//    order.normalized_matter_name (order-level curated data, never the
//    finding's own case-name text), then case-name as the true last
//    resort. Separately, a reviewed, audited migration
//    (0016_matter_identity_remediation.sql) promoted every then-fallback
//    finding in the live corpus to a real matter_id by grouping on an EXACT
//    match of the pre-existing orders.normalized_matter_name field — never
//    inferred from company-name similarity.
// 5. HISTORICAL COMPARABILITY, remaining weakness. The 4-tier system was
//    still purely categorical: a single generic transaction tag (e.g. bare
//    "related-party transaction") plus a single generic conduct tag (e.g.
//    bare "non-disclosure") could still reach "strongly comparable" even
//    though that pairing recurs across legally very different matters. Two
//    additions, both deterministic and inspectable (see
//    assessComparability):
//      (a) SPECIFICITY CAP (hasSpecificity): "strongly comparable" now
//          additionally requires either multiple matched tags in one
//          category, or at least one NON-generic tag — a lone generic
//          transaction+conduct pair caps at "moderately comparable".
//      (b) CONTRADICTION PENALTY (contradictionSignals.ts): when the
//          entered scenario affirmatively states a fact incompatible with
//          a precedent's own critical basis (e.g. "an arm's-length
//          related-party transaction" rules out a SHAM-transaction
//          precedent; "no diversion of funds" rules out a diversion
//          precedent), and that precedent's own record carries the
//          contradicted tag, its tier is demoted by one full level — this
//          is a genuinely different signal from mere silence (the scenario
//          simply not mentioning something), which is never treated as a
//          contradiction.
// 6. PRESENTATION NOISE. Even with (5)'s stricter tiering, a provision
//    could still accumulate dozens of "cited, attribution unverified" case
//    entries with equal visual weight to a handful of genuinely attributed
//    ones. Every entry now carries an explicit presentationTier (see
//    HistoricalPresentationTier in types.ts) — fact_attributed first,
//    comparable_unverified second and visually secondary,
//    contextually_related lower-priority, excluded_different normally
//    hidden and reachable only via excludedForAudit — so an officer's FIRST
//    screen answers "what was historically invoked for this fact pattern",
//    not "everything any comparable matter's finding happened to cite".
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
import { detectContradictionSignals, type ContradictionSignal } from "./contradictionSignals";
import { legalFunctionForProvision } from "@/data/curated/legal-function-classification";
import type { FindingStatus, LegalProvision, Order, OrderStage, ScenarioFinding } from "@/types/domain";
import type {
  CandidateTier,
  ContraryOnlyProvisionResult,
  GateBlockedProvisionResult,
  HistoricalComparabilityTier,
  HistoricalOrderStageClass,
  HistoricalPresentationTier,
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

// ----- Defect #1/#4 fix: matter identity, three tiers -----

/** Resolves a finding's matterKey via the strongest available identity, in
 * order: (1) the REAL matter model, orders.matter_id; (2) the linked
 * order's OWN curated orders.normalized_matter_name (order-level data,
 * never the finding's own case_name text); (3) the finding's case_name, the
 * true last resort. The three key spaces are disjoint by construction
 * (distinct prefixes) so a weaker-tier key can never collide with, or be
 * mistaken for, a stronger one. See MatterIdentityBasis in types.ts for the
 * full rationale of each tier. */
function resolveMatterKey(finding: ScenarioFinding, orderById: Map<string, Order>): { key: string; basis: MatterIdentityBasis } {
  for (const orderId of finding.orderIds) {
    const order = orderById.get(orderId);
    if (order?.matterId) return { key: `matter:${order.matterId}`, basis: "matter_id" };
  }
  for (const orderId of finding.orderIds) {
    const order = orderById.get(orderId);
    if (order?.normalizedMatterName) return { key: `ordername:${order.normalizedMatterName.trim().toLowerCase()}`, basis: "order_metadata_fallback" };
  }
  return { key: `casename:${finding.caseName.trim().toLowerCase()}`, basis: "case_name_fallback" };
}

// ----- Defect #2/#5 fix: genuine historical-comparability assessment -----

/** Transaction/conduct tags broad enough, on their own, to recur across
 * legally very different matters — a bare "related-party transaction" tag
 * says nothing about whether the RPT was genuine or a sham; a bare
 * "non-disclosure" tag says nothing about WHAT was not disclosed. A single
 * tag from this list, paired with a single tag from the other generic list
 * and nothing else, is real overlap but not meaningful SPECIFICITY — see
 * hasSpecificity and assessComparability's "strongly comparable" cap. */
const GENERIC_TRANSACTION_TAGS = new Set(["related_party_transaction"]);
const GENERIC_CONDUCT_TAGS = new Set(["non_disclosure_of_information", "fund_diversion", "financial_statement_misstatement", "director_governance_failure"]);

/** True when the finding's matched transaction/conduct overlap has
 * meaningful specificity: either multiple reinforcing tags in one
 * category, or at least one tag that is NOT on the generic lists above.
 * Only called when substantiveCategoriesMatched >= 2 (both a transaction
 * AND a conduct tag matched), so both arrays are non-empty by construction
 * whenever this actually gates the "strongly comparable" tier. */
function hasSpecificity(sf: ScoredFinding): boolean {
  const txIds = sf.matchedIdsByCategory.transactionTypes;
  const conductIds = sf.matchedIdsByCategory.allegedConduct;
  if (txIds.length >= 2 || conductIds.length >= 2) return true;
  const txSpecific = txIds.some((id) => !GENERIC_TRANSACTION_TAGS.has(id));
  const conductSpecific = conductIds.some((id) => !GENERIC_CONDUCT_TAGS.has(id));
  return txSpecific || conductSpecific;
}

function demoteOneTier(tier: HistoricalComparabilityTier): HistoricalComparabilityTier {
  if (tier === "strongly_comparable") return "moderately_comparable";
  if (tier === "moderately_comparable") return "contextually_related";
  return "weak_excluded"; // contextually_related or already weak_excluded
}

interface ComparabilityAssessment {
  tier: HistoricalComparabilityTier;
  rationale: string;
}

/** The full historical-comparability decision for ONE finding against the
 * entered scenario — deterministic, and every step recorded in `rationale`
 * rather than collapsed into a single opaque number:
 *   1. Base tier from substantive (transaction/conduct) category overlap
 *      count, exactly as the round-1 fix computed it.
 *   2. Specificity cap: "strongly comparable" additionally requires
 *      hasSpecificity (see above) — a lone generic transaction+conduct
 *      pair caps at "moderately comparable".
 *   3. Contradiction penalty: if this finding's OWN recorded tags (its
 *      full transaction/actor/conduct/evidence set, not just what overlaps
 *      the query) include any concept id the entered scenario
 *      affirmatively contradicts (see contradictionSignals.ts), the tier
 *      is demoted by one further full level. */
function assessComparability(sf: ScoredFinding, contradiction: ContradictionSignal): ComparabilityAssessment {
  if (sf.score < MIN_FINDING_SCORE) {
    return { tier: "weak_excluded", rationale: `Base factual-overlap score ${sf.score} is below the minimum comparability bar (${MIN_FINDING_SCORE}).` };
  }

  let tier: HistoricalComparabilityTier =
    sf.substantiveCategoriesMatched >= 2 ? "strongly_comparable" : sf.substantiveCategoriesMatched === 1 ? "moderately_comparable" : "contextually_related";

  const parts: string[] = [
    `Matched ${sf.matchedIdsByCategory.transactionTypes.length} transaction tag(s), ${sf.matchedIdsByCategory.allegedConduct.length} conduct tag(s), ${sf.matchedIdsByCategory.actorRoles.length} actor tag(s), ${sf.matchedIdsByCategory.evidenceTypes.length} evidence tag(s) against the entered scenario.`,
  ];

  if (tier === "strongly_comparable" && !hasSpecificity(sf)) {
    tier = "moderately_comparable";
    parts.push("Capped at moderately comparable: the only overlap is a single generic transaction tag plus a single generic conduct tag, which is not meaningful specificity on its own.");
  }

  const precedentOwnTagIds = new Set([...sf.finding.transactionTypes, ...sf.finding.actorRoles, ...sf.finding.allegedConduct, ...sf.finding.evidenceTypes]);
  const contradictedHits = [...contradiction.contradictedConceptIds].filter((id) => precedentOwnTagIds.has(id));
  if (contradictedHits.length > 0) {
    const before = tier;
    tier = demoteOneTier(tier);
    const reasons = [...new Set(contradictedHits.map((id) => contradiction.rationale.get(id)).filter((r): r is string => !!r))];
    parts.push(`Demoted from ${before} to ${tier}: this matter's own record includes ${contradictedHits.join(", ")}, which the entered scenario affirmatively rules out. ${reasons.join(" ")}`);
  }

  return { tier, rationale: parts.join(" ") };
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

/** Defect #6 fix: the officer-facing presentation hierarchy for one
 * provision entry, derived purely from its own counts (see
 * HistoricalPresentationTier in types.ts). */
function presentationTierFor(attributedFindingsCount: number, comparableMatterCount: number, contextuallyRelatedMatterCount: number): HistoricalPresentationTier {
  if (attributedFindingsCount > 0) return "fact_attributed";
  if (comparableMatterCount > 0) return "comparable_unverified";
  if (contextuallyRelatedMatterCount > 0) return "contextually_related";
  return "excluded_different";
}

export function buildHistoricalTreatment(
  effectiveConcepts: DetectedConcept[],
  scenarioFreeText: string,
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
  const contradiction = detectContradictionSignals(scenarioFreeText);

  const scored = scenarioFindings.map((f) => {
    const sf = scoreFinding(f, effectiveConcepts);
    return { sf, assessment: assessComparability(sf, contradiction) };
  });

  // Overall (whole-query) matter counts, deduplicated by matterKey,
  // independent of any single provision's own breakdown — see
  // HistoricalTreatmentResult.overallMatterCounts. Computed from the BEST
  // (highest) tier reached by any finding sharing that matterKey, since one
  // matter can have several scenario_findings rows of differing relevance.
  const TIER_RANK: Record<HistoricalComparabilityTier, number> = { strongly_comparable: 3, moderately_comparable: 2, contextually_related: 1, weak_excluded: 0 };
  const bestTierByMatter = new Map<string, HistoricalComparabilityTier>();
  const bestAssessmentByMatter = new Map<string, ComparabilityAssessment>();
  const matterCaseNameByKey = new Map<string, string>();
  let resolvedViaMatterId = 0;
  let resolvedViaOrderMetadata = 0;
  let resolvedViaCaseName = 0;
  const caseNameFallbackRecordIds: string[] = [];
  for (const { sf, assessment } of scored) {
    const { key, basis } = resolveMatterKey(sf.finding, orderById);
    if (!matterCaseNameByKey.has(key)) matterCaseNameByKey.set(key, sf.finding.caseName);
    if (basis === "matter_id") resolvedViaMatterId++;
    else if (basis === "order_metadata_fallback") resolvedViaOrderMetadata++;
    else {
      resolvedViaCaseName++;
      caseNameFallbackRecordIds.push(sf.finding.recordId);
    }
    const existing = bestTierByMatter.get(key);
    if (!existing || TIER_RANK[assessment.tier] > TIER_RANK[existing]) {
      bestTierByMatter.set(key, assessment.tier);
      bestAssessmentByMatter.set(key, assessment);
    }
  }
  const overallMatterCounts = { stronglyComparable: 0, moderatelyComparable: 0, contextuallyRelated: 0, weakExcluded: 0 };
  const excludedForAudit: { matterKey: string; caseName: string; reason: string }[] = [];
  for (const [matterKey, tier] of bestTierByMatter.entries()) {
    if (tier === "strongly_comparable") overallMatterCounts.stronglyComparable++;
    else if (tier === "moderately_comparable") overallMatterCounts.moderatelyComparable++;
    else if (tier === "contextually_related") overallMatterCounts.contextuallyRelated++;
    else {
      overallMatterCounts.weakExcluded++;
      excludedForAudit.push({
        matterKey,
        caseName: matterCaseNameByKey.get(matterKey) ?? "(unknown)",
        reason: bestAssessmentByMatter.get(matterKey)?.rationale ?? "Below the minimum comparability bar.",
      });
    }
  }

  // Contextually-related findings never contribute a case entry (see
  // header comment, defect #2), but a provision's own card should still
  // disclose how many such matters ALSO happened to cite it — tracked here
  // as matter KEYS per provision id (never case entries, never attribution
  // status, since a contextually-related match carries no substantive
  // fact connection to hang either claim on).
  const contextualMattersByProvision = new Map<string, Set<string>>();
  for (const { sf, assessment } of scored) {
    if (assessment.tier !== "contextually_related") continue;
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
  for (const { sf, assessment } of scored) {
    if (assessment.tier !== "strongly_comparable" && assessment.tier !== "moderately_comparable") continue;
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
      const bestAssessment = bestAssessmentByMatter.get(matterKey);
      if (tier === "strongly_comparable") stronglyComparableMatterCount++;
      else moderatelyComparableMatterCount++;
      // Ranking-only score (never crosses a tier boundary — see
      // comparabilityScore's own doc comment in types.ts): the highest
      // scoreFinding score among this matter's own scored findings.
      const matterScore = Math.max(
        0,
        ...scored.filter(({ sf }) => resolveMatterKey(sf.finding, orderById).key === matterKey).map(({ sf }) => sf.score)
      );
      matterOutcomes.push({
        matterKey,
        matterIdBasis: matterCases[0].matterIdBasis,
        caseName: matterCases[0].caseName,
        comparabilityTier: tier,
        comparabilityRationale: bestAssessment?.rationale ?? "",
        comparabilityScore: matterScore,
        outcome,
        cases: matterCases,
      });
    }
    matterOutcomes.sort((a, b) => TIER_RANK[b.comparabilityTier] - TIER_RANK[a.comparabilityTier] || b.comparabilityScore - a.comparabilityScore || b.cases.length - a.cases.length);

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
      presentationTier: presentationTierFor(attributedFindingsCount, comparableMatterCount, contextuallyRelatedMatterCount),
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
      presentationTier: "contextually_related",
    });
  }

  // Attributed provisions sort first, then comparable-unverified, then
  // contextually-related — the SAME presentationTier boundary the UI
  // renders as three (four, counting the audit-only excluded view)
  // separate sections, so an officer scanning top-to-bottom always sees
  // the strongest section first. Within a tier, sorted by matter counts.
  const PRESENTATION_RANK: Record<HistoricalPresentationTier, number> = { fact_attributed: 3, comparable_unverified: 2, contextually_related: 1, excluded_different: 0 };
  entries.sort(
    (a, b) =>
      PRESENTATION_RANK[b.presentationTier] - PRESENTATION_RANK[a.presentationTier] ||
      b.comparableMatterCount - a.comparableMatterCount ||
      b.contextuallyRelatedMatterCount - a.contextuallyRelatedMatterCount
  );

  return {
    matterDedupBasis:
      "Matters are deduplicated in three tiers, strongest first: (1) orders.matter_id, a real curated foreign key threaded via each finding's own orderIds; (2) where no linked order carries a matter_id, that order's OWN curated normalized_matter_name (never the finding's case-name text); (3) only where neither exists, a normalized case-name key as the true last resort. See matterIdentityStats for exactly how many case entries used each tier.",
    matterIdentityStats: { resolvedViaMatterId, resolvedViaOrderMetadata, resolvedViaCaseName, caseNameFallbackRecordIds },
    overallMatterCounts,
    excludedForAudit,
    entries,
  };
}
