import type { FindingStatus, LegalProvision, LegalTest, Order, ProvisionVersion, ScenarioFinding } from "@/types/domain";
import { CONCEPT_TAGS, CONTRARY_PRECEDENT_TRIGGER_TAGS, type ConceptKind } from "@/data/curated/concept-tags";
import { ALWAYS_ON_INTERIM_GUARDRAIL, GUARDRAIL_TRIGGERS } from "@/data/curated/guardrail-triggers";
import { detectConcepts, type DetectedConcept } from "./conceptExtraction";
import { applySemanticAssist } from "./fuzzyMatch";
import { passesRetrievalGate, retrievalRuleForProvision } from "@/data/curated/provision-retrieval-rules";
import { legalFunctionForProvision, isPrimaryCapable } from "@/data/curated/legal-function-classification";
import { actorRuleForProvision } from "@/data/curated/provision-actor-applicability";
import { buildHistoricalTreatment } from "./historicalTreatment";
import type {
  ActorApplicability,
  AnalysisResult,
  ConfidenceLevel,
  ContraryOnlyProvisionResult,
  GateBlockedProvisionResult,
  GuardrailNote,
  MatchedByCategory,
  PrecedentRef,
  ProvisionResult,
  ScenarioCompleteness,
  ScenarioQuery,
} from "./types";
import { formatDate } from "@/lib/formatDate";
import { EXCLUDED_PUBLICATION_STATUSES } from "@/lib/publicationLifecycle";

// Draft, Quarantined and Withdrawn findings are excluded from the matching
// engine entirely — not merely down-ranked — per the publication/quarantine
// lifecycle (scenario_findings.publication_status). "Published with
// warning" is deliberately still included: the UI must show the warning
// visibly on that precedent rather than hiding it, since silently excluding
// it would be no different from quietly disagreeing with an officer's own
// decision to keep it visible with a caution attached. See
// src/lib/publicationLifecycle.ts, the single source of truth for this set.

// Every symbol below was previously defined directly in this file; moved to
// scoring.ts (deterministic-engine completion pass) so historicalTreatment.ts
// can share the exact same factual-overlap scoring without a circular import
// (historicalTreatment.ts is called FROM this file). Re-exported here so
// every existing import of these names from "@/lib/matching/engine" keeps
// working unchanged — see scoring.ts for the full definitions and comments.
import {
  NEGATIVE_STATUSES,
  UPHELD_STATUSES,
  UNRESOLVED_STATUSES,
  MIN_FINDING_SCORE,
  isFinalOrderFinding,
  supportCategory,
  effectiveLinkStatus,
  compareByFactualScoreThenFinality,
  unique,
  scoreFinding,
  additionalPrecedentFactsNotMatched,
  type SupportCategory,
  type ScoredFinding,
} from "./scoring";
export { isFinalOrderFinding, supportCategory, effectiveLinkStatus, compareByFactualScoreThenFinality, scoreFinding, type SupportCategory, type ScoredFinding };

/** The single canonical list of concepts this query asserts, merging
 * free-text detection with the officer's explicit dropdown selections
 * (actor role / scenario type / evidence indicator). Every downstream
 * step — scoring, matched-ingredient display, justifyingTags checks,
 * contrary-precedent matching, evidence presentation — reads from this
 * one list, so a dropdown selection can never diverge from what typing
 * the same fact in free text would have produced (previously, a
 * dropdown selection added an ad hoc score bonus but was invisible in
 * "matched factual ingredients"/"why relevant" unless the same fact was
 * ALSO independently free-text-detected — a real transparency gap, since
 * fixed here).
 *
 * A dropdown selection is architecturally a SIGNAL, not an exclusionary
 * filter: it asserts a fact about the entered scenario exactly as if the
 * officer had typed it, and is scored on exactly the same per-category
 * weight as free-text detection (see scoreFinding) — it never removes a
 * finding that fails to match it. Already-detected ids are not
 * duplicated. Unrecognized signal ids (not present in CONCEPT_TAGS) are
 * silently ignored rather than throwing, since this is fed directly from
 * user-controlled dropdown values. */
export function buildEffectiveScenarioConcepts(
  detected: DetectedConcept[],
  actorSignal: string | null,
  scenarioTypeSignal: string | null,
  evidenceSignal: string | null
): DetectedConcept[] {
  const merged = [...detected];
  const seenIds = new Set(detected.map((c) => c.id));
  for (const signalId of [actorSignal, scenarioTypeSignal, evidenceSignal]) {
    if (!signalId || seenIds.has(signalId)) continue;
    const tag = CONCEPT_TAGS.find((t) => t.id === signalId);
    if (!tag) continue;
    merged.push({ id: tag.id, kind: tag.kind, label: tag.label, matchedPhrases: [], sentenceIndices: [] });
    seenIds.add(tag.id);
  }
  return merged;
}

