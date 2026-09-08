// Standalone, temporary trace script (NOT part of the app, not committed) run
// via tsx. Deterministic Scenario Analyzer completion pass: validates the
// five new workstreams (Companies Act, actor-applicability, candidate-tier/
// legal-function, temporal, historical-treatment) against the REAL live
// production corpus, reusing the same JSON snapshots the prior passes' probe
// scripts used.
import { readFileSync } from "fs";
import { analyzeScenario } from "@/lib/matching/engine";
import type { LegalProvision, ScenarioFinding, FindingStatus, PublicationStatus } from "@/types/domain";

const SCRATCH = "/tmp/claude-0/-home-user-cfid-regulatory-navigator/3f0534b9-4b60-5afe-bd07-443935964238/scratchpad";

const FINDING_STATUS_LABELS: Record<string, FindingStatus> = {
  alleged: "Alleged", prima_facie: "Prima facie", confirmed_at_interim: "Confirmed at interim",
  upheld: "Confirmed in Final Order", partly_upheld: "Partly Confirmed in Final Order",
  not_upheld: "Not Confirmed in Final Order", withdrawn: "Withdrawn", inconclusive: "Inconclusive",
  procedural_observation: "Procedural observation",
};
const PUBLICATION_STATUS_LABELS: Record<string, PublicationStatus> = {
  draft: "Draft", quarantined: "Quarantined", published_to_search: "Published to search",
  published_with_warning: "Published with warning", withdrawn: "Withdrawn",
};
const VERIFICATION_STATUS_LABELS: Record<string, LegalProvision["currentTextVerificationStatus"]> = {
  requires_verification: "Requires verification", order_cited_text_only: "Order-cited text only", officially_verified: "Officially verified",
};

interface RawProvisionLink {
  provisionId: string;
  justifyingTags: string[];
  relationship?: string;
}
interface RawFinding {
  record_id: string;
  case_name: string;
  category: string | null;
  scenario_title: string;
  factual_pattern: string;
  provisions_considered_raw: string | null;
  provision_links: RawProvisionLink[] | null;
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
  recordId: row.record_id, caseName: row.case_name, orderIds: [], category: row.category, scenarioTitle: row.scenario_title,
  factualPattern: row.factual_pattern, allegationText: null, provisionsConsideredRaw: row.provisions_considered_raw,
  provisionIds: (row.provision_links ?? []).map((l) => l.provisionId), provisionLinks: row.provision_links ?? [],
  noticeeActors: row.noticee_actor_names ?? [], findingStatus: FINDING_STATUS_LABELS[row.finding_status] ?? "Alleged",
  interimParagraphReferences: row.interim_paragraph_references, finalParagraphReferences: row.final_paragraph_references,
  qualification: row.qualification, officialSourceUrl: row.official_source_url ?? "", transactionTypes: row.transaction_types ?? [],
  actorRoles: row.actor_roles ?? [], evidenceTypes: row.evidence_types ?? [], allegedConduct: row.alleged_conduct ?? [],
  evidentiaryGaps: row.evidentiary_gaps ?? [], precedentOutcomeNote: row.precedent_outcome_note, ingredientsNotEstablished: row.ingredients_not_established ?? [],
  sourceDocumentVerified: row.source_document_verified, paragraphCitationVerified: row.paragraph_citation_verified, findingStatusVerified: row.finding_status_verified,
  provisionMappingVerified: row.provision_mapping_verified, noticeeMappingVerified: row.noticee_mapping_verified, humanLegalReviewCompleted: row.human_legal_review_completed,
  publicationStatus: PUBLICATION_STATUS_LABELS[row.publication_status] ?? "Draft",
}));
const LIVE_PROVISIONS: LegalProvision[] = rawProvisions.map((row) => ({
  id: row.id, instrument: row.instrument, instrumentId: row.instrument, issuingAuthority: "", provisionNumber: row.provision_number,
  subject: row.subject, currentTextVerificationStatus: VERIFICATION_STATUS_LABELS[row.current_text_verification_status] ?? "Requires verification",
  officialSource: row.official_source, ordersConsidered: [], treatmentInPilotOrders: "", lawLibraryNote: null,
}));

console.log(`Loaded ${LIVE_FINDINGS.length} live scenario_findings, ${LIVE_PROVISIONS.length} live legal_provisions.\n`);

