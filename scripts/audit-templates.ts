// Part 1 deterministic template audit: reproduces the current Scenario
// Analyzer quick-start template defects against the LIVE production corpus
// (Supabase project aytcrvaagqxyetqckbvb), by loading a fresh snapshot of
// scenario_findings/finding_provisions/legal_provisions/legal_tests (pulled
// via the Supabase MCP tool immediately before this run, saved as JSON in
// the session scratchpad) and running each of the 12 EXAMPLE_SCENARIOS
// quick-start templates from ScenarioAnalyzerClient.tsx through the real,
// unmodified analyzeScenario() engine -- the exact same function the app
// itself calls. Counts are never hard-coded; they are computed fresh here.
import { readFileSync } from "fs";
import { analyzeScenario } from "../src/lib/matching/engine";
import { detectConcepts } from "../src/lib/matching/conceptExtraction";
import { retrievalRuleForProvision } from "../src/data/curated/provision-retrieval-rules";
import type { LegalProvision, LegalTest, ScenarioFinding, FindingStatus, PublicationStatus } from "../src/types/domain";

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
  id: string;
  record_id: string;
  case_name: string;
  category: string | null;
  scenario_title: string;
  factual_pattern: string;
  allegation_text: string | null;
  provisions_considered_raw: string | null;
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
  ingredients_not_established: string[] | null;
  precedent_outcome_note: string | null;
  source_document_verified: boolean;
  paragraph_citation_verified: boolean;
  finding_status_verified: boolean;
  provision_mapping_verified: boolean;
  noticee_mapping_verified: boolean;
  human_legal_review_completed: boolean;
  publication_status: string;
  order_id: string | null;
  final_order_id: string | null;
}

interface RawLink {
  finding_id: string;
  justifying_tags: string[] | null;
  relationship: string | null;
  canonical_id: string;
}

interface RawProvision {
  id: string;
  instrument: string | null;
  instrument_id: string | null;
  issuing_authority: string | null;
  provision_number: string;
  subject: string;
  current_text_verification_status: string;
  official_source_url: string | null;
  law_library_note: string | null;
}

interface RawLegalTest {
  id: string;
  provision_or_issue: string;
  working_principle: string;
  paragraph_anchors: string;
  implementation_guardrail: string;
}

const rawFindings: RawFinding[] = JSON.parse(readFileSync(`${SCRATCH}/findings.json`, "utf8"));
const rawLinks: RawLink[] = JSON.parse(readFileSync(`${SCRATCH}/links.json`, "utf8"));
const rawProvisions: RawProvision[] = JSON.parse(readFileSync(`${SCRATCH}/provisions.json`, "utf8"));
const rawLegalTests: RawLegalTest[] = JSON.parse(readFileSync(`${SCRATCH}/legal-tests.json`, "utf8"));

const linksByFinding = new Map<string, { provisionId: string; justifyingTags: string[]; relationship?: string }[]>();
for (const link of rawLinks) {
  const list = linksByFinding.get(link.finding_id) ?? [];
  list.push({ provisionId: link.canonical_id, justifyingTags: link.justifying_tags ?? [], relationship: link.relationship ?? undefined });
  linksByFinding.set(link.finding_id, list);
}

const findings: ScenarioFinding[] = rawFindings.map((row) => {
  const provisionLinks = linksByFinding.get(row.id) ?? [];
  const orderIds = [row.order_id, row.final_order_id].filter((v): v is string => Boolean(v));
  return {
    recordId: row.record_id,
    caseName: row.case_name,
    orderIds,
    category: row.category,
    scenarioTitle: row.scenario_title,
    factualPattern: row.factual_pattern,
    allegationText: row.allegation_text,
    provisionsConsideredRaw: row.provisions_considered_raw,
    provisionIds: provisionLinks.map((l) => l.provisionId),
    provisionLinks,
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
  };
});

const casesByProvision = new Map<string, Set<string>>();
for (const f of findings) for (const pid of f.provisionIds) {
  const set = casesByProvision.get(pid) ?? new Set<string>();
  set.add(f.caseName);
  casesByProvision.set(pid, set);
}

