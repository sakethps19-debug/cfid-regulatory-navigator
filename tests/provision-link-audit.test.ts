// P0 provision-precision remediation: guards getGatedProvisionLinkAuditQueue,
// the pure function behind the link legal-review queue
// (src/app/(app)/admin/provision-link-audit/page.tsx). Originally scoped to
// PFUTP/SEBI-Act-12A only; generalized by the non-PFUTP remediation pass to
// every provision family that now carries a provision-retrieval-rules.ts
// rule (LODR, SEBI Act non-12A, ICDR, Ind AS) — see provisionLinkAudit.ts.
import { describe, expect, it } from "vitest";
import { getGatedProvisionLinkAuditQueue } from "@/lib/provisionLinkAudit";
import type { ScenarioFinding } from "@/types/domain";

function makeFinding(overrides: Partial<ScenarioFinding> & { recordId: string; provisionLinks: ScenarioFinding["provisionLinks"] }): ScenarioFinding {
  return {
    caseName: "Synthetic Matter",
    orderIds: [],
    category: "test",
    scenarioTitle: "Synthetic finding",
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

describe("getGatedProvisionLinkAuditQueue", () => {
  it("includes a finding with an empty-justifyingTags PFUTP link", () => {
    const finding = makeFinding({
      recordId: "REC-01",
      provisionLinks: [{ provisionId: "PFUTP-3-a", justifyingTags: [] }],
    });
    const queue = getGatedProvisionLinkAuditQueue([finding]);
    expect(queue).toHaveLength(1);
    expect(queue[0].unreviewedGatedProvisionIds).toEqual(["PFUTP-3-a"]);
  });

  it("excludes a finding whose PFUTP link already has narrowing justifyingTags", () => {
    const finding = makeFinding({
      recordId: "REC-02",
      provisionLinks: [{ provisionId: "PFUTP-3-a", justifyingTags: ["price_manipulation_nexus"] }],
    });
    expect(getGatedProvisionLinkAuditQueue([finding])).toHaveLength(0);
  });

  it("excludes a finding that only links to a provision with no retrieval rule at all", () => {
    const finding = makeFinding({
      recordId: "REC-03",
      provisionLinks: [{ provisionId: "LODR-27-2-a", justifyingTags: [] }],
    });
    expect(getGatedProvisionLinkAuditQueue([finding])).toHaveLength(0);
  });

  it("includes a finding with an empty-justifyingTags LODR Regulation 23(2) link (gated by the non-PFUTP remediation pass)", () => {
    const finding = makeFinding({
      recordId: "REC-03B",
      provisionLinks: [{ provisionId: "LODR-23-2", justifyingTags: [] }],
    });
    const queue = getGatedProvisionLinkAuditQueue([finding]);
    expect(queue).toHaveLength(1);
    expect(queue[0].unreviewedGatedProvisionIds).toEqual(["LODR-23-2"]);
  });

  it("lists every unreviewed gated provision id for a finding with multiple such links across families", () => {
    const finding = makeFinding({
      recordId: "REC-04",
      provisionLinks: [
        { provisionId: "PFUTP-3-a", justifyingTags: [] },
        { provisionId: "SEBI-ACT-12A-a", justifyingTags: [] },
        { provisionId: "LODR-23-2", justifyingTags: [] },
        { provisionId: "LODR-27-2-a", justifyingTags: [] },
      ],
    });
    const queue = getGatedProvisionLinkAuditQueue([finding]);
    expect(queue).toHaveLength(1);
    expect(queue[0].unreviewedGatedProvisionIds.sort()).toEqual(["LODR-23-2", "PFUTP-3-a", "SEBI-ACT-12A-a"]);
  });

  it("sorts findings with more unreviewed gated links first", () => {
    const oneLinkFinding = makeFinding({ recordId: "REC-ONE", provisionLinks: [{ provisionId: "PFUTP-3-a", justifyingTags: [] }] });
    const twoLinkFinding = makeFinding({
      recordId: "REC-TWO",
      provisionLinks: [
        { provisionId: "PFUTP-3-a", justifyingTags: [] },
        { provisionId: "SEBI-ACT-12A-a", justifyingTags: [] },
      ],
    });
    const queue = getGatedProvisionLinkAuditQueue([oneLinkFinding, twoLinkFinding]);
    expect(queue.map((e) => e.recordId)).toEqual(["REC-TWO", "REC-ONE"]);
  });
});
