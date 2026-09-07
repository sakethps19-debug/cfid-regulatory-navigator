import type { FindingStatus, LegalProvision, LegalTest, ProvisionVersion, ScenarioFinding } from "@/types/domain";
import { CONCEPT_TAGS, CONTRARY_PRECEDENT_TRIGGER_TAGS, type ConceptKind } from "@/data/curated/concept-tags";
import { ALWAYS_ON_INTERIM_GUARDRAIL, GUARDRAIL_TRIGGERS } from "@/data/curated/guardrail-triggers";
import { detectConcepts, type DetectedConcept } from "./conceptExtraction";
import { applySemanticAssist } from "./fuzzyMatch";
import type { AnalysisResult, ConfidenceLevel, GuardrailNote, MatchedByCategory, PrecedentRef, ProvisionResult, ScenarioCompleteness, ScenarioQuery } from "./types";
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

const NEGATIVE_STATUSES = new Set(["Not Confirmed in Final Order", "Withdrawn"]);
const UPHELD_STATUSES = new Set(["Confirmed in Final Order", "Partly Confirmed in Final Order"]);
// A finding with one of these statuses has had NO merits determination made
// either way — "Alleged" is a bare, untested allegation; "Inconclusive" is an
// investigation that could not determine the answer; "Procedural observation"
// decides only a preliminary/jurisdictional point, not the underlying
// conduct. These still show (with their true status badge, never hidden) as
// weak supporting evidence, but must never drive a provision to High
// confidence on keyword overlap alone — that would read an untested
// allegation as settled precedent. See deriveConfidence.
const UNRESOLVED_STATUSES = new Set(["Alleged", "Inconclusive", "Procedural observation"]);
const MIN_FINDING_SCORE = 3; // require at least one meaningful (weight-3) category match

// A finding is "final" only when its own explicit, curated findingStatus
// records an actual final-order disposition — confirmed, partly confirmed,
// or explicitly rejected there. This is deliberately NOT the presence of a
// finalParagraphReferences citation string: that field can be populated for
// a finding whose own status is still Confirmed-at-interim/Prima
// facie/Inconclusive/Procedural observation (e.g. a forward-reference to
// where a related allegation was later dealt with), which would otherwise
// let an interim finding masquerade as final. Confirmed against live data:
// BGDL-01, GENSOL-01/02/03, RHFL-01, LINDE-01/02, EROS-01, ZEE-LOC-01,
// PIFL-01, SIL-01, NAGL-01, PDCL-01, LSIL-01, MFL-02, BGL-PREF-04 and
// BHSL-PROC-01 all currently carry a final_paragraph_references value while
// their own finding_status is not a final-order disposition.
const FINAL_ORDER_DISPOSITIONS = new Set<FindingStatus>([
  "Confirmed in Final Order",
  "Partly Confirmed in Final Order",
  "Not Confirmed in Final Order",
]);
export function isFinalOrderFinding(status: FindingStatus): boolean {
  return FINAL_ORDER_DISPOSITIONS.has(status);
}

/** Orders two scored findings for DISPLAY PURPOSES ONLY (which precedent
 * appears first, which three make the top-3-per-provision cut) — never for
 * anything officer-facing. Sorts by factual-overlap score first; a
 * finding's procedural stage (final vs. interim/unresolved) only breaks an
 * EXACT tie on that score, never overrides a genuinely higher factual
 * score. This is the deliberate replacement for a former `score *= 1.15`
 * finality multiplier folded directly into the score: that multiplier let
 * procedural stage make two fact patterns look "more factually similar"
 * than they actually were (a interim-stage finding scoring 9 could be
 * outranked by a final-order finding scoring merely 8, since 8*1.15=9.2) —
 * exactly the dimension-conflation this scoring model must not have. A
 * secondary, ties-only tiebreak has no such effect: it can only ever
 * reorder findings that are already factually equal, which is a legitimate
 * display preference (an equally-on-point final order is more citable than
 * an equally-on-point interim one), not a factual-similarity claim. */