const provisions: LegalProvision[] = rawProvisions.map((row) => {
  const casesConsidered = [...(casesByProvision.get(row.id) ?? [])];
  const findingsCount = findings.filter((f) => f.provisionIds.includes(row.id)).length;
  return {
    id: row.id,
    instrument: row.instrument ?? "",
    instrumentId: row.instrument_id ?? "",
    issuingAuthority: row.issuing_authority ?? "",
    provisionNumber: row.provision_number,
    subject: row.subject,
    currentTextVerificationStatus: VERIFICATION_STATUS_LABELS[row.current_text_verification_status] ?? "Requires verification",
    officialSource: row.official_source_url,
    ordersConsidered: casesConsidered,
    treatmentInPilotOrders:
      findingsCount > 0
        ? `Cited in ${findingsCount} scenario finding${findingsCount === 1 ? "" : "s"} across ${casesConsidered.length} order${casesConsidered.length === 1 ? "" : "s"}: ${casesConsidered.join(", ")}.`
        : "Not yet cited in any deep-analyzed scenario finding.",
    lawLibraryNote: row.law_library_note,
  };
});

const legalTests: LegalTest[] = rawLegalTests.map((row) => ({
  id: row.id,
  provisionOrIssue: row.provision_or_issue,
  workingPrinciple: row.working_principle,
  paragraphAnchors: row.paragraph_anchors,
  implementationGuardrail: row.implementation_guardrail,
}));

console.log(`Loaded: ${findings.length} findings, ${provisions.length} provisions, ${legalTests.length} legal tests.\n`);

// The 12 audited EXAMPLE_SCENARIOS (Part B quick-start templates), text
// copied verbatim from ScenarioAnalyzerClient.tsx.
const TEMPLATES: { label: string; text: string }[] = [
  {
    label: "Fictitious sales/assets",
    text: "For the last three years, the company recorded fictitious sales with counterparties that deny ever transacting with it, and its financial statements show assets that are not genuine and cannot be verified against any underlying delivery, inventory or bank records.",
  },
  {
    label: "False corporate announcement",
    text: "The company made a stock exchange announcement about an acquisition and future revenue projections that turned out to be unsubstantiated, with no supporting documentation for the claims made in the announcement.",
  },
  {
    label: "Statutory auditor negligence",
    text: "The statutory auditor certified the company's financial statements for several years without detecting circular transactions between connected entities, despite the volume and repetitive nature of those transactions.",
  },
  {
    label: "Preferential allotment / circular funding",
    text: "A preferential allotment of shares was allegedly financed through a circular chain of loans and advances. The loans are recorded in the company's audited accounts, but it is unclear whether the third-party lenders were ever examined, and the allottees appear to have kept the sale proceeds from the shares.",
  },
  {
    label: "Funds via personal account",
    text: "Company funds, including statutory and operating payments, were routed through the promoter's personal bank account without clear board approval or disclosure.",
  },
  {
    label: "Rights issue funds diverted",
    text: "The company raised funds through a rights issue and represented to shareholders that the proceeds would be used for stated objects, but a large portion of the money was moved out to related entities instead of being used for the disclosed purpose.",
  },
  {
    label: "Audit Committee lapse",
    text: "The Audit Committee does not appear to have been properly constituted, and annual reports claim meetings were held for which no agendas or minutes can be produced.",
  },
  {
    label: "Related-party transaction not disclosed",
    text: "The company entered into a related-party transaction with a counterparty connected to the promoter, but the transaction was not disclosed in the related-party register and appears to have been misrepresented as an arm's-length dealing with an unconnected vendor.",
  },
  {
    label: "Compliance Officer vacancy",
    text: "The position of Compliance Officer / Company Secretary remained vacant for an extended period without a proper appointment, and no interim arrangement was disclosed to the stock exchanges.",
  },
  {
    label: "False CEO/CFO certification",
    text: "The Chief Executive Officer and Chief Financial Officer signed the quarterly compliance certification despite being aware of misstatements in the financial statements, and the certificate was not duly signed in accordance with the applicable regulation.",
  },
  {
    label: "Director duties / non-cooperation",
    text: "The independent directors failed to raise concerns despite red flags in the related-party transactions placed before the board, and the company did not cooperate with the investigation, failing to produce records called for by summons.",
  },
  {
    label: "Price/market manipulation",
    text: "A group of connected trading accounts executed synchronized trades in the company's shares with no genuine change in beneficial ownership, creating an artificial appearance of trading volume and inducing other investors to deal in the security.",
  },
];