function buildDistinguishingNote(finding: ScenarioFinding): string | undefined {
  if (!NEGATIVE_STATUSES.has(finding.findingStatus)) return undefined;
  const parts: string[] = [];
  if (finding.qualification) parts.push(finding.qualification);
  if (finding.evidentiaryGaps.length > 0) {
    parts.push(`Facts on record that distinguished this matter: ${finding.evidentiaryGaps.join("; ")}.`);
  }
  let note: string;
  if (parts.length === 0) {
    note = `This precedent (${finding.recordId}) was not confirmed in a final order on its own facts; it should be examined for whether the same distinguishing factors are present before being treated as controlling here.`;
  } else {
    note = `This precedent may be distinguishable on the following grounds: ${parts.join(" ")}`;
  }
  // Respect source/citation verification status: never silently hide an
  // unverified contrary precedent, but flag it so the officer knows this
  // specific record's own data has not yet been independently checked
  // against the source order.
  if (!finding.sourceDocumentVerified || !finding.paragraphCitationVerified) {
    note += ` This precedent's source document and/or paragraph citation has not yet been independently verified.`;
  }
  return note;
}

function buildApplicableVersionNote(versions: ProvisionVersion[]): string {
  if (versions.length === 0) {
    return "No provision-version record on file: the in-force text should be verified directly against the official SEBI or MCA source before any reliance is placed on it.";
  }
  const verified = versions.filter((v) => v.status === "officially_verified" && v.effectiveFrom);
  if (verified.length > 0) {
    const v = verified[verified.length - 1];
    const base = `Applicable version: ${v.versionLabel} (effective ${formatDate(v.effectiveFrom)}${v.effectiveTo ? ` to ${formatDate(v.effectiveTo)}` : " onward"}), officially verified.`;
    // Second-order remediation: a SINGLE catalogued version with no
    // verified (or even order-cited) predecessor is a genuine gap, not
    // evidence the wording has always read this way. Most orders in this
    // corpus concern conduct that may predate this version's effective
    // date; silently presenting only the current text risks applying a
    // post-amendment reading to pre-amendment conduct without saying so.
    if (versions.length === 1) {
      return `${base} This is the only version of this provision currently catalogued; if the conduct being examined predates ${formatDate(v.effectiveFrom)}, the wording in force at that time has not been independently verified and should not be assumed identical.`;
    }
    return base;
  }
  const orderCited = versions.find((v) => v.status === "order_cited_text_only" && v.exactText);
  if (orderCited) {
    return `Text on file is extracted verbatim from a CFID order (${orderCited.versionLabel}) and has not been independently checked against the official source; it should not be assumed to be the current in-force text; the official source should be confirmed before any reliance is placed on it.`;
  }
  return "The version of this provision applicable at the time of the conduct in question has not been independently verified; the current statutory text should not be assumed to have applied; the official source should be confirmed before any reliance is placed on it.";
}

// Defense in depth: evidentiaryGaps must only ever contain genuine
// outstanding evidence for the PRESENT scenario, never a note about a cited
// precedent's own historical outcome (that belongs in
// ScenarioFinding.precedentOutcomeNote, shown separately). This guard
// strips any such note out of the missing-facts checklist even if curated
// data were ever mis-entered again, so "None outstanding" can never sit
// alongside genuine outstanding items.
function isGenuineEvidentiaryGap(text: string): boolean {
  return !/^none outstanding/i.test(text.trim());
}

function toPrecedentRef(sf: ScoredFinding, linkRelationship?: string): PrecedentRef {
  return {
    finding: sf.finding,
    effectiveStatus: effectiveLinkStatus(sf.finding.findingStatus, linkRelationship),
    score: sf.score,
    matchedFactualIngredients: sf.matchedIngredients,
    matchedByCategory: sf.matchedByCategory,
    additionalPrecedentFactsNotMatched: additionalPrecedentFactsNotMatched(sf.finding, sf.matchedIngredients),
    distinguishingNote: buildDistinguishingNote(sf.finding),
  };
}

function mergeMatchedByCategory(refs: { matchedByCategory: MatchedByCategory }[]): MatchedByCategory {
  return {
    transactionTypes: unique(refs.flatMap((r) => r.matchedByCategory.transactionTypes)),
    actorRoles: unique(refs.flatMap((r) => r.matchedByCategory.actorRoles)),
    allegedConduct: unique(refs.flatMap((r) => r.matchedByCategory.allegedConduct)),
    evidenceTypes: unique(refs.flatMap((r) => r.matchedByCategory.evidenceTypes)),
  };
}

/** Derives the officer-facing factual-overlap tier (High/Medium/Low,
 * displayed as "Strong/Moderate/Limited factual overlap" — see
 * matchStrengthDisplay.ts) PURELY from how many independent factual
 * categories (transaction type, actor role, conduct, evidence) overlap.
 * This is one of three deliberately independent dimensions this engine
 * exposes about a precedent — the other two are its procedural stage
 * (final/interim/etc, via isFinalOrderFinding) and its historical
 * disposition (confirmed/not confirmed/unresolved, via the finding's own
 * findingStatus, both already shown separately through StatusBadge /
 * findingStatusLabel). Neither of those may influence the tier computed
 * here: a precedent's procedural stage or disposition never makes its
 * FACTS more or less similar to the entered scenario, only how much
 * weight to give that similarity — a judgment call left to the officer,
 * informed by the separately-shown stage/disposition, not pre-decided by
 * collapsing everything into one number. (This function previously also
 * used isFinalOrderFinding to unlock the High tier and UNRESOLVED_STATUSES
 * to force a hard cap at Low — both removed for exactly this reason.) */
