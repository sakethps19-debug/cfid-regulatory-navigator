// CFID Regulatory Navigator — core domain types
// These types describe the structured data generated from the source
// workbooks: CFID_Precedent_Library_Pilot.xlsx (deep scenario-finding
// analysis for 3 orders), Verified_CFID_Order_Links.xlsx (the authoritative
// list of confirmed CFID orders), and Residual_Order_Links.xlsx (an
// exclusion / pending-link register — never a source of precedent). The
// original Links.xlsx compilation is no longer used. Nothing in this file
// invents facts; it only shapes what the workbooks already contain.

export type FindingStatus =
  | "Alleged"
  | "Prima facie"
  | "Confirmed at interim"
  | "Upheld"
  | "Partly upheld"
  | "Not upheld"
  | "Withdrawn"
  | "Inconclusive"
  | "Procedural observation";

export type OrderStage =
  | "Interim order"
  | "Interim order cum show cause notice"
  | "Confirmatory order"
  | "Revocation order"
  | "Final order"
  | "Adjudication order"
  | "Settlement order"
  | "Other";

/** Where an order currently stands in the processing pipeline (see the
 * Admin Processing Dashboard). Mirrors the DB's processing_stage enum. */
export type ProcessingStage =
  | "indexed"
  | "downloaded"
  | "text_extracted"
  | "scenario_findings_extracted"
  | "legally_reviewed"
  | "needs_manual_review"
  | "retrieval_failed";

export interface Order {
  id: string; // DB uuid
  caseName: string;
  orderStage: OrderStage;
  orderDate: string | null; // ISO date — null until the order is retrieved and dated
  orderNumber: string | null;
  authority: string | null;
  noticeesCount: number;
  officialUrl: string;
  cfidVerified: boolean; // order number contains "CFID"
  proceduralStatus: string; // human-readable label derived from processingStage
  processingStage: ProcessingStage;
  retrievalStatus: string;
  retrievalFailureReason: string | null;
  scopeNote: string | null;
}

export interface ScenarioFinding {
  recordId: string; // e.g. "REL-01", "SSSL-03"
  caseName: string;
  orderIds: string[]; // which Order records this finding draws on (interim/final)
  category: string | null;
  scenarioTitle: string;
  factualPattern: string;
  provisionsConsideredRaw: string | null; // original text from workbook
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
  // computed at query time: concepts present in this finding's own tags that
  // did NOT match the query scenario — used to show "ingredients not
  // established" for a candidate precedent (see the matching engine).
  ingredientsNotEstablished: string[];
}

export interface LegalProvision {
  id: string; // canonical id, e.g. "PFUTP-4-2-e", "LODR-4-2-e-i"
  instrument: string;
  provisionNumber: string;
  subject: string | null;
  currentTextVerificationStatus: "Requires verification" | "Order-cited text only" | "Officially verified";
  officialSource: string | null;
  ordersConsidered: string[]; // case names
  treatmentInPilotOrders: string;
  lawLibraryNote: string | null;
}

export interface ProvisionVersion {
  id: string;
  provisionId: string; // legal_provisions.canonical_id
  versionLabel: string;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  exactText: string | null;
  sourceUrl: string | null;
  status: "requires_verification" | "officially_verified";
}

export interface LegalTest {
  id: string;
  provisionOrIssue: string;
  workingPrinciple: string;
  paragraphAnchors: string | null;
  implementationGuardrail: string;
}

export interface DirectionOutcome {
  id: string;
  caseName: string;
  stage: string;
  directionOrOutcome: string;
  paragraphReference: string | null;
  officialSourceUrl: string;
}

// ----- Verified CFID Order Links.xlsx (authoritative order list) -----

export type VerifiedOrderAnalysisStatus = "deep_analyzed" | "verified_pending_analysis";

export interface VerifiedCfidOrderRow {
  id: string;
  caseName: string;
  /** Order identifier as given in the source workbook, verbatim. */
  orderIdentifier: string;
  officialUrl: string;
  /** True if orderIdentifier contains "CFID" — checked defensively even though every row in this workbook is expected to. */
  cfidConfirmed: boolean;
  analysisStatus: VerifiedOrderAnalysisStatus;
  /** Order.id values this row corresponds to, when analysisStatus is "deep_analyzed". */
  linkedOrderIds: string[];
}

// ----- Residual_Order_Links.xlsx (exclusion / pending-link register only) -----

export type ResidualEntryStatus = "pending_link" | "duplicate_of_verified" | "not_cfid";

export interface ResidualOrderRow {
  id: string;
  /** Case name, or "Case name — order identifier" when a link/order number was captured before exclusion. */
  caseOrOrderName: string;
  orderIdentifier: string | null;
  officialUrl: string | null;
  /** Verbatim reason text from the workbook. */
  reason: string;
  status: ResidualEntryStatus;
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

export type OrderRelationshipType =
  | "interim_to_final"
  | "interim_to_confirmatory"
  | "confirmatory_to_revocation"
  | "corrigendum_to"
  | "related_matter";

export interface OrderRelationship {
  id: string;
  fromOrderId: string;
  fromCaseName: string;
  toOrderId: string;
  toCaseName: string;
  relationshipType: OrderRelationshipType;
  note: string | null;
}

export interface ValidationIssue {
  id: string;
  orderId: string | null;
  orderCaseName: string | null;
  findingId: string | null;
  issueType: string;
  severity: "error" | "warning" | "info";
  description: string;
  sourceRowRef: string | null;
  resolved: boolean;
  createdAt: string;
}

export interface LegalInstrument {
  id: string;
  name: string;
  issuingAuthority: string;
  officialSourceUrl: string | null;
}

export interface ProcessingMetrics {
  totalIndexed: number;
  successfullyRetrieved: number;
  retrievalFailures: number;
  cfidVerificationFailures: number;
  fullyExtracted: number;
  needsManualReview: number;
  residualPendingLink: number;
  scenarioFindingsCreated: number;
  legalProvisionsIdentified: number;
  officialLawTextsVerified: number;
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
  verifiedCfidOrderRows: number;
  verifiedCasesPendingAnalysis: number;
  residualPendingLink: number;
  residualDuplicates: number;
  residualNotCfid: number;
}
