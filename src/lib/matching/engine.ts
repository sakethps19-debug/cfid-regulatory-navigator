import type { LegalProvision, LegalTest, ProvisionVersion, ScenarioFinding } from "@/types/domain";
import { CONTRARY_PRECEDENT_TRIGGER_TAGS } from "@/data/curated/concept-tags";
import { ALWAYS_ON_INTERIM_GUARDRAIL, GUARDRAIL_TRIGGERS } from "@/data/curated/guardrail-triggers";
import { detectConcepts, type DetectedConcept } from "./conceptExtraction";
import type { AnalysisResult, ConfidenceLevel, GuardrailNote, PrecedentRef, ProvisionResult, ScenarioQuery } from "./types";

const NEGATIVE_STATUSES = new Set(["Not upheld", "Withdrawn"]);
const UPHELD_STATUSES = new Set(["Upheld", "Partly upheld"]);
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
    parts.push(`Facts that distinguished this case: ${finding.evidentiaryGaps.join("; ")}.`);
  }
  if (parts.length === 0) {
    return `This precedent (${finding.recordId}) was not upheld on its own facts — check whether the same distinguishing factors are present before treating it as controlling here.`;
  }
  return `This precedent may be distinguishable because: ${parts.join(" ")}`;
}

function buildApplicableVersionNote(versions: ProvisionVersion[]): string {
  if (versions.length === 0) {
    return "No provision-version record on file — verify the in-force text directly against the official SEBI or MCA source before relying on it.";
  }
  const verified = versions.filter((v) => v.status === "officially_verified" && v.effectiveFrom);
  if (verified.length > 0) {
    const v = verified[verified.length - 1];
    return `Applicable version: ${v.versionLabel} (effective ${v.effectiveFrom}${v.effectiveTo ? ` to ${v.effectiveTo}` : " onward"}), officially verified.`;
  }
  return "The historically-applicable version of this provision at the time of the conduct has not been independently verified — do not assume the current statutory text applied; confirm against the official source before relying on it.";
}

interface ScoredFinding {
  finding: ScenarioFinding;
  score: number;
  matchedIngredients: string[];
  categoriesMatched: number;
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

  const matchedIngredients = unique(
    [...transactionOverlap, ...actorOverlap, ...conductOverlap, ...evidenceOverlap].map(
      (id) => detectedLabelById.get(id) ?? id
    )
  );

  const categoriesMatched = [transactionOverlap, actorOverlap, conductOverlap, evidenceOverlap].filter(
    (arr) => arr.length > 0
  ).length;

  return { finding, score, matchedIngredients, categoriesMatched };
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
  reasons.push(`${best.categoriesMatched} independent factual categories (transaction type, actor role, conduct, evidence) overlap with the scenario.`);
  if (supportCount > 1) reasons.push(`${supportCount} scenario findings support this provision.`);

  let level: ConfidenceLevel;
  if (best.categoriesMatched >= 3 && (isFinal || best.score >= 9)) {
    level = "High";
  } else if (best.categoriesMatched >= 2) {
    level = "Medium";
  } else {
    level = "Low";
    reasons.push("Only a single factual category overlaps — treat this as a weak signal requiring further review.");
  }
  return { level, reasons };
}

function buildWhyRelevant(provision: LegalProvision, best: ScoredFinding): string {
  const ingredientText = best.matchedIngredients.length > 0 ? best.matchedIngredients.join("; ") : "the general subject matter";
  return (
    `Potentially relevant because the entered facts share factual ingredients with a prior CFID scenario finding ` +
    `(${best.finding.recordId}) considered under this provision — specifically: ${ingredientText}. ` +
    `This is a prima facie similarity only and does not by itself establish that the provision applies.`
  );
}

export function analyzeScenario(
  query: ScenarioQuery,
  scenarioFindings: ScenarioFinding[],
  provisions: LegalProvision[],
  legalTests: LegalTest[],
  provisionVersionsByProvisionId: Map<string, ProvisionVersion[]> = new Map(),
  fullTextCandidates: ScenarioFinding[] = []
): AnalysisResult {
  const detected = detectConcepts(query.freeText);
  const actorFilter = query.actorFilter || null;
  const transactionTypeFilter = query.transactionTypeFilter || null;

  const scored = scenarioFindings
    .map((f) => scoreFinding(f, detected, actorFilter, transactionTypeFilter))
    .filter((s) => s.score >= MIN_FINDING_SCORE)
    .sort((a, b) => b.score - a.score);

  // Group by provision id — a provision is only surfaced if at least one
  // finding that actually matched the scenario's facts is tagged with it.
  // This prevents suggesting a provision merely because it appeared
  // somewhere in the same order.
  const findingsByProvision = new Map<string, ScoredFinding[]>();
  for (const sf of scored) {
    for (const provisionId of sf.finding.provisionIds) {
      findingsByProvision.set(provisionId, [...(findingsByProvision.get(provisionId) ?? []), sf]);
    }
  }

  const provisionResults: ProvisionResult[] = [];
  for (const [provisionId, findings] of findingsByProvision.entries()) {
    const provision = provisions.find((p) => p.id === provisionId);
    if (!provision) continue;

    const supporting = findings.filter((f) => !NEGATIVE_STATUSES.has(f.finding.findingStatus));
    const contrary = findings.filter((f) => NEGATIVE_STATUSES.has(f.finding.findingStatus));
    if (supporting.length === 0) continue; // provision only has contrary evidence here — not "potentially relevant" on its own

    const best = supporting[0];
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
  const detectedIds = new Set(detected.map((c) => c.id));
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
  // ones the deterministic engine above didn't already surface anywhere.
  const alreadySurfacedIds = new Set([
    ...provisionResults.flatMap((pr) => [...pr.supportingPrecedents, ...pr.contraryPrecedents]).map((p) => p.finding.recordId),
    ...globalContraryPrecedents.map((p) => p.finding.recordId),
  ]);
  const fullTextSupplementalFindings = fullTextCandidates.filter((f) => !alreadySurfacedIds.has(f.recordId));

  return {
    query,
    detectedConceptLabels: unique(detected.map((c) => c.label)),
    provisionResults,
    globalContraryPrecedents,
    globalMissingFacts,
    applicableGuardrails,
    hasResults: provisionResults.length > 0 || globalContraryPrecedents.length > 0 || fullTextSupplementalFindings.length > 0,
    fullTextSupplementalFindings,
  };
}