function deriveConfidence(best: ScoredFinding, supportCount: number, effectiveStatus: FindingStatus = best.finding.findingStatus): { level: ConfidenceLevel; reasons: string[] } {
  const reasons: string[] = [];
  reasons.push(`${best.categoriesMatched} independent factual categories (transaction type, actor role, conduct, evidence) overlap with the facts stated.`);
  if (supportCount > 1) reasons.push(`${supportCount} scenario findings support this provision.`);
  reasons.push(
    `This reflects factual overlap only; it says nothing about this precedent's own procedural stage or historical disposition, shown separately above and never used to compute this figure.`
  );
  if (UNRESOLVED_STATUSES.has(effectiveStatus)) {
    reasons.push(
      `Separately: the strongest matching precedent carries the status "${effectiveStatus}"${effectiveStatus !== best.finding.findingStatus ? ` for this specific provision (its overall finding status is "${best.finding.findingStatus}")` : ""}, no determination has been reached on the merits either way. That is a fact about the precedent's own disposition, not about how closely its facts resemble the entered scenario, so it does not change the factual-overlap figure above, but it should weigh heavily in how much this precedent is relied on.`
    );
  }

  let level: ConfidenceLevel;
  if (best.categoriesMatched >= 3 && best.score >= 9) {
    level = "High";
  } else if (best.substantiveCategoriesMatched >= 2) {
    level = "Medium";
  } else {
    level = "Low";
    if (best.categoriesMatched > best.substantiveCategoriesMatched) {
      reasons.push(
        "Beyond that, the overlap is confined to actor role and/or evidence type: a shared actor (e.g. a promoter) or evidence type recurs across many unrelated violations and is a weak signal on its own; what this precedent specifically required, and whether the facts stated establish it, should be examined."
      );
    } else {
      reasons.push("Only a single factual category overlaps; this should be treated as a weak signal requiring further review.");
    }
  }
  return { level, reasons };
}

// Conduct tags describing HOW money moved, with no inherent connection to
// the securities market or the investing public on their own — unlike tags
// such as fictitious_sales_or_revenue or non_disclosure_of_information,
// which directly implicate what investors were told or shown. When the
// ONLY matched ingredients driving a match are these, and the provision is
// a broad securities-fraud clause (PFUTP 3/4, SEBI Act 12A), the pairing
// can look like a mismatch to a reader expecting those provisions to be
// about securities trading specifically — even where the cited precedent's
// own order drew that connection itself (e.g. an undisclosed diversion
// found to misrepresent the company's true financial position to the
// investing public). buildWhyRelevant makes that link explicit instead of
// leaving the reader to wonder why a pure fund-movement fact pattern
// attracted a securities-fraud provision.
const PURE_FUND_MOVEMENT_TAGS = new Set([
  "fund_diversion",
  "circular_fund_movement",
  "fund_routed_personal_account",
  "fund_transfer_personal_account",
  "fund_transfer_promoter_entity",
]);

function isBroadSecuritiesFraudProvision(provisionId: string): boolean {
  return /^(PFUTP-3|PFUTP-4|SEBI-ACT-12A|SEBI-ACT-11-2-e)/.test(provisionId);
}

/** Human-readable explanation of why a globally-retrieved contrary
 * precedent passed the material-relevance test — the categorised overlap
 * that earned it a place in the result, never a bare score. */
function buildMaterialRelevanceNote(sf: ScoredFinding): string {
  const categories: string[] = [];
  if (sf.matchedByCategory.transactionTypes.length > 0) {
    categories.push(`transaction type (${sf.matchedByCategory.transactionTypes.join("; ")})`);
  }
  if (sf.matchedByCategory.allegedConduct.length > 0) {
    categories.push(`alleged conduct (${sf.matchedByCategory.allegedConduct.join("; ")})`);
  }
  if (sf.matchedByCategory.actorRoles.length > 0) {
    categories.push(`actor role (${sf.matchedByCategory.actorRoles.join("; ")})`);
  }
  if (sf.matchedByCategory.evidenceTypes.length > 0) {
    categories.push(`evidence type (${sf.matchedByCategory.evidenceTypes.join("; ")})`);
  }
  return `Retrieved because the entered facts materially overlap with this precedent on: ${categories.join("; ")}.`;
}

