import type { FindingStatus, LegalProvision, ProvisionVersion, ScenarioFinding } from "@/types/domain";

export interface ScenarioQuery {
  freeText: string;
  actorFilter?: string | null;
  transactionTypeFilter?: string | null;
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
  /** Present only for contrary (status "Not upheld"/"Withdrawn") precedents:
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
}