// ----- Section A: Companies Act findings, own factual_pattern text -----
console.log("=".repeat(100));
console.log("SECTION A: Companies Act — real findings on their own factual_pattern text");
const COMPANIES_ACT_RECORDS = ["BGL-PREF-01", "BGL-PREF-04", "REL-02", "HEXA-01", "NALWA-01"];
for (const recordId of COMPANIES_ACT_RECORDS) {
  const source = LIVE_FINDINGS.find((f) => f.recordId === recordId);
  if (!source) { console.log(`!! missing ${recordId}`); continue; }
  const result = analyzeScenario({ freeText: source.factualPattern }, LIVE_FINDINGS, LIVE_PROVISIONS, []);
  console.log(`\n-- ${recordId} (${source.caseName}) [${source.findingStatus}] --`);
  const caProvisionResults = result.provisionResults.filter((p) => p.provision.id.startsWith("COMPANIES-ACT"));
  const caGateBlocked = result.gateBlockedProvisionResults.filter((g) => g.provision.id.startsWith("COMPANIES-ACT"));
  for (const pr of caProvisionResults) {
    console.log(`  CANDIDATE ${pr.provision.id} tier=${pr.candidateTier} fn=${pr.legalFunction} actor=${pr.actorApplicability.status}`);
  }
  for (const g of caGateBlocked) {
    console.log(`  BLOCKED   ${g.provision.id} reason=${g.blockReason}`);
  }
  if (caProvisionResults.length === 0 && caGateBlocked.length === 0) console.log("  (no Companies Act candidate or blocked entry for this finding's own text)");
}

// ----- Section B: actor-applicability spot checks on real findings -----
console.log("\n" + "=".repeat(100));
console.log("SECTION B: actor-applicability on real findings (LODR-6/17/18 family)");
const ACTOR_RECORDS = ["BGL-PREF-04", "REL-02"];
for (const recordId of ACTOR_RECORDS) {
  const source = LIVE_FINDINGS.find((f) => f.recordId === recordId);
  if (!source) continue;
  const result = analyzeScenario({ freeText: source.factualPattern }, LIVE_FINDINGS, LIVE_PROVISIONS, []);
  console.log(`\n-- ${recordId} --`);
  for (const pr of result.provisionResults.filter((p) => /^LODR-(6|17|18)/.test(p.provision.id))) {
    console.log(`  ${pr.provision.id} actor=${pr.actorApplicability.status} note=${pr.actorApplicability.note ?? "(none)"}`);
  }
  for (const g of result.gateBlockedProvisionResults.filter((p) => /^LODR-(6|17|18)/.test(p.provision.id))) {
    console.log(`  BLOCKED ${g.provision.id} reason=${g.blockReason}`);
  }
}

// ----- Section C: historical treatment demo on 2 real scenarios -----
console.log("\n" + "=".repeat(100));
console.log("SECTION C: historical treatment on real scenario text");
const HIST_SCENARIOS = [
  "A related-party transaction with a subsidiary was not disclosed in the related-party register.",
  "The Compliance Officer position was vacant for several months with no qualified replacement appointed.",
];
for (const text of HIST_SCENARIOS) {
  const result = analyzeScenario({ freeText: text }, LIVE_FINDINGS, LIVE_PROVISIONS, []);
  console.log(`\nTEXT: ${text}`);
  console.log(`  provisionResults: ${result.provisionResults.length}, historicalTreatment entries: ${result.historicalTreatment.entries.length}`);
  const notCurrentCandidate = result.historicalTreatment.entries.filter((e) => e.currentCandidateTier === "not_currently_a_candidate" || e.currentCandidateTier === "requires_additional_fact");
  console.log(`  entries historically-present-but-not-currently-primary: ${notCurrentCandidate.length}`);
  for (const e of notCurrentCandidate.slice(0, 5)) {
    console.log(`    ${e.provision.id}: comparableMatters=${e.comparableMatterCount} tier=${e.currentCandidateTier}`);
  }
}

// ----- Section D: candidate-tier distribution across the whole corpus -----
console.log("\n" + "=".repeat(100));
console.log("SECTION D: candidate-tier distribution sample (broad multi-family scenario)");
const broadResult = analyzeScenario(
  { freeText: "Financial results contained a misstatement. A related-party transaction was undisclosed. A promoter, in charge of the company's business, diverted funds. The statutory auditor did not rotate as required." },
  LIVE_FINDINGS, LIVE_PROVISIONS, []
);
const tierCounts: Record<string, number> = {};
for (const pr of broadResult.provisionResults) tierCounts[pr.candidateTier] = (tierCounts[pr.candidateTier] ?? 0) + 1;
console.log(tierCounts);
console.log(`gateBlocked: ${broadResult.gateBlockedProvisionResults.length}, contraryOnly: ${broadResult.contraryOnlyProvisionResults.length}`);
