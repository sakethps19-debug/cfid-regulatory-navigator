// Standalone, temporary probe script (NOT part of the app, not committed) run via tsx.
// Runs the 15 required test categories from the non-PFUTP remediation prompt against
// the REAL production corpus (91 scenario_findings, 99 legal_provisions) to document
// concrete leakage in the live database, before any retrieval-gate changes are made.
import { readFileSync } from "fs";
import { analyzeScenario } from "@/lib/matching/engine";
import type { LegalProvision, ScenarioFinding, FindingStatus, PublicationStatus } from "@/types/domain";

const SCRATCH = "/tmp/claude-0/-home-user-cfid-regulatory-navigator/3f0534b9-4b60-5afe-bd07-443935964238/scratchpad";

const FINDING_STATUS_LABELS: Record<string, FindingStatus> = {
  alleged: "Alleged",
  prima_facie: "Prima facie",
  confirmed_at_interim: "Confirmed at interim",
  upheld: "Confirmed in Final Order",
  partly_upheld: "Partly Confirmed in Final Order",
  not_upheld: "Not Confirmed in Final Order",
  withdrawn: "Withdrawn",
  inconclusive: "Inconclusive",
  procedural_observation: "Procedural observation",
};
const PUBLICATION_STATUS_LABELS: Record<string, PublicationStatus> = {
  draft: "Draft",
  quarantined: "Quarantined",
  published_to_search: "Published to search",
  published_with_warning: "Published with warning",
  withdrawn: "Withdrawn",
};
const VERIFICATION_STATUS_LABELS: Record<string, LegalProvision["currentTextVerificationStatus"]> = {
  requires_verification: "Requires verification",
  order_cited_text_only: "Order-cited text only",
  officially_verified: "Officially verified",
};

interface RawFinding {
  record_id: string;
  case_name: string;
  category: string | null;
  scenario_title: string;
  factual_pattern: string;
  provisions_considered_raw: string | null;
  provision_links: { provisionId: string; justifyingTags: string[]; relationship?: string }[] | null;
  noticee_actor_names: string[] | null;
  finding_status: string;
  interim_paragraph_references: string | null;
  final_paragraph_references: string | null;
  qualification: string | null;
  official_source_url: string | null;
  transaction_types: string[] | null;
  actor_roles: string[] | null;
  evidence_types: string[] | null;
  alleged_conduct: string[] | null;
  evidentiary_gaps: string[] | null;
  precedent_outcome_note: string | null;
  ingredients_not_established: string[] | null;
  source_document_verified: boolean;
  paragraph_citation_verified: boolean;
  finding_status_verified: boolean;
  provision_mapping_verified: boolean;
  noticee_mapping_verified: boolean;
  human_legal_review_completed: boolean;
  publication_status: string;
}
interface RawProvision {
  id: string;
  instrument: string;
  provision_number: string;
  subject: string | null;
  current_text_verification_status: string;
  official_source: string | null;
}

const rawFindings: RawFinding[] = JSON.parse(readFileSync(`${SCRATCH}/live-findings-full-v3.json`, "utf8"));
const rawProvisions: RawProvision[] = JSON.parse(readFileSync(`${SCRATCH}/live-provisions-raw.json`, "utf8"));

const LIVE_FINDINGS: ScenarioFinding[] = rawFindings.map((row) => ({
  recordId: row.record_id,
  caseName: row.case_name,
  orderIds: [],
  category: row.category,
  scenarioTitle: row.scenario_title,
  factualPattern: row.factual_pattern,
  allegationText: null,
  provisionsConsideredRaw: row.provisions_considered_raw,
  provisionIds: (row.provision_links ?? []).map((l) => l.provisionId),
  provisionLinks: row.provision_links ?? [],
  noticeeActors: row.noticee_actor_names ?? [],
  findingStatus: FINDING_STATUS_LABELS[row.finding_status] ?? "Alleged",
  interimParagraphReferences: row.interim_paragraph_references,
  finalParagraphReferences: row.final_paragraph_references,
  qualification: row.qualification,
  officialSourceUrl: row.official_source_url ?? "",
  transactionTypes: row.transaction_types ?? [],
  actorRoles: row.actor_roles ?? [],
  evidenceTypes: row.evidence_types ?? [],
  allegedConduct: row.alleged_conduct ?? [],
  evidentiaryGaps: row.evidentiary_gaps ?? [],
  precedentOutcomeNote: row.precedent_outcome_note,
  ingredientsNotEstablished: row.ingredients_not_established ?? [],
  sourceDocumentVerified: row.source_document_verified,
  paragraphCitationVerified: row.paragraph_citation_verified,
  findingStatusVerified: row.finding_status_verified,
  provisionMappingVerified: row.provision_mapping_verified,
  noticeeMappingVerified: row.noticee_mapping_verified,
  humanLegalReviewCompleted: row.human_legal_review_completed,
  publicationStatus: PUBLICATION_STATUS_LABELS[row.publication_status] ?? "Draft",
}));