function buildWhyRelevant(provision: LegalProvision, best: ScoredFinding): string {
  const ingredientText = best.matchedIngredients.length > 0 ? best.matchedIngredients.join("; ") : "the general subject matter";
  let text =
    `On a prima facie reading, the facts stated share factual ingredients with a prior CFID scenario finding ` +
    `(${best.finding.recordId}) considered in terms of this provision, namely: ${ingredientText}. ` +
    `This is a prima facie similarity only and does not, by itself, establish that the provision applies.`;

  const matchedOnlyFundMovement = best.matchedIds.length > 0 && best.matchedIds.every((id) => PURE_FUND_MOVEMENT_TAGS.has(id));
  if (matchedOnlyFundMovement && isBroadSecuritiesFraudProvision(provision.id)) {
    text +=
      ` This provision is a general securities-fraud clause and is not confined to fund movement as such; it is cited ` +
      `here because the underlying order treated the fund movement in ${best.finding.recordId} as fraud in connection ` +
      `with dealing in securities (for instance, by misrepresenting the Company's true financial position to investors), ` +
      `and not on the footing that fund movement alone attracts it. The source order should be examined for the specific basis before any reliance is placed on this.`;
  }
  return text;
}

/** Actor/noticee-specific candidate retrieval (deterministic-engine
 * completion pass). Checks a provision's own actor-applicability rule (see
 * data/curated/provision-actor-applicability.ts) against the entered
 * scenario's stated actor concepts. This is NOT a liability-determination
 * engine — it never decides who is actually liable, only whether the
 * CANDIDATE itself should be shown as applicable, flagged as needing actor
 * verification, or withheld because the only actor(s) named are
 * incompatible with what this provision's own text requires (e.g. a
 * Compliance Officer-specific provision must not surface merely because a
 * promoter is named elsewhere in the matter). A provision with no rule is
 * "not_actor_specific" — completely unaffected, identical to before this
 * pass. */
function checkActorApplicability(provisionId: string, effectiveConcepts: DetectedConcept[]): ActorApplicability {
  const rule = actorRuleForProvision(provisionId);
  if (!rule) return { status: "not_actor_specific", note: null };
  const statedActorConcepts = effectiveConcepts.filter((c) => c.kind === "actor");
  if (statedActorConcepts.length === 0) {
    return {
      status: "requires_verification",
      note: `Actor applicability requires verification: this provision's own obligation runs to ${rule.actorDescription}. The entered facts do not identify which actor is involved, so this is shown as a candidate without an actor determination — it should not be relied on against any specific individual until that is confirmed.`,
    };
  }
  const compatible = statedActorConcepts.some((c) => rule.applicableActorTags.includes(c.id));
  if (compatible) return { status: "compatible", note: null };
  const namedActors = unique(statedActorConcepts.map((c) => c.label)).join(", ");
  return {
    status: "incompatible",
    note: `This provision's own obligation runs to ${rule.actorDescription}. The actor(s) identified in the entered facts (${namedActors}) do not fall within that category on the facts as stated.`,
  };
}

/** See CandidateTier in types.ts — a provision that has already passed both
 * the factual retrieval gate and the actor-applicability check is either a
 * "primary_candidate" (its own legal function can anchor a charge) or a
 * "related_ancillary" one (a general principle, penalty, attribution
 * mechanism, SEBI power or bare definition riding on some other
 * established violation) — never presented as equivalent. */
function deriveCandidateTier(legalFunction: ReturnType<typeof legalFunctionForProvision>): "primary_candidate" | "related_ancillary" {
  return isPrimaryCapable(legalFunction) ? "primary_candidate" : "related_ancillary";
}