console.log("| Template | Primary | Related/ancillary | Total provisionResults |");
console.log("|---|---|---|---|");
for (const t of TEMPLATES) {
  const result = analyzeScenario({ freeText: t.text }, findings, provisions, legalTests);
  const primary = result.provisionResults.filter((p) => p.candidateTier === "primary_candidate").length;
  const ancillary = result.provisionResults.filter((p) => p.candidateTier === "related_ancillary").length;
  console.log(`| ${t.label} | ${primary} | ${ancillary} | ${result.provisionResults.length} |`);
}

console.log("\n--- Detail per template (provision ids + tier) ---\n");
for (const t of TEMPLATES) {
  const result = analyzeScenario({ freeText: t.text }, findings, provisions, legalTests);
  console.log(`\n## ${t.label}`);
  console.log(`Detected concepts: ${result.detectedConceptLabels.join(", ") || "(none)"}`);
  if (result.semanticAssist.length > 0) {
    console.log(`Semantic-assist corrections: ${JSON.stringify(result.semanticAssist)}`);
  }
  for (const p of result.provisionResults) {
    console.log(`  [${p.candidateTier}] ${p.provision.id} (${p.provision.instrument} ${p.provision.provisionNumber}) legalFunction=${p.legalFunction}`);
  }
}

console.log("\n--- Full result breakdown for the 4 zero-provisionResults templates ---\n");
const ZERO_LABELS = ["False corporate announcement", "Statutory auditor negligence", "Preferential allotment / circular funding", "Rights issue funds diverted"];
for (const t of TEMPLATES.filter((t) => ZERO_LABELS.includes(t.label))) {
  const result = analyzeScenario({ freeText: t.text }, findings, provisions, legalTests);
  console.log(`\n## ${t.label}`);
  console.log(`provisionResults: ${result.provisionResults.length}`);
  console.log(`governingProvisionResults: ${result.governingProvisionResults?.length ?? "(field absent)"}`);
  console.log(`gateBlockedProvisionResults: ${result.gateBlockedProvisionResults?.length ?? "(field absent)"}`);
  console.log(`contraryOnlyProvisionResults: ${result.contraryOnlyProvisionResults?.length ?? "(field absent)"}`);
  console.log(`contradictedProvisionResults: ${result.contradictedProvisionResults?.length ?? "(field absent)"}`);
  for (const g of result.gateBlockedProvisionResults ?? []) {
    console.log(`  BLOCKED: ${g.provision.id} reason=${g.blockReason} note=${g.note.slice(0, 160)}`);
  }
}

console.log("\n--- GATE DIAGNOSTIC: does each primary/ancillary result independently satisfy its own retrieval prerequisite, rather than merely sharing a concept with a historical finding? ---\n");
const REVIEW_LABELS = ["Preferential allotment / circular funding", "False corporate announcement", "Rights issue funds diverted", "Related-party transaction not disclosed"];
for (const t of TEMPLATES.filter((t) => REVIEW_LABELS.includes(t.label))) {
  const result = analyzeScenario({ freeText: t.text }, findings, provisions, legalTests);
  console.log(`\n## ${t.label}`);
  console.log(`Detected concepts: ${result.detectedConceptLabels.join(", ")}`);
  const detectedIds = new Set(detectConcepts(t.text).map((c) => c.id));
  console.log(`Detected concept IDs: ${[...detectedIds].join(", ")}`);
  for (const p of result.provisionResults) {
    const rule = retrievalRuleForProvision(p.provision.id);
    console.log(`  [${p.candidateTier}] ${p.provision.id} legalFunction=${p.legalFunction} GATED=${!!rule} ${rule ? `gateExplanation="${rule.explanation}"` : "(ungated -- relies on precedent's own conduct-tag overlap)"}`);
  }
}
