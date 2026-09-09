// Final P0 correctness + demo QA pass, P1 item: HistoricalTreatmentCaseEntry
// now carries the actual order date (never fabricated, never derived from a
// filename/string) alongside its order-stage classification — see
// resolveOrderDate in historicalTreatment.ts. Follows the same
// makeOrder/makeFinding/link/makeProvision fixture pattern as
// tests/historical-treatment-correction-pass.test.ts.
import { describe, expect, it } from "vitest";
import { analyzeScenario } from "@/lib/matching/engine";
import type { LegalProvision, Order, ScenarioFinding } from "@/types/domain";

function makeProvision(id: string, provisionNumber: string, subject: string, instrument = "Test Instrument"): LegalProvision {
  return { id, instrument, provisionNumber, subject, currentTextVerificationStatus: "Requires verification", officialSource: null, ordersConsidered: [], treatmentInPilotOrders: "", lawLibraryNote: null };
}
function link(provisionId: string, justifyingTags: string[] = [], relationship?: string) {
  return { provisionId, justifyingTags, relationship };
}
function makeFinding(overrides: Partial<ScenarioFinding> & { recordId: string; provisionLinks: { provisionId: string; justifyingTags: string[]; relationship?: string }[] }): ScenarioFinding {
  return {
    caseName: "Order-Date Test Matter",
    orderIds: [],
    category: "test",
    scenarioTitle: "Order-date test finding",
    factualPattern: "Synthetic factual pattern.",
    provisionsConsideredRaw: null,
    provisionIds: overrides.provisionLinks.map((l) => l.provisionId),
    noticeeActors: [],
    findingStatus: "Confirmed in Final Order",
    interimParagraphReferences: null,
    finalParagraphReferences: "Para 1",
    qualification: null,
    officialSourceUrl: "https://www.sebi.gov.in/example.html",
    transactionTypes: [],
    actorRoles: [],
    evidenceTypes: [],
    allegedConduct: [],
    evidentiaryGaps: [],
    precedentOutcomeNote: null,
    ingredientsNotEstablished: [],
    sourceDocumentVerified: true,
    paragraphCitationVerified: true,
    findingStatusVerified: true,
    provisionMappingVerified: true,
    noticeeMappingVerified: true,
    humanLegalReviewCompleted: false,
    publicationStatus: "Published to search",
    ...overrides,
  };
}
function makeOrder(overrides: Partial<Order> & { id: string; caseName: string }): Order {
  return {
    orderStage: "Interim order",
    orderDate: null,
    orderNumber: null,
    authority: null,
    noticeesCount: 0,
    officialUrl: "https://example.com",
    cfidVerified: true,
    cfidVerificationBasis: "cfid_tag_in_order_number",
    proceduralStatus: "",
    processingStage: "citations_checked",
    retrievalStatus: "success",
    retrievalFailureReason: null,
    scopeNote: null,
    matterId: null,
    officialOrderTitle: null,
    normalizedMatterName: null,
    ...overrides,
  };
}

const LODR_23_2 = makeProvision("LODR-23-2", "Regulation 23(2)", "Prior Audit Committee approval of RPTs.", "LODR Regulations, 2015");
const LODR_30 = makeProvision("LODR-30", "Regulation 30", "Material event/information disclosure.", "LODR Regulations, 2015");

describe("Historical Treatment: order date threading (P1, final QA pass)", () => {
  it("carries the linked order's actual structured date on the case entry", () => {
    const order = makeOrder({ id: "ord-dated", caseName: "Dated Matter Ltd.", matterId: "matter-dated", orderStage: "Final order", orderDate: "2024-05-14" });
    const finding = makeFinding({
      recordId: "DATED-01",
      caseName: "Dated Matter Ltd.",
      orderIds: ["ord-dated"],
      transactionTypes: ["related_party_transaction"],
      allegedConduct: ["rpt_approval_lapse"],
      provisionLinks: [link("LODR-23-2")],
    });
    const result = analyzeScenario(
      { freeText: "A related-party transaction was undisclosed, without the required audit committee approval." },
      [finding], [LODR_23_2], [], new Map(), [], [order]
    );
    const entry = result.historicalTreatment.entries.find((e) => e.provision.id === "LODR-23-2")!;
    const caseEntry = entry.matterOutcomes[0].cases[0];
    expect(caseEntry.orderStageClass).toBe("final_wtm");
    expect(caseEntry.orderDate).toBe("2024-05-14");
  });

  it("is null when the linked order has no structured date on file — never fabricated", () => {
    const order = makeOrder({ id: "ord-undated", caseName: "Undated Matter Ltd.", matterId: "matter-undated", orderStage: "Final order", orderDate: null });
    const finding = makeFinding({
      recordId: "UNDATED-01",
      caseName: "Undated Matter Ltd.",
      orderIds: ["ord-undated"],
      transactionTypes: ["related_party_transaction"],
      allegedConduct: ["rpt_approval_lapse"],
      provisionLinks: [link("LODR-23-2")],
    });
    const result = analyzeScenario(
      { freeText: "A related-party transaction was undisclosed, without the required audit committee approval." },
      [finding], [LODR_23_2], [], new Map(), [], [order]
    );
    const entry = result.historicalTreatment.entries.find((e) => e.provision.id === "LODR-23-2")!;
    expect(entry.matterOutcomes[0].cases[0].orderDate).toBeNull();
  });

  it("uses the date of the order at the SAME picked stage, not a sibling order at a different stage", () => {
    const orderInterim = makeOrder({ id: "ord-i-date", caseName: "Sibling Matter Ltd.", matterId: "matter-sibling", orderStage: "Interim order", orderDate: "2023-01-10" });
    const orderFinal = makeOrder({ id: "ord-f-date", caseName: "Sibling Matter Ltd.", matterId: "matter-sibling", orderStage: "Final order", orderDate: "2024-06-20" });
    const finding = makeFinding({
      recordId: "SIBLING-01",
      caseName: "Sibling Matter Ltd.",
      orderIds: ["ord-i-date", "ord-f-date"],
      transactionTypes: ["material_event_disclosure"],
      allegedConduct: ["non_disclosure_of_information"],
      provisionLinks: [link("LODR-30")],
    });
    const result = analyzeScenario(
      { freeText: "A material event was not disclosed to the stock exchange within the prescribed timeline." },
      [finding], [LODR_30], [], new Map(), [], [orderInterim, orderFinal]
    );
    const entry = result.historicalTreatment.entries.find((e) => e.provision.id === "LODR-30")!;
    const caseEntry = entry.matterOutcomes[0].cases[0];
    // classifyOrderStage picks the highest-priority stage (final over
    // interim) among this finding's linked orders — the date must come
    // from THAT same order, never the interim sibling's date.
    expect(caseEntry.orderStageClass).toBe("final_wtm");
    expect(caseEntry.orderDate).toBe("2024-06-20");
  });
});