export function analyzeScenario(
  query: ScenarioQuery,
  scenarioFindings: ScenarioFinding[],
  provisions: LegalProvision[],
  legalTests: LegalTest[],
  provisionVersionsByProvisionId: Map<string, ProvisionVersion[]> = new Map(),
  fullTextCandidates: ScenarioFinding[] = [],
  /** Optional Order[] data (see types/domain.ts) used ONLY by the
   * historical-treatment view (buildHistoricalTreatment) to classify each
   * comparable case's order stage (interim/confirmatory/final WTM/
   * adjudication/SAT-Supreme Court) precisely via Order.orderStage. Defaults
   * to empty so every existing call site (tests, the blind-validation
   * suites) remains valid without updating — historicalTreatment then falls
   * back to a coarser, disclosed classification. See historicalTreatment.ts. */
  orders: Order[] = []
): AnalysisResult {
  // Semantic-assist pre-pass: fix likely typos against the curated
  // vocabulary before concept detection runs, so a scenario like
  // "prefrential allotment" is still read as "preferential allotment". Never
  // used for anything shown back to the user as their entered text (query
  // below still carries the original, untouched freeText) — only for
  // concept detection, and every correction made is returned in the result
  // so the UI can disclose it.
  const { correctedText, corrections } = applySemanticAssist(query.freeText);
  const detected = detectConcepts(correctedText);
  const actorSignal = query.actorSignal || null;
  const scenarioTypeSignal = query.scenarioTypeSignal || null;
  const evidenceSignal = query.evidenceSignal || null;
  // The single canonical concept list every downstream step below reads
  // from — see buildEffectiveScenarioConcepts. detectedIds (used for
  // justifyingTags gating and the fund-movement-only check in
  // buildWhyRelevant) is deliberately drawn from this merged list too,
  // not from `detected` alone, so a dropdown-selected fact is treated
  // identically to the same fact typed in free text everywhere, not just
  // in scoring.
  const effectiveConcepts = buildEffectiveScenarioConcepts(detected, actorSignal, scenarioTypeSignal, evidenceSignal);
  const detectedIds = new Set(effectiveConcepts.map((c) => c.id));

  // Publication/quarantine lifecycle: Draft, Quarantined and Withdrawn
  // findings never reach the matching engine, in either the deterministic
  // path or the full-text supplemental search below — see
  // EXCLUDED_PUBLICATION_STATUSES.
  const publishedScenarioFindings = scenarioFindings.filter((f) => !EXCLUDED_PUBLICATION_STATUSES.has(f.publicationStatus));
  const publishedFullTextCandidates = fullTextCandidates.filter((f) => !EXCLUDED_PUBLICATION_STATUSES.has(f.publicationStatus));

  const scored = publishedScenarioFindings
    .map((f) => scoreFinding(f, effectiveConcepts))
    .filter((s) => s.score >= MIN_FINDING_SCORE)
    .sort(compareByFactualScoreThenFinality);

  // A category counts as "detected" either from free-text concept
  // detection or from the officer explicitly selecting the corresponding
  // dropdown — selecting a dropdown value is itself a stated fact, not
  // merely a search narrower (see buildEffectiveScenarioConcepts). Order
  // matches the UI's own category order.
  const ALL_KINDS: ConceptKind[] = ["transaction", "actor", "conduct", "evidence"];
  const detectedKindSet = new Set<ConceptKind>(effectiveConcepts.map((c) => c.kind));
  const completeness: ScenarioCompleteness = {
    detected: ALL_KINDS.filter((k) => detectedKindSet.has(k)),
    notStated: ALL_KINDS.filter((k) => !detectedKindSet.has(k)),
  };

  // Group by provision id — a provision is only surfaced if at least one
  // finding that actually matched the scenario's facts is tagged with it.
  // This prevents suggesting a provision merely because it appeared
  // somewhere in the same order. Each finding-provision link additionally
  // carries its own justifyingTags (see ScenarioFinding.provisionLinks):
  // when non-empty, that specific link only applies when the query's
  // detected concepts intersect it — used for provisions whose entire
  // subject is one narrow procedural/governance topic (e.g. LODR Regulation
  // 6, Compliance Officer appointment) that frequently gets bundled into the
  // same finding record as an unrelated, more serious allegation. An empty
  // justifyingTags (the default) means the link is universal, same as
  // before — most provisions (including all the broad anti-fraud clauses
  // like PFUTP 3(a)-(d)) are never narrowed.
  // Provision-level retrieval gate (P0 provision-precision remediation): a
  // SECOND, independent check applied on top of the per-link justifyingTags
  // check above, never a replacement for it. justifyingTags is per-LINK
  // curated data (currently empty, i.e. "universal", for every one of the
  // 498 live PFUTP/SEBI-Act-12A finding-provision links — see
  // provision-retrieval-rules.ts); the gate below is per-PROVISION curated
  // legal reasoning about the minimum facts a provision's own text
  // requires, and applies regardless of what any individual link's
  // justifyingTags says. A provision with no rule (the large majority —
  // LODR, Ind AS, investigation/governance provisions, etc.) is completely
  // unaffected: gatedOut is always false for it, and behavior is identical
  // to before this pass.
  // Each entry pairs the scored finding with the specific link's own
  // finding_provisions.relationship (see effectiveLinkStatus above) and the
  // resulting effective status for THIS provision — a multi-provision
  // finding can carry a different disposition per linked provision than its
  // own overall findingStatus.
  interface LinkedFinding {
    sf: ScoredFinding;
    relationship?: string;
    effStatus: FindingStatus;
  }
  // Actor-applicability is computed ONCE per provision id per query (it
  // depends only on the provision and the entered scenario's actor
  // concepts, never on which specific historical link is being checked),
  // so it is cached here rather than recomputed per link.
  const actorApplicabilityCache = new Map<string, ActorApplicability>();
  function getActorApplicability(provisionId: string): ActorApplicability {
    let cached = actorApplicabilityCache.get(provisionId);
    if (!cached) {
      cached = checkActorApplicability(provisionId, effectiveConcepts);
      actorApplicabilityCache.set(provisionId, cached);
    }
    return cached;
  }

  const findingsByProvision = new Map<string, LinkedFinding[]>();
  const gateBlockedFindingsByProvision = new Map<string, ScoredFinding[]>();
  // Tracks WHY each gate-blocked provision was blocked (see
  // GateBlockedProvisionResult.blockReason) — a provision can be blocked by
  // its factual retrieval prerequisite, by actor incompatibility, or (rare)
  // both, and the officer-facing note must say which, never conflate them.
  const blockReasonByProvision = new Map<string, "factual_prerequisite" | "actor_incompatibility" | "both">();
  for (const sf of scored) {
    for (const link of sf.finding.provisionLinks) {
      if (link.justifyingTags.length > 0 && !link.justifyingTags.some((t) => detectedIds.has(t))) continue;
      const rule = retrievalRuleForProvision(link.provisionId);
      const factualBlocked = !!rule && !passesRetrievalGate(rule, effectiveConcepts);
      const actorBlocked = getActorApplicability(link.provisionId).status === "incompatible";
      if (factualBlocked || actorBlocked) {
        const reason: "factual_prerequisite" | "actor_incompatibility" | "both" =
          factualBlocked && actorBlocked ? "both" : factualBlocked ? "factual_prerequisite" : "actor_incompatibility";
        const existingReason = blockReasonByProvision.get(link.provisionId);
        blockReasonByProvision.set(link.provisionId, !existingReason || existingReason === reason ? reason : "both");
        gateBlockedFindingsByProvision.set(link.provisionId, [...(gateBlockedFindingsByProvision.get(link.provisionId) ?? []), sf]);
        continue;
      }
      const entry: LinkedFinding = { sf, relationship: link.relationship, effStatus: effectiveLinkStatus(sf.finding.findingStatus, link.relationship) };
      findingsByProvision.set(link.provisionId, [...(findingsByProvision.get(link.provisionId) ?? []), entry]);
    }
  }

  // Provisions blocked by either gate above are never silently dropped: a
  // factually similar historical matter that also happened to involve (say)
  // a PFUTP finding, or one whose only stated actor is incompatible with a
  // Compliance Officer-specific provision, is still information worth an
  // officer knowing about — just not as a "this provision may apply"
  // candidate. Same never-silently-drop principle already applied to
  // contrary-only provisions (see contraryOnlyProvisionResults below).
  const gateBlockedProvisionResults: GateBlockedProvisionResult[] = [];
  for (const [provisionId, findings] of gateBlockedFindingsByProvision.entries()) {
    const provision = provisions.find((p) => p.id === provisionId);
    if (!provision) continue;
    const rule = retrievalRuleForProvision(provisionId);
    const reason = blockReasonByProvision.get(provisionId) ?? "factual_prerequisite";
    const actorApplicability = getActorApplicability(provisionId);
    const sortedFindings = [...findings].sort(compareByFactualScoreThenFinality);
    const countPhrase = `${findings.length} structured finding${findings.length > 1 ? "s" : ""} factually overlapping this scenario also cite ${provision.provisionNumber}`;
    let note: string;
    if (reason === "factual_prerequisite") {
      note = `${countPhrase}, but the facts entered do not include what this provision's own text requires: ${rule?.explanation ?? ""} This provision is not shown as potentially relevant on the present facts; the underlying order(s) should still be examined if the missing facts turn out to be present.`;
    } else if (reason === "actor_incompatibility") {
      note = `${countPhrase}, but ${actorApplicability.note} This provision is not shown as potentially relevant on the present facts; the underlying order(s) should still be examined if a compatible actor turns out to be involved.`;
    } else {
      note = `${countPhrase}, but neither the facts this provision's own text requires (${rule?.explanation ?? ""}) nor a compatible actor (${actorApplicability.note}) are stated. This provision is not shown as potentially relevant on the present facts.`;
    }
    gateBlockedProvisionResults.push({
      provision,
      relatedFactualPrecedents: sortedFindings.slice(0, 3).map((sf) => toPrecedentRef(sf)),
      gateExplanation: rule?.explanation ?? "",
      note,
      legalFunction: legalFunctionForProvision(provisionId),
      candidateTier: "requires_additional_fact",
      blockReason: reason,
    });
  }
  gateBlockedProvisionResults.sort((a, b) =>
    compareByFactualScoreThenFinality(a.relatedFactualPrecedents[0], b.relatedFactualPrecedents[0])
  );

  const provisionResults: ProvisionResult[] = [];
  const contraryOnlyProvisionResults: ContraryOnlyProvisionResult[] = [];
  for (const [provisionId, findings] of findingsByProvision.entries()) {
    const provision = provisions.find((p) => p.id === provisionId);
    if (!provision) continue;

    const supporting = findings.filter((f) => !NEGATIVE_STATUSES.has(f.effStatus));
    // A contrary precedent must carry real material weight, not merely a
    // weak evidence-type/actor-role overlap (weight 1-2 categories that
    // recur across many unrelated matters) — require the same substantive
    // (transaction-type or conduct) overlap that anchors supporting
    // precedents. See the same requirement applied to the independent
    // global contrary-precedent search below (isMateriallyRelevantContrary).
    // A link recorded "not_upheld" for THIS provision specifically (even on
    // a finding whose overall findingStatus is positive elsewhere) also
    // counts as contrary here via effStatus — see effectiveLinkStatus.
    const contrary = findings.filter((f) => NEGATIVE_STATUSES.has(f.effStatus) && f.sf.substantiveCategoriesMatched >= 1);
    if (supporting.length === 0) {
      // This provision matched ONLY contrary findings for this scenario —
      // never silently dropped: a provision considered and NOT confirmed
      // on materially similar facts elsewhere is itself information an
      // officer needs, surfaced as a distinct caution signal rather than
      // folded into (or confused with) "potentially relevant" results.
      if (contrary.length > 0) {
        contraryOnlyProvisionResults.push({
          provision,
          contraryPrecedents: contrary.slice(0, 3).map((f) => toPrecedentRef(f.sf, f.relationship)),
          note: `No supporting precedent for this provision was identified in the currently structured corpus for this scenario. ${contrary.length} materially comparable precedent${contrary.length > 1 ? "s were" : " was"} found where this provision was considered and NOT confirmed on similar facts, so this provision may warrant caution rather than reliance, and the underlying order(s) should be examined for whether the same distinguishing factors are present here.`,
          legalFunction: legalFunctionForProvision(provisionId),
          candidateTier: "historical_precedent_only",
        });
      }
      continue;
    }

    // Prefer the highest-scoring RESOLVED finding (anything other than
    // Alleged/Inconclusive/Procedural observation) as the anchor for
    // confidence — a genuinely upheld precedent should not be shadowed by a
    // higher-scoring but merely-alleged one for the same provision. Only
    // fall back to the raw top-scoring finding when every supporting finding
    // is unresolved, in which case deriveConfidence caps confidence at Low.
    const best = supporting.find((s) => !UNRESOLVED_STATUSES.has(s.effStatus)) ?? supporting[0];
    const { level, reasons } = deriveConfidence(best.sf, supporting.length, best.effStatus);
    const provisionVersions = provisionVersionsByProvisionId.get(provisionId) ?? [];
    const upheld = findings.filter((f) => UPHELD_STATUSES.has(f.effStatus));
    const legalFunction = legalFunctionForProvision(provisionId);

    provisionResults.push({
      provision,
      whyRelevant: buildWhyRelevant(provision, best.sf),
      matchedFactualIngredients: unique(supporting.flatMap((s) => s.sf.matchedIngredients)),
      matchedByCategory: mergeMatchedByCategory(supporting.map((s) => s.sf)),
      supportingPrecedents: supporting.slice(0, 3).map((f) => toPrecedentRef(f.sf, f.relationship)),
      contraryPrecedents: contrary.slice(0, 3).map((f) => toPrecedentRef(f.sf, f.relationship)),
      upheldPrecedents: upheld.slice(0, 5).map((f) => toPrecedentRef(f.sf, f.relationship)),
      statusesSeen: unique(findings.map((f) => f.effStatus)),
      confidence: level,
      confidenceReasons: reasons,
      // Kept per-precedent (see MissingFactsForPrecedent) rather than
      // flattened into one shared list — two different supporting
      // precedents for the same provision can require different things,
      // and a flat merge would present precedent B's own evidentiary gap
      // as if it were a universal requirement of the provision itself.
      missingFacts: supporting
        .map((s) => ({
          recordId: s.sf.finding.recordId,
          scenarioTitle: s.sf.finding.scenarioTitle,
          gaps: unique(s.sf.finding.evidentiaryGaps.filter(isGenuineEvidentiaryGap)),
        }))
        .filter((m) => m.gaps.length > 0),
      provisionVersions,
      applicableVersionNote: buildApplicableVersionNote(provisionVersions),
      legalFunction,
      candidateTier: deriveCandidateTier(legalFunction),
      actorApplicability: getActorApplicability(provisionId),
    });
  }

  provisionResults.sort((a, b) => compareByFactualScoreThenFinality(a.supportingPrecedents[0], b.supportingPrecedents[0]));
  contraryOnlyProvisionResults.sort((a, b) =>
    compareByFactualScoreThenFinality(a.contraryPrecedents[0], b.contraryPrecedents[0])
  );

  // Independently retrieve contrary precedents for fund-movement / allotment
  // style scenarios, per the pilot's explicit safeguard, even if they did
  // not surface through provision grouping above — but, exactly like every
  // other precedent this engine surfaces, only when the specific finding
  // itself carries real material relevance to the entered facts. Detecting
  // a broad trigger concept (e.g. "preferential allotment") only decides
  // whether to RUN this independent search at all; it never substitutes for
  // scoring each individual candidate finding on its own facts. Previously
  // every published negative finding was added once any trigger fired, with
  // no relevance check at all (score hardcoded to 0) — a real bug found
  // during the architecture review, since fixed here.
  const triggersContrary = [...detectedIds].some((id) => CONTRARY_PRECEDENT_TRIGGER_TAGS.has(id));
  const globalContraryPrecedents: PrecedentRef[] = [];
  let contraryPrecedentSearchNote: string | null = null;
  if (triggersContrary) {
    const alreadyShownIds = new Set(provisionResults.flatMap((pr) => pr.contraryPrecedents.map((c) => c.finding.recordId)));
    const materiallyRelevantContrary = publishedScenarioFindings
      .filter((f) => NEGATIVE_STATUSES.has(f.findingStatus) && !alreadyShownIds.has(f.recordId))
      .map((f) => scoreFinding(f, effectiveConcepts))
      // Same material-relevance bar as every supporting precedent and the
      // per-provision contrary list above: a genuine transaction-type or
      // conduct overlap, never merely a shared actor role, evidence type, or
      // the bare presence of a generic trigger word like "fraud"/"company".
      .filter((sf) => sf.score >= MIN_FINDING_SCORE && sf.substantiveCategoriesMatched >= 1)
      .sort(compareByFactualScoreThenFinality);

    for (const sf of materiallyRelevantContrary) {
      globalContraryPrecedents.push({
        finding: sf.finding,
        effectiveStatus: sf.finding.findingStatus,
        score: sf.score,
        matchedFactualIngredients: sf.matchedIngredients,
        matchedByCategory: sf.matchedByCategory,
        additionalPrecedentFactsNotMatched: additionalPrecedentFactsNotMatched(sf.finding, sf.matchedIngredients),
        distinguishingNote: buildDistinguishingNote(sf.finding),
        materialRelevanceNote: buildMaterialRelevanceNote(sf),
      });
    }
    if (globalContraryPrecedents.length === 0) {
      contraryPrecedentSearchNote = "No materially comparable contrary precedent was identified in the currently structured corpus.";
    }
  }

  const guardrailTitles = new Set<string>();
  for (const id of detectedIds) {
    for (const title of GUARDRAIL_TRIGGERS[id] ?? []) guardrailTitles.add(title);
  }
  const hasInterimOnly = provisionResults.some((pr) =>
    pr.supportingPrecedents.some((s) => !isFinalOrderFinding(s.effectiveStatus))
  );
  if (hasInterimOnly) guardrailTitles.add(ALWAYS_ON_INTERIM_GUARDRAIL);

  const applicableGuardrails: GuardrailNote[] = legalTests
    .filter((lt) => guardrailTitles.has(lt.provisionOrIssue))
    .map((lt) => ({
      id: lt.id,
      provisionOrIssue: lt.provisionOrIssue,
      workingPrinciple: lt.workingPrinciple,
      implementationGuardrail: lt.implementationGuardrail,
      paragraphAnchors: lt.paragraphAnchors,
    }));

  // Full-text search results are a complement, not a replacement: only keep
  // ones the deterministic engine above didn't already surface anywhere, and
  // only when the scenario contains at least one recognized CFID conduct,
  // transaction-type or evidence concept — not merely an actor mention.
  // Without this gate, the full-text query is a plain OR of every
  // non-boilerplate word in the free text: a single ordinary English word
  // (e.g. "customer", "employee", "security", or the bare word "fraud") is
  // common enough in the corpus to spuriously surface unrelated cases for
  // scenarios that have nothing to do with securities law at all (a landlord
  // dispute, a hospital malpractice claim, etc.). An actor mention alone
  // (e.g. just "promoter" or "the company") is not enough either — those
  // words are too generic to indicate the scenario is actually CFID-relevant
  // subject matter, and empirically still let the same noisy full-text
  // fallback through. Requiring a genuine conduct/transaction/evidence
  // concept keeps this feature to its stated purpose — catching
  // CFID-relevant wording the synonym dictionary missed — without
  // fabricating matches out of domain-unrelated or barely-related text.
  const hasNonActorConcept = detected.some((c) => c.kind !== "actor");
  const alreadySurfacedIds = new Set([
    ...provisionResults.flatMap((pr) => [...pr.supportingPrecedents, ...pr.contraryPrecedents]).map((p) => p.finding.recordId),
    ...globalContraryPrecedents.map((p) => p.finding.recordId),
  ]);
  const fullTextSupplementalFindings = hasNonActorConcept
    ? publishedFullTextCandidates.filter((f) => !alreadySurfacedIds.has(f.recordId))
    : [];

  // Question B ("how has CFID historically treated materially similar
  // facts?") — architecturally separate from everything above (Question A,
  // "what applies to MY facts?"). Built from the SAME effectiveConcepts and
  // published findings, but deliberately WITHOUT applying the retrieval gate
  // or actor-applicability check when deciding what counts as "materially
  // similar" — see historicalTreatment.ts for the full architecture and the
  // critical invariant (historical frequency never determines legal
  // applicability).
  const historicalTreatment = buildHistoricalTreatment(
    effectiveConcepts,
    publishedScenarioFindings,
    provisions,
    orders,
    provisionResults,
    gateBlockedProvisionResults,
    contraryOnlyProvisionResults
  );

  return {
    query,
    detectedConceptLabels: unique(detected.map((c) => c.label)),
    provisionResults,
    contraryOnlyProvisionResults,
    gateBlockedProvisionResults,
    globalContraryPrecedents,
    contraryPrecedentSearchNote,
    applicableGuardrails,
    hasResults:
      provisionResults.length > 0 ||
      contraryOnlyProvisionResults.length > 0 ||
      gateBlockedProvisionResults.length > 0 ||
      globalContraryPrecedents.length > 0 ||
      fullTextSupplementalFindings.length > 0,
    fullTextSupplementalFindings,
    semanticAssist: corrections,
    completeness,
    historicalTreatment,
  };
}