export function compareByFactualScoreThenFinality(a: { score: number; finding: ScenarioFinding }, b: { score: number; finding: ScenarioFinding }): number {
  if (a.score !== b.score) return b.score - a.score;
  return Number(isFinalOrderFinding(b.finding.findingStatus)) - Number(isFinalOrderFinding(a.finding.findingStatus));
}

function humanizeTag(id: string): string {
  return id.replace(/_/g, " ");
}

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
    merged.push({ id: tag.id, kind: tag.kind, label: tag.label, matchedPhrases: [] });
    seenIds.add(tag.id);
  }
  return merged;
}

/** MECHANICAL tag subtraction only: this precedent's own curated
 * fact-element TAGS (transaction type / actor role / conduct / evidence)
 * that were not part of what matched the query — bare vocabulary labels
 * like "Related party" or "Bank statements", never a legal analysis. This
 * is deliberately named and typed apart from
 * ScenarioFinding.ingredientsNotEstablished (PrecedentRef.
 * additionalPrecedentFactsNotMatched below), which is the genuinely
 * curated, reasoned "legal ingredients not established" content from
 * scenario_findings.ingredients_not_established — a human-written
 * explanation of which specific elements of a charge were considered but
 * not made out for THAT precedent's own outcome. Conflating the two under
 * one name or one label risks the mechanical list reading as if it were
 * that curated legal analysis, which it is not. */
function additionalPrecedentFactsNotMatched(finding: ScenarioFinding, matchedIngredients: string[]): string[] {
  const matchedSet = new Set(matchedIngredients);
  const allOwnTags = unique([
    ...finding.transactionTypes,
    ...finding.actorRoles,
    ...finding.allegedConduct,
    ...finding.evidenceTypes,
  ]);
  return allOwnTags.map(humanizeTag).filter((label) => !matchedSet.has(label));
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
    return `Applicable version: ${v.versionLabel} (effective ${formatDate(v.effectiveFrom)}${v.effectiveTo ? ` to ${formatDate(v.effectiveTo)}` : " onward"}), officially verified.`;
  }
  const orderCited = versions.find((v) => v.status === "order_cited_text_only" && v.exactText);
  if (orderCited) {
    return `Text on file is extracted verbatim from a CFID order (${orderCited.versionLabel}) and has not been independently checked against the official source; it should not be assumed to be the current in-force text; the official source should be confirmed before any reliance is placed on it.`;
  }
  return "The version of this provision applicable at the time of the conduct in question has not been independently verified; the current statutory text should not be assumed to have applied; the official source should be confirmed before any reliance is placed on it.";
}

interface ScoredFinding {
  finding: ScenarioFinding;
  score: number;
  matchedIngredients: string[];
  /** Same overlap as matchedIngredients but as raw concept-tag ids, not
   * display labels — used where the specific tag identity matters (e.g.
   * buildWhyRelevant's fund-movement-only check), not just its human text. */
  matchedIds: string[];
  /** matchedIngredients split back out by the category it was matched
   * against (transaction type / actor role / alleged conduct / evidence
   * type) — surfaced in the UI's "Why was this result retrieved?" panel so
   * an officer can see not just that something matched but what kind of
   * fact it was. */
  matchedByCategory: MatchedByCategory;
  categoriesMatched: number;
  substantiveCategoriesMatched: number;
}

