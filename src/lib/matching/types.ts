import type { FindingStatus, LegalProvision, ScenarioFinding } from "@/types/domain";

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
}

export interface GuardrailNote {
  id: string;
  provisionOrIssue: string;
  workingPrinciple: string;
  implementationGuardrail: string;
  paragraphAnchors: string;
}

export interface AnalysisResult {
  query: ScenarioQuery;
  detectedConceptLabels: string[];
  provisionResults: ProvisionResult[];
  globalContraryPrecedents: PrecedentRef[];
  globalMissingFacts: string[];
  applicableGuardrails: GuardrailNote[];
  hasResults: boolean;
}
