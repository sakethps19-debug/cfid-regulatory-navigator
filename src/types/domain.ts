// CFID Regulatory Navigator — core domain types
// These types describe the structured data generated from the two source
// workbooks (CFID_Precedent_Library_Pilot.xlsx and Links.xlsx). Nothing in
// this file invents facts; it only shapes what the workbooks already contain.

export type FindingStatus =
  | "Alleged"
  | "Prima facie"
  | "Upheld"
  | "Partly upheld"
  | "Not upheld";

export type OrderStage =
  | "Interim order"
  | "Interim order cum show cause notice"
  | "Final order";

export interface Order {
  id: string; // e.g. "REL-INTERIM", "SSSL-INTERIM", "SSSL-FINAL"
  caseName: string;
  orderStage: OrderStage;
  orderDate: string; // ISO date
  orderNumber: string;
  authority: string;
  noticeesCount: number;
  officialUrl: string;
  cfidVerified: boolean; // order number contains "CFID"
  proceduralStatus: string;
  scopeNote: string;
}

export interface ScenarioFinding {
  recordId: string; // e.g. "REL-01", "SSSL-03"
  caseName: string;
  orderIds: string[]; // which Order records this finding draws on (interim/final)
  category: string;
  scenarioTitle: string;
  factualPattern: string;
  provisionsConsideredRaw: string; // original text from workbook
  provisionIds: string[]; // parsed canonical provision ids, instrument-qualified
  noticeeActors: string[];
  findingStatus: FindingStatus;
  interimParagraphReferences: string | null;
  finalParagraphReferences: string | null;
  qualification: string | null;
  officialSourceUrl: string;
  // curated fact-element tags (added by the pilot's curation layer, not the
  // workbook itself) used only for deterministic keyword/concept matching
  transactionTypes: string[];
  actorRoles: string[];
  evidenceTypes: string[];
  allegedConduct: string[];
  evidentiaryGaps: string[];
}

export interface LegalProvision {
  id: string; // canonical id, e.g. "PFUTP-4-2-e", "LODR-4-2-e-i"
  instrument: string;
  provisionNumber: string;
  subject: string;
  currentTextVerificationStatus: "Requires verification" | "Order-cited text only";
  officialSource: string | null;
  ordersConsidered: string[]; // case names
  treatmentInPilotOrders: string;
  lawLibraryNote: string;
}

export interface LegalTest {
  id: string;
  provisionOrIssue: string;
  workingPrinciple: string;
  paragraphAnchors: string;
  implementationGuardrail: string;
}

export interface DirectionOutcome {
  id: string;
  caseName: string;
  stage: string;
  directionOrOutcome: string;
  paragraphReference: string;
  officialSourceUrl: string;
}

export type AwaitingAnalysisStatus =
  | "already_in_library"
  | "no_order"
  | "links_pending_review";

export interface AwaitingAnalysisRow {
  srNo: number;
  caseId: number;
  caseName: string;
  orderType: string;
  links: string[];
  status: AwaitingAnalysisStatus;
  reviewFlag: boolean;
  reviewReason: string | null;
}

export interface PfutpFocusEntry {
  id: string;
  caseName: string;
  orderStage: string;
  scenario: string;
  findingOnPfutp42e: string;
  reasoning: string;
  paragraphReferences: string;
  officialSourceUrl: string;
}

export interface ValidationReport {
  generatedAt: string;
  importedOrders: number;
  scenarioFindings: number;
  invalidOrMissingUrls: string[];
  missingParagraphReferences: string[];
  unknownProvisions: string[];
  duplicateRecords: string[];
  conflictingFindings: string[];
  rowsRequiringManualReview: number;
  nonCfidOrders: number;
  rowsMarkedNoOrder: number;
}
