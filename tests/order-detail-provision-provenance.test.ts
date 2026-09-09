// Case Detail's "Provisions considered" section (src/app/(app)/orders/[id]/page.tsx)
// draws on provisionsConsideredForOrder (src/lib/orderProvisionsConsidered.ts).
// finding_provisions carries no order-specific column -- a provision link
// belongs to a FINDING, never to a (finding, order) pair -- confirmed via a
// read-only schema query during the pre-demo walkthrough pass. A finding
// whose orderIds spans two orders (Seacoast's SSSL-* findings, Par Drugs'
// PDCL-01, each linked to both an interim and a later order) must never
// have its provisions silently asserted as "considered in this specific
// order": Case Detail must flag those provisions as finding-level-only
// linkage, exactly the same conservative pattern already applied to
// Compare Scenarios (see tests/scenario-comparison.test.ts's own
// "order-specific provision provenance" describe block).
import { describe, expect, it } from "vitest";
import { provisionsConsideredForOrder } from "@/lib/orderProvisionsConsidered";
import type { ScenarioFinding } from "@/types/domain";

function makeFinding(overrides: Partial<ScenarioFinding> & { recordId: string; orderIds: string[] }): ScenarioFinding {
  return {
    caseName: "Mock Case Limited",
    category: null,
    scenarioTitle: "Mock finding",
    factualPattern: "Mock factual pattern.",
    provisionsConsideredRaw: null,
    provisionIds: [],
    provisionLinks: [],
    noticeeActors: [],
    findingStatus: "Prima facie",
    interimParagraphReferences: null,
    finalParagraphReferences: null,
    qualification: null,
    officialSourceUrl: "https://www.sebi.gov.in/enforcement/orders/mock",
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

const SEACOAST_INTERIM_ID = "ad32246b-0593-45b3-bd53-14c590161145";
const SEACOAST_FINAL_ID = "cbe246c9-02d5-482f-966a-c140860b7af5";
const PAR_DRUGS_INTERIM_ID = "39d66f9f-14b2-4441-9fa4-b76d9bcd75d9";
const PAR_DRUGS_CONFIRMATORY_ID = "ce0b50a9-8052-4247-ac11-2f7914dea82d";
const RAJESH_ORDER_ID = "c45c8bb0-4db2-4ef5-a7b7-f41dc8f3b22d";
const TARAPUR_ORDER_ID = "fdf46fec-831a-411e-ba10-0f382cd51e40";

describe("provisionsConsideredForOrder: order-specific provision provenance never manufactured from finding.orderIds alone", () => {
  it("Seacoast: a multi-order finding's (SSSL-03, orderIds spans Interim + Final) provisions are flagged orderSpecific=false, with the row-level qualifier set", () => {
    const sssl03 = makeFinding({
      recordId: "SSSL-03",
      orderIds: [SEACOAST_INTERIM_ID, SEACOAST_FINAL_ID],
      findingStatus: "Not Confirmed in Final Order",
      provisionLinks: [{ provisionId: "PFUTP-3-b", justifyingTags: [], relationship: "not_upheld" }],
    });
    const findingsOnInterimOrder = [sssl03]; // allFindings.filter(f => f.orderIds.includes(order.id))
    const result = provisionsConsideredForOrder(findingsOnInterimOrder);

    expect(result.hasFindingLevelOnlyProvisionLinkage).toBe(true);
    const entry = result.provisions.find((p) => p.provisionId === "PFUTP-3-b");
    expect(entry).toBeDefined();
    expect(entry?.orderSpecific).toBe(false);
  });

  it("Par Drugs: PDCL-01 (orderIds spans Interim + Confirmatory) produces the same finding-level flag whichever order's page it is viewed from", () => {
    const pdcl01 = makeFinding({
      recordId: "PDCL-01",
      orderIds: [PAR_DRUGS_INTERIM_ID, PAR_DRUGS_CONFIRMATORY_ID],
      findingStatus: "Confirmed at interim",
      provisionLinks: [{ provisionId: "LODR-23-2", justifyingTags: [], relationship: "upheld" }],
    });

    const fromInterim = provisionsConsideredForOrder([pdcl01]);
    const fromConfirmatory = provisionsConsideredForOrder([pdcl01]);

    for (const result of [fromInterim, fromConfirmatory]) {
      expect(result.hasFindingLevelOnlyProvisionLinkage).toBe(true);
      expect(result.provisions.find((p) => p.provisionId === "LODR-23-2")?.orderSpecific).toBe(false);
    }
  });

  it("finding-level provision linkage remains VISIBLE (never hidden) -- only flagged, never dropped from the list", () => {
    const pdcl01 = makeFinding({
      recordId: "PDCL-01",
      orderIds: [PAR_DRUGS_INTERIM_ID, PAR_DRUGS_CONFIRMATORY_ID],
      provisionLinks: [{ provisionId: "LODR-23-2", justifyingTags: [], relationship: "upheld" }],
    });
    const result = provisionsConsideredForOrder([pdcl01]);
    expect(result.provisions.map((p) => p.provisionId)).toContain("LODR-23-2");
  });

  it("a genuinely single-order finding (Rajesh Exports REL-01) is orderSpecific=true with no finding-level qualifier", () => {
    const rel01 = makeFinding({
      recordId: "REL-01",
      orderIds: [RAJESH_ORDER_ID],
      provisionLinks: [{ provisionId: "PFUTP-4-2-e", justifyingTags: [], relationship: "alleged" }],
    });
    const result = provisionsConsideredForOrder([rel01]);
    expect(result.hasFindingLevelOnlyProvisionLinkage).toBe(false);
    expect(result.provisions.every((p) => p.orderSpecific)).toBe(true);
  });

  it("a genuinely single-order finding (Tarapur TTL-01) is orderSpecific=true with no finding-level qualifier", () => {
    const ttl01 = makeFinding({
      recordId: "TTL-01",
      orderIds: [TARAPUR_ORDER_ID],
      provisionLinks: [{ provisionId: "PFUTP-4-1", justifyingTags: [], relationship: "upheld" }],
    });
    const result = provisionsConsideredForOrder([ttl01]);
    expect(result.hasFindingLevelOnlyProvisionLinkage).toBe(false);
    expect(result.provisions.every((p) => p.orderSpecific)).toBe(true);
  });

  it("a provision independently confirmed by at least one single-order finding stays orderSpecific=true even when a different multi-order finding on the same order ALSO cites it", () => {
    const singleOrderFinding = makeFinding({
      recordId: "X-01",
      orderIds: [SEACOAST_FINAL_ID],
      provisionLinks: [{ provisionId: "PFUTP-4-1", justifyingTags: [], relationship: "upheld" }],
    });
    const multiOrderFinding = makeFinding({
      recordId: "X-02",
      orderIds: [SEACOAST_INTERIM_ID, SEACOAST_FINAL_ID],
      provisionLinks: [{ provisionId: "PFUTP-4-1", justifyingTags: [], relationship: "alleged" }],
    });
    const result = provisionsConsideredForOrder([singleOrderFinding, multiOrderFinding]);
    expect(result.provisions.find((p) => p.provisionId === "PFUTP-4-1")?.orderSpecific).toBe(true);
    // A different, purely finding-level-only provision on the same order set stays flagged.
    expect(result.hasFindingLevelOnlyProvisionLinkage).toBe(false);
  });
});