function unique<T>(items: T[]): T[] {
  return [...new Set(items)];
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

function scoreFinding(finding: ScenarioFinding, effectiveConcepts: DetectedConcept[]): ScoredFinding {
  // effectiveConcepts already merges free-text detection with the
  // officer's dropdown selections (see buildEffectiveScenarioConcepts) —
  // both are scored identically here, on the same per-category weight,
  // since a dropdown selection is a signal asserting the same kind of
  // fact free text would, not a separate boost mechanism.
  const detectedIds = new Set(effectiveConcepts.map((c) => c.id));
  const detectedLabelById = new Map(effectiveConcepts.map((c) => [c.id, c.label]));

  const transactionOverlap = finding.transactionTypes.filter((t) => detectedIds.has(t));
  const actorOverlap = finding.actorRoles.filter((a) => detectedIds.has(a));
  const conductOverlap = finding.allegedConduct.filter((c) => detectedIds.has(c));
  const evidenceOverlap = finding.evidenceTypes.filter((e) => detectedIds.has(e));

  // score is a pure factual-overlap measure — deliberately never adjusted
  // for procedural stage (final/interim) or historical disposition. Those
  // are separate dimensions, shown separately (see StatusBadge /
  // findingStatusLabel) and must never be able to make one fact pattern
  // read as more or less factually similar than another. Display-order
  // ties are broken by finality separately, see
  // compareByFactualScoreThenFinality — never by adjusting this number.
  const score = transactionOverlap.length * 3 + actorOverlap.length * 2 + conductOverlap.length * 3 + evidenceOverlap.length * 1;
  const matchedIds = unique([...transactionOverlap, ...actorOverlap, ...conductOverlap, ...evidenceOverlap]);
  const matchedIngredients = unique(matchedIds.map((id) => detectedLabelById.get(id) ?? id));
  const toLabels = (ids: string[]) => unique(ids.map((id) => detectedLabelById.get(id) ?? id));
  const matchedByCategory: MatchedByCategory = {
    transactionTypes: toLabels(transactionOverlap),
    actorRoles: toLabels(actorOverlap),
    allegedConduct: toLabels(conductOverlap),
    evidenceTypes: toLabels(evidenceOverlap),
  };

  const categoriesMatched = [transactionOverlap, actorOverlap, conductOverlap, evidenceOverlap].filter(
    (arr) => arr.length > 0
  ).length;

  // Transaction type and alleged conduct are what a provision's relevance
  // actually turns on ("what happened", weight 3 each) — actor role and
  // evidence type (weight 2 and 1) are comparatively generic context that
  // shows up across unrelated violations (almost every fraud finding names
  // a "promoter" as an actor, for instance). Confidence tiering keys off
  // this substantive count separately from the raw categoriesMatched count
  // so a finding that only matched on conduct-plus-actor doesn't read as
  // equally strong as one that matched on conduct-plus-transaction-type —
  // see deriveConfidence.
  const substantiveCategoriesMatched = [transactionOverlap, conductOverlap].filter((arr) => arr.length > 0).length;

  return { finding, score, matchedIngredients, matchedIds, matchedByCategory, categoriesMatched, substantiveCategoriesMatched };
}

function toPrecedentRef(sf: ScoredFinding): PrecedentRef {
  return {
    finding: sf.finding,
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
function deriveConfidence(best: ScoredFinding, supportCount: number): { level: ConfidenceLevel; reasons: string[] } {
  const reasons: string[] = [];
  reasons.push(`${best.categoriesMatched} independent factual categories (transaction type, actor role, conduct, evidence) overlap with the facts stated.`);
  if (supportCount > 1) reasons.push(`${supportCount} scenario findings support this provision.`);
  reasons.push(
    `This reflects factual overlap only; it says nothing about this precedent's own procedural stage or historical disposition, shown separately above and never used to compute this figure.`
  );
  if (UNRESOLVED_STATUSES.has(best.finding.findingStatus)) {
    reasons.push(
      `Separately: the strongest matching precedent carries the status "${best.finding.findingStatus}", no determination has been reached on the merits either way. That is a fact about the precedent's own disposition, not about how closely its facts resemble the entered scenario, so it does not change the factual-overlap figure above, but it should weigh heavily in how much this precedent is relied on.`
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

export function analyzeScenario(
  query: ScenarioQuery,
  scenarioFindings: ScenarioFinding[],
  provisions: LegalProvision[],
  legalTests: LegalTest[],
  provisionVersionsByProvisionId: Map<string, ProvisionVersion[]> = new Map(),
  fullTextCandidates: ScenarioFinding[] = []
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
  const findingsByProvision = new Map<string, ScoredFinding[]>();
  for (const sf of scored) {
    for (const link of sf.finding.provisionLinks) {
      if (link.justifyingTags.length > 0 && !link.justifyingTags.some((t) => detectedIds.has(t))) continue;
      findingsByProvision.set(link.provisionId, [...(findingsByProvision.get(link.provisionId) ?? []), sf]);
    }
  }

  const provisionResults: ProvisionResult[] = [];
  for (const [provisionId, findings] of findingsByProvision.entries()) {
    const provision = provisions.find((p) => p.id === provisionId);
    if (!provision) continue;

    const supporting = findings.filter((f) => !NEGATIVE_STATUSES.has(f.finding.findingStatus));
    // A contrary precedent must carry real material weight, not merely a
    // weak evidence-type/actor-role overlap (weight 1-2 categories that
    // recur across many unrelated matters) — require the same substantive
    // (transaction-type or conduct) overlap that anchors supporting
    // precedents. See the same requirement applied to the independent
    // global contrary-precedent search below (isMateriallyRelevantContrary).
    const contrary = findings.filter((f) => NEGATIVE_STATUSES.has(f.finding.findingStatus) && f.substantiveCategoriesMatched >= 1);
    if (supporting.length === 0) continue; // provision only has contrary evidence here — not "potentially relevant" on its own

    // Prefer the highest-scoring RESOLVED finding (anything other than
    // Alleged/Inconclusive/Procedural observation) as the anchor for
    // confidence — a genuinely upheld precedent should not be shadowed by a
    // higher-scoring but merely-alleged one for the same provision. Only
    // fall back to the raw top-scoring finding when every supporting finding
    // is unresolved, in which case deriveConfidence caps confidence at Low.
    const best = supporting.find((s) => !UNRESOLVED_STATUSES.has(s.finding.findingStatus)) ?? supporting[0];
    const { level, reasons } = deriveConfidence(best, supporting.length);
    const provisionVersions = provisionVersionsByProvisionId.get(provisionId) ?? [];
    const upheld = findings.filter((f) => UPHELD_STATUSES.has(f.finding.findingStatus));

    provisionResults.push({
      provision,
      whyRelevant: buildWhyRelevant(provision, best),
      matchedFactualIngredients: unique(supporting.flatMap((s) => s.matchedIngredients)),
      matchedByCategory: mergeMatchedByCategory(supporting),
      supportingPrecedents: supporting.slice(0, 3).map(toPrecedentRef),
      contraryPrecedents: contrary.slice(0, 3).map(toPrecedentRef),
      upheldPrecedents: upheld.slice(0, 5).map(toPrecedentRef),
      statusesSeen: unique(findings.map((f) => f.finding.findingStatus)),
      confidence: level,
      confidenceReasons: reasons,
      missingFacts: unique(supporting.flatMap((s) => s.finding.evidentiaryGaps)).filter(isGenuineEvidentiaryGap),
      provisionVersions,
      applicableVersionNote: buildApplicableVersionNote(provisionVersions),
    });
  }

  provisionResults.sort((a, b) => compareByFactualScoreThenFinality(a.supportingPrecedents[0], b.supportingPrecedents[0]));

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

  const globalMissingFacts = unique(provisionResults.flatMap((pr) => pr.missingFacts));

  const guardrailTitles = new Set<string>();
  for (const id of detectedIds) {
    for (const title of GUARDRAIL_TRIGGERS[id] ?? []) guardrailTitles.add(title);
  }
  const hasInterimOnly = provisionResults.some((pr) =>
    pr.supportingPrecedents.some((s) => !isFinalOrderFinding(s.finding.findingStatus))
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

  return {
    query,
    detectedConceptLabels: unique(detected.map((c) => c.label)),
    provisionResults,
    globalContraryPrecedents,
    contraryPrecedentSearchNote,
    globalMissingFacts,
    applicableGuardrails,
    hasResults: provisionResults.length > 0 || globalContraryPrecedents.length > 0 || fullTextSupplementalFindings.length > 0,
    fullTextSupplementalFindings,
    semanticAssist: corrections,
    completeness,
  };
}