const LIVE_PROVISIONS: LegalProvision[] = rawProvisions.map((row) => ({
  id: row.id,
  instrument: row.instrument,
  instrumentId: row.instrument,
  issuingAuthority: "",
  provisionNumber: row.provision_number,
  subject: row.subject,
  currentTextVerificationStatus: VERIFICATION_STATUS_LABELS[row.current_text_verification_status] ?? "Requires verification",
  officialSource: row.official_source,
  ordersConsidered: [],
  treatmentInPilotOrders: "",
  lawLibraryNote: null,
}));

console.log(`Loaded ${LIVE_FINDINGS.length} live scenario_findings, ${LIVE_PROVISIONS.length} live legal_provisions.\n`);

const PROBES: { label: string; freeText: string }[] = [
  { label: "1. fictitious sales query", freeText: "The company booked fictitious sales with no genuine underlying transaction." },
  { label: "2. pure RPT query", freeText: "A related-party transaction with a subsidiary was not disclosed in the related-party register." },
  { label: "3. Audit Committee deficiency", freeText: "The Audit Committee did not convene as required and failed to review the financial statements." },
  { label: "4. Compliance Officer vacancy", freeText: "The Compliance Officer position was vacant for several months with no qualified replacement appointed." },
  { label: "5. financial-statement misstatement", freeText: "The company's financial statements contained a material misstatement of revenue." },
  { label: "6. Ind AS impairment issue", freeText: "An asset was not impaired despite a decline in its recoverable value." },
  { label: "7. consolidation error", freeText: "A subsidiary was wrongly excluded from the consolidated financial statements despite the company having control over it." },
  { label: "8. material-event non-disclosure", freeText: "A material event was not disclosed to the stock exchanges." },
  { label: "9. summons non-cooperation", freeText: "The company failed to respond to SEBI's summons and did not produce the requested documents." },
  { label: "10. preferential allotment", freeText: "Shares were allotted to a promoter entity on a preferential basis." },
  { label: "11. rights/IPO proceeds", freeText: "Rights issue proceeds were raised from the public." },
  { label: "12. director negligence", freeText: "A non-executive director failed to raise concerns despite being aware of irregularities discussed at a board meeting." },
  { label: "13. auditor negligence", freeText: "The statutory auditor certified financial statements despite gross negligence in verifying the underlying figures." },
  { label: "14. ordinary accounting error", freeText: "Foreign exchange gain was incorrectly classified as revenue from operations due to a bona fide accounting error." },
  { label: "15. clean/compliant control scenario", freeText: "A related-party transaction was conducted at fair value and disclosed in full to the Audit Committee and shareholders, with all financial statements accurate and no irregularities found." },
];

for (const probe of PROBES) {
  console.log("=".repeat(100));
  console.log(probe.label);
  console.log(`TEXT: ${probe.freeText}`);
  const result = analyzeScenario({ freeText: probe.freeText }, LIVE_FINDINGS, LIVE_PROVISIONS, []);
  console.log(`\n-- candidate provisions (${result.provisionResults.length}) --`);
  for (const pr of result.provisionResults) {
    console.log(`  ${pr.provision.id} (${pr.provision.instrument} ${pr.provision.provisionNumber}) confidence=${pr.confidence} supportingPrecedents=${pr.supportingPrecedents.map((p) => `${p.finding.recordId}[${p.effectiveStatus}]`).join(",")}`);
  }
  console.log();
}
