// Guards the publication/quarantine lifecycle (scenario_findings.publication_status,
// migration 0015_publication_status.sql): Draft, Quarantined and Withdrawn
// findings must never reach the matching engine's output, in either the
// deterministic path or the full-text supplemental search, while Published
// with warning must still be surfaced (with a visible caution left to the
// UI, never silently dropped).
import { describe, expect, it } from "vitest";
import { analyzeScenario } from "@/lib/matching/engine";
import type { LegalProvision, PublicationStatus, ScenarioFinding } from "@/types/domain";

function makeFinding(
  overrides: Partial<ScenarioFinding> & { recordId: string; provisionIds: string[]; publicationStatus: PublicationStatus }
): ScenarioFinding {
  const provisionLinks =
    overrides.provisionLinks ?? overrides.provisionIds.map((provisionId) => ({ provisionId, justifyingTags: [] as string[] }));
  return {
    caseName: "Synthetic Test Matter",
    orderIds: [],
    category: "test",
    scenarioTitle: "Synthetic finding",
    factualPattern: "Synthetic factual pattern for testing.",
    provisionsConsideredRaw: null,
    provisionLinks,
    noticeeActors: [],
    findingStatus: "Confirmed in Final Order",
    interimParagraphReferences: null,
    finalParagraphReferences: "Para 1",
    qualification: null,
    officialSourceUrl: "https://www.sebi.gov.in/example.html",
    transactionTypes: [],
    actorRoles: [],
    evidenceTypes: [],
    allegedConduct: ["fund_diversion"],
    evidentiaryGaps: [],
    precedentOutcomeNote: null,
    ingredientsNotEstablished: [],
    sourceDocumentVerified: true,
    paragraphCitationVerified: true,
    findingStatusVerified: true,
    provisionMappingVerified: true,
    noticeeMappingVerified: true,
    humanLegalReviewCompleted: true,
    ...overrides,
  };
}

function makeProvision(overrides: Partial<LegalProvision> & { id: string }): LegalProvision {
  return {
    instrument: "Test Instrument",
    provisionNumber: "Regulation 1",
    subject: "Test subject",
    currentTextVerificationStatus: "Requires verification",
    officialSource: null,
    ordersConsidered: [],
    treatmentInPilotOrders: "",
    lawLibraryNote: null,
    ...overrides,
  };
}

const EXCLUDED: PublicationStatus[] = ["Draft", "Quarantined", "Withdrawn"];

describe("publication_status exclusion", () => {
  for (const status of EXCLUDED) {
    it(`excludes a finding with publicationStatus "${status}" from the matching engine's results`, () => {
      const provision = makeProvision({ id: `TEST-PROV-PUB-${status}` });
      const finding = makeFinding({
        recordId: `SYN-PUB-${status}`,
        provisionIds: [`TEST-PROV-PUB-${status}`],
        publicationStatus: status,
      });
      const result = analyzeScenario(
        { freeText: "Company funds were diverted." },
        [finding],
        [provision],
        []
      );
      expect(result.provisionResults.find((p) => p.provision.id === `TEST-PROV-PUB-${status}`)).toBeUndefined();
    });
  }

  it('still surfaces a finding with publicationStatus "Published with warning"', () => {
    const provision = makeProvision({ id: "TEST-PROV-PUB-WARN" });
    const finding = makeFinding({
      recordId: "SYN-PUB-WARN",
      provisionIds: ["TEST-PROV-PUB-WARN"],
      publicationStatus: "Published with warning",
    });
    const result = analyzeScenario(
      { freeText: "Company funds were diverted." },
      [finding],
      [provision],
      []
    );
    const pr = result.provisionResults.find((p) => p.provision.id === "TEST-PROV-PUB-WARN");
    expect(pr).toBeDefined();
    expect(pr!.supportingPrecedents[0].finding.publicationStatus).toBe("Published with warning");
  });

  it("excludes a Withdrawn (publicationStatus) finding from the full-text supplemental search too", () => {
    const provision = makeProvision({ id: "TEST-PROV-PUB-FTS" });
    const quarantined = makeFinding({
      recordId: "SYN-PUB-FTS-01",
      provisionIds: ["TEST-PROV-PUB-FTS"],
      publicationStatus: "Quarantined",
    });
    const result = analyzeScenario(
      { freeText: "Company funds were diverted through unusual channels." },
      [],
      [provision],
      [],
      new Map(),
      [quarantined]
    );
    expect(result.fullTextSupplementalFindings.find((f) => f.recordId === "SYN-PUB-FTS-01")).toBeUndefined();
  });
});
