import type { LegalProvision, LegalTest, ProvisionVersion, ScenarioFinding } from "@/types/domain";
import { CONTRARY_PRECEDENT_TRIGGER_TAGS } from "@/data/curated/concept-tags";
import { ALWAYS_ON_INTERIM_GUARDRAIL, GUARDRAIL_TRIGGERS } from "@/data/curated/guardrail-triggers";
import { detectConcepts, type DetectedConcept } from "./conceptExtraction";
import { applySemanticAssist } from "./fuzzyMatch";
import type { AnalysisResult, ConfidenceLevel, GuardrailNote, PrecedentRef, ProvisionResult, ScenarioQuery } from "./types";
import { formatDate } from "@/lib/formatDate";

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

function humanizeTag(id: string): string {
  return id.replace(/_/g, " ");
}

/** A precedent's own fact-element tags that were NOT part of what matched
 * the query — i.e. what more this precedent required. */
function ingredientsNotEstablished(finding: ScenarioFinding, matchedIngredients: string[]): string[] {
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
  if (parts.length === 0) {
    return `This precedent (${finding.recordId}) was not confirmed in a final order on its own facts — it should be examined for whether the same distinguishing factors are present before being treated as controlling here.`;
  }
  return `This precedent may be distinguishable on the following grounds: ${parts.join(" ")}`;
}

function buildApplicableVersionNote(versions: ProvisionVersion[]): string {
  if (versions.length === 0) {
    return "No provision-version record on file — the in-force text should be verified directly against the official SEBI or MCA source before any reliance is placed on it.";
  }
  const verified = versions.filter((v) => v.status === "officially_verified" && v.effectiveFrom);
  if (verified.length > 0) {
    const v = verified[verified.length - 1];
    return `Applicable version: ${v.versionLabel} (effective ${formatDate(v.effectiveFrom)}${v.effectiveTo ? ` to ${formatDate(v.effectiveTo)}` : " onward"}), officially verified.`;
  }
  const orderCited = versions.find((v) => v.status === "order_cited_text_only" && v.exactText);
  if (orderCited) {
    return `Text on file is extracted verbatim from a CFID order (${orderCited.versionLabel}) and has not been independently checked against the official source — it should not be assumed to be the current in-force text; the official source should be confirmed before any reliance is placed on it.`;
  }
  return "The version of this provision applicable at the time of the conduct in question has not been independently verified — the current statutory text should not be assumed to have applied; the official source should be confirmed before any reliance is placed on it.";
}

