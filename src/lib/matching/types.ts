import type { FindingStatus, LegalProvision, ProvisionVersion, ScenarioFinding } from "@/types/domain";
import type { WordCorrection } from "./fuzzyMatch";

export interface ScenarioQuery {
  freeText: string;
  actorFilter?: string | null;
  /** Optional exact-match boost against a finding's allegedConduct (the
   * "Scenario type" dropdown in the UI, e.g. "Fraudulent/sham preferential
   * allotment") — never the underlying transactionTypes field, which
   * describes transaction subject matter (e.g. "financial statement
   * disclosure") rather than a violation/scenario category. */
  scenarioTypeFilter?: string | null;
}

export type ConfidenceLevel = "High" | "Medium" | "Low";

export interface PrecedentRef {
  finding: ScenarioFinding;
  score: number;
  matchedFactualIngredients: string[];
  /** This precedent's own fact-element tags that the entered scenario did
   * NOT establish — i.e. what else this precedent required that the query
   * doesn't mention. Read as "not (yet) established by your facts", not as
   * a statement that the entered scenario lacks these elements. */
  ingredientsNotEstablished: string[];
  /** Present only for contrary (status "Not Confirmed in Final Order"/"Withdrawn") precedents:
   * a plain-language note on why this precedent may be distinguishable on
   * its facts, built from its own qualification text and evidentiary gaps. */
  distinguishingNote?: string;
}

export interface ProvisionResult {
  provision: LegalProvision;
  whyRelevant: string;
  matchedFactualIngredients: string[];
  supportingPrecedents: PrecedentRef[];
  contraryPrecedents: PrecedentRef[];
  /** Matching precedents whose outcome was actually "Confirmed in Final
   * Order" or "Partly Confirmed in Final Order" — pulled out from supportingPrecedents (which mixes in weaker
   * statuses like Alleged/Prima facie) so an officer can see at a glance
   * whether this provision has ever actually been confirmed on similar
   * facts, not just alleged. Drawn from every matching finding for this
   * provision, not only the top-3 shown under supportingPrecedents. */
  upheldPrecedents: PrecedentRef[];
  statusesSeen: FindingStatus[];
  confidence: ConfidenceLevel;
  confidenceReasons: string[];
  missingFacts: string[];
  /** The provision's recorded text version(s) — surfaced so the officer
   * never assumes the current statutory text applied at the time of the
   * conduct without checking. */
  provisionVersions: ProvisionVersion[];
  applicableVersionNote: string;
}

export interface GuardrailNote {
  id: string;
  provisionOrIssue: string;
  workingPrinciple: string;
  implementationGuardrail: string;
  paragraphAnchors: string | null;
}

export interface AnalysisResult {
  query: ScenarioQuery;
  detectedConceptLabels: string[];
  provisionResults: ProvisionResult[];
  globalContraryPrecedents: PrecedentRef[];
  globalMissingFacts: string[];
  applicableGuardrails: GuardrailNote[];
  hasResults: boolean;
  /** Findings surfaced by Postgres full-text search on the free-text query
   * that the deterministic tag-based engine above did NOT already surface
   * (i.e. not already present in provisionResults or globalContraryPrecedents).
   * A complement, never a replacement, for the deterministic engine — shown
   * separately in the UI as "also worth reviewing", not scored or ranked. */
  fullTextSupplementalFindings: ScenarioFinding[];
  /** Likely-typo spelling corrections applied to the entered free text
   * before concept detection ran (see lib/matching/fuzzyMatch.ts) — a
   * bounded-edit-distance fix against the curated concept vocabulary, never
   * a guess at meaning. Shown to the user for transparency; the matching
   * itself remains fully deterministic and this never changes what is
   * displayed back as the entered scenario. Empty when no correction was
   * needed. */
  semanticAssist: WordCorrection[];
}