interface ScoredFinding {
  finding: ScenarioFinding;
  score: number;
  matchedIngredients: string[];
  /** Same overlap as matchedIngredients but as raw concept-tag ids, not
   * display labels — used where the specific tag identity matters (e.g.
   * buildWhyRelevant's fund-movement-only check), not just its human text. */
  matchedIds: string[];
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

function scoreFinding(
  finding: ScenarioFinding,
  detected: DetectedConcept[],
  actorFilter: string | null,
  transactionTypeFilter: string | null
): ScoredFinding {
  const detectedIds = new Set(detected.map((c) => c.id));
  const detectedLabelById = new Map(detected.map((c) => [c.id, c.label]));

  const transactionOverlap = finding.transactionTypes.filter((t) => detectedIds.has(t));
  const actorOverlap = finding.actorRoles.filter((a) => detectedIds.has(a));
  const conductOverlap = finding.allegedConduct.filter((c) => detectedIds.has(c));
  const evidenceOverlap = finding.evidenceTypes.filter((e) => detectedIds.has(e));

  let score = transactionOverlap.length * 3 + actorOverlap.length * 2 + conductOverlap.length * 3 + evidenceOverlap.length * 1;

  if (actorFilter && finding.actorRoles.includes(actorFilter)) score += 2;
  if (transactionTypeFilter && finding.transactionTypes.includes(transactionTypeFilter)) score += 3;

  const isFinal = !!finding.finalParagraphReferences;
  if (isFinal) score *= 1.15;

  const matchedIds = unique([...transactionOverlap, ...actorOverlap, ...conductOverlap, ...evidenceOverlap]);
  const matchedIngredients = unique(matchedIds.map((id) => detectedLabelById.get(id) ?? id));

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

  return { finding, score, matchedIngredients, matchedIds, categoriesMatched, substantiveCategoriesMatched };
}

function toPrecedentRef(sf: ScoredFinding): PrecedentRef {
  return {
    finding: sf.finding,
    score: sf.score,
    matchedFactualIngredients: sf.matchedIngredients,
    ingredientsNotEstablished: ingredientsNotEstablished(sf.finding, sf.matchedIngredients),
    distinguishingNote: buildDistinguishingNote(sf.finding),
  };
}

function deriveConfidence(best: ScoredFinding, supportCount: number): { level: ConfidenceLevel; reasons: string[] } {
  const reasons: string[] = [];
  const isFinal = !!best.finding.finalParagraphReferences;
  if (isFinal) {
    reasons.push("The strongest matching precedent is drawn from a final order.");
  } else {
    reasons.push("The strongest matching precedent is drawn from an interim (prima facie) order only.");
  }
  reasons.push(`${best.categoriesMatched} independent factual categories (transaction type, actor role, conduct, evidence) overlap with the facts stated.`);
  if (supportCount > 1) reasons.push(`${supportCount} scenario findings support this provision.`);

  const isUnresolved = UNRESOLVED_STATUSES.has(best.finding.findingStatus);

  let level: ConfidenceLevel;
  if (isUnresolved) {
    level = "Low";
    reasons.push(
      `The strongest matching precedent carries the status "${best.finding.findingStatus}" — no determination has been reached on the merits either way, and this cannot therefore count as more than a weak signal, whatever the extent of factual overlap.`
    );
  } else if (best.categoriesMatched >= 3 && (isFinal || best.score >= 9)) {
    level = "High";
  } else if (best.substantiveCategoriesMatched >= 2) {
    level = "Medium";
  } else {
    level = "Low";
    if (best.categoriesMatched > best.substantiveCategoriesMatched) {
      reasons.push(
        "Beyond that, the overlap is confined to actor role and/or evidence type — a shared actor (e.g. a promoter) or evidence type recurs across many unrelated violations and is a weak signal on its own; what this precedent specifically required, and whether the facts stated establish it, should be examined."
      );
    } else {
      reasons.push("Only a single factual category overlaps — this should be treated as a weak signal requiring further review.");
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

function buildWhyRelevant(provision: LegalProvision, best: ScoredFinding): string {
  const ingredientText = best.matchedIngredients.length > 0 ? best.matchedIngredients.join("; ") : "the general subject matter";
  let text =
    `On a prima facie reading, the facts stated share factual ingredients with a prior CFID scenario finding ` +
    `(${best.finding.recordId}) considered in terms of this provision — namely: ${ingredientText}. ` +
    `This is a prima facie similarity only and does not, by itself, establish that the provision applies.`;

  const matchedOnlyFundMovement = best.matchedIds.length > 0 && best.matchedIds.every((id) => PURE_FUND_MOVEMENT_TAGS.has(id));
  if (matchedOnlyFundMovement && isBroadSecuritiesFraudProvision(provision.id)) {
    text +=
      ` This provision is a general securities-fraud clause and is not confined to fund movement as such — it is cited ` +
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
  const detectedIds = new Set(detected.map((c) => c.id));
  const actorFilter = query.actorFilter || null;
  const transactionTypeFilter = query.transactionTypeFilter || null;

  const scored = scenarioFindings
    .map((f) => scoreFinding(f, detected, actorFilter, transactionTypeFilter))
    .filter((s) => s.score >= MIN_FINDING_SCORE)
    .sort((a, b) => b.score - a.score);

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
    const contrary = findings.filter((f) => NEGATIVE_STATUSES.has(f.finding.findingStatus));
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

  provisionResults.sort((a, b) => b.supportingPrecedents[0].score - a.supportingPrecedents[0].score);

  // Independently retrieve contrary precedents for fund-movement / allotment
  // style scenarios, per the pilot's explicit safeguard, even if they did
  // not surface through provision grouping above.
  const triggersContrary = [...detectedIds].some((id) => CONTRARY_PRECEDENT_TRIGGER_TAGS.has(id));
  const globalContraryPrecedents: PrecedentRef[] = [];
  if (triggersContrary) {
    for (const f of scenarioFindings.filter((f) => NEGATIVE_STATUSES.has(f.findingStatus))) {
      const alreadyShown = provisionResults.some((pr) => pr.contraryPrecedents.some((c) => c.finding.recordId === f.recordId));
      if (!alreadyShown) {
        globalContraryPrecedents.push({
          finding: f,
          score: 0,
          matchedFactualIngredients: [],
          ingredientsNotEstablished: ingredientsNotEstablished(f, []),
          distinguishingNote: buildDistinguishingNote(f),
        });
      }
    }
  }

  const globalMissingFacts = unique(provisionResults.flatMap((pr) => pr.missingFacts));

  const guardrailTitles = new Set<string>();
  for (const id of detectedIds) {
    for (const title of GUARDRAIL_TRIGGERS[id] ?? []) guardrailTitles.add(title);
  }
  const hasInterimOnly = provisionResults.some((pr) =>
    pr.supportingPrecedents.some((s) => !s.finding.finalParagraphReferences)
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
    ? fullTextCandidates.filter((f) => !alreadySurfacedIds.has(f.recordId))
    : [];

  return {
    query,
    detectedConceptLabels: unique(detected.map((c) => c.label)),
    provisionResults,
    globalContraryPrecedents,
    globalMissingFacts,
    applicableGuardrails,
    hasResults: provisionResults.length > 0 || globalContraryPrecedents.length > 0 || fullTextSupplementalFindings.length > 0,
    fullTextSupplementalFindings,
    semanticAssist: corrections,
  };
}
