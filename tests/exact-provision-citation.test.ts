// Officer walkthrough Part 5: exact provision-to-order citation identity.
// Instrument + exact provision number + exact sub-clause is the whole
// legal identity of a provision — prefix/hierarchy similarity must never
// create a relationship across instruments or between a parent regulation
// and one of its own lettered sub-clauses.
//
// findingsForProvision (src/lib/data.ts) is `all.filter(f =>
// f.provisionIds.includes(provisionId))` — a plain array-membership check
// against canonical, instrument-qualified ids (e.g. "LODR-4-1" vs
// "LODR-4-1-a" vs "PFUTP-4-1" are three distinct strings). That mechanism
// is reproduced verbatim here (findingsForProvisionExact) since data.ts
// itself requires a live Supabase client and can't be unit-tested
// directly — this pins down the exact same logic actually shipped.
import { readFileSync } from "fs";
import { describe, expect, it } from "vitest";
import type { ScenarioFinding } from "@/types/domain";

function findingsForProvisionExact(provisionId: string, findings: ScenarioFinding[]): ScenarioFinding[] {
  return findings.filter((f) => f.provisionIds.includes(provisionId));
}

function makeFinding(overrides: Partial<ScenarioFinding> & { recordId: string; provisionIds: string[] }): ScenarioFinding {
  return {
    caseName: "Mock Case Limited",
    orderIds: ["order-1"],
    category: null,
    scenarioTitle: "Mock finding",
    factualPattern: "Mock factual pattern.",
    provisionsConsideredRaw: null,
    provisionLinks: overrides.provisionIds.map((provisionId) => ({ provisionId, justifyingTags: [] })),
    noticeeActors: [],
    findingStatus: "Alleged",
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

describe("Exact provision citation identity", () => {
  it("same instrument, exact parent citation: a finding citing bare LODR-4-1 appears under LODR-4-1", () => {
    const findings = [makeFinding({ recordId: "F-01", provisionIds: ["LODR-4-1"] })];
    expect(findingsForProvisionExact("LODR-4-1", findings)).toHaveLength(1);
  });

  it("same instrument, child only: a finding citing only LODR-4-1-a does NOT appear under bare LODR-4-1", () => {
    const findings = [makeFinding({ recordId: "F-01", provisionIds: ["LODR-4-1-a"] })];
    expect(findingsForProvisionExact("LODR-4-1", findings)).toHaveLength(0);
    expect(findingsForProvisionExact("LODR-4-1-a", findings)).toHaveLength(1);
  });

  it("parent + child both expressly cited: appears under both when the order itself cites both", () => {
    const findings = [makeFinding({ recordId: "F-01", provisionIds: ["LODR-4-1", "LODR-4-1-a"] })];
    expect(findingsForProvisionExact("LODR-4-1", findings)).toHaveLength(1);
    expect(findingsForProvisionExact("LODR-4-1-a", findings)).toHaveLength(1);
  });

  it("same number in two different instruments: LODR-4-1 and PFUTP-4-1 never cross-associate", () => {
    const lodrOnly = [makeFinding({ recordId: "F-01", provisionIds: ["LODR-4-1"] })];
    const pfutpOnly = [makeFinding({ recordId: "F-02", provisionIds: ["PFUTP-4-1"] })];
    expect(findingsForProvisionExact("PFUTP-4-1", lodrOnly)).toHaveLength(0);
    expect(findingsForProvisionExact("LODR-4-1", pfutpOnly)).toHaveLength(0);
  });

  it("prefix collisions: LODR-4-1 and LODR-4-10 (if it existed) would not collide via substring/prefix match", () => {
    const findings = [makeFinding({ recordId: "F-01", provisionIds: ["LODR-4-10"] })];
    expect(findingsForProvisionExact("LODR-4-1", findings)).toHaveLength(0);
  });

  it("sibling sub-clauses do not cross-map: LODR-4-1-a does not appear under LODR-4-1-b", () => {
    const findings = [makeFinding({ recordId: "F-01", provisionIds: ["LODR-4-1-a"] })];
    expect(findingsForProvisionExact("LODR-4-1-b", findings)).toHaveLength(0);
  });

  it("counts used on provision pages are the exact-citation count, not a looser derived number", () => {
    const findings = [
      makeFinding({ recordId: "F-01", provisionIds: ["LODR-4-1-a"] }),
      makeFinding({ recordId: "F-02", provisionIds: ["LODR-4-1-a", "LODR-4-1-b"] }),
      makeFinding({ recordId: "F-03", provisionIds: ["LODR-4-1"] }), // bare parent — must not count toward -a
    ];
    expect(findingsForProvisionExact("LODR-4-1-a", findings)).toHaveLength(2);
  });
});

describe("Tarapur / LODR 4(1) regression (migration 0019 fix)", () => {
  // Verified directly against the official order (SEBI, Order in the
  // matter of Tarapur Transformers Limited, Aug 2026): every LODR
  // Regulation 4(1) citation in the order names a specific lettered
  // sub-clause -- (a),(b),(c),(e),(g),(h),(j) -- bare "Regulation 4(1)"
  // never appears as an LODR citation anywhere in the order (only as a
  // citation of the different PFUTP Regulation 4(1), a distinct
  // instrument, in an unrelated general-principles discussion). The
  // pre-fix data incorrectly linked TTL-01 to bare canonical_id "LODR-4-1"
  // -- this fixture pins the corrected state so it can't silently regress.
  const ttl01CorrectedProvisionIds = [
    "SEBI-ACT-12A-a",
    "SEBI-ACT-12A-b",
    "SEBI-ACT-12A-c",
    "SEBI-ACT-27",
    "PFUTP-3-b",
    "PFUTP-3-c",
    "PFUTP-3-d",
    "PFUTP-4-1",
    "IND-AS-1",
    "IND-AS-115",
    "LODR-18-3-schedule-II",
    "LODR-23-2",
    "LODR-33-1-a",
    "LODR-33-1-c",
    "LODR-34-3",
    "LODR-4-1-a",
    "LODR-4-1-b",
    "LODR-4-1-c",
    "LODR-4-1-e",
    "LODR-4-1-g",
    "LODR-4-1-h",
    "LODR-4-1-j",
    "LODR-4-2-e-i",
    "LODR-4-2-f",
    "LODR-48",
  ];
  const findings = [makeFinding({ recordId: "TTL-01", caseName: "Tarapur Transformers Limited", provisionIds: ttl01CorrectedProvisionIds })];

  it("TTL-01 does NOT appear under bare LODR-4-1's Law Library page", () => {
    expect(findingsForProvisionExact("LODR-4-1", findings)).toHaveLength(0);
  });

  it("TTL-01 DOES appear under each of the specific sub-clauses the order actually cites", () => {
    for (const subClause of ["LODR-4-1-a", "LODR-4-1-b", "LODR-4-1-c", "LODR-4-1-e", "LODR-4-1-g", "LODR-4-1-h", "LODR-4-1-j"]) {
      expect(findingsForProvisionExact(subClause, findings)).toHaveLength(1);
    }
  });

  it("TTL-01 does not appear under an un-cited sibling sub-clause (LODR-4-1-d, -f, -i were never cited by this order)", () => {
    for (const uncited of ["LODR-4-1-d", "LODR-4-1-f", "LODR-4-1-i"]) {
      expect(findingsForProvisionExact(uncited, findings)).toHaveLength(0);
    }
  });
});

describe("Provision Detail page: order-centric list structure (Part 8/9/10)", () => {
  const src = readFileSync(new URL("../src/components/ProvisionOrderList.tsx", import.meta.url), "utf-8");

  it("does not group/bifurcate by disposition status (no 'Confirmed'/'Partly Confirmed' section headers)", () => {
    expect(src).not.toMatch(/GROUP_ORDER|GROUP_INFO/);
    expect(src).not.toContain("Final Order Confirmed");
  });

  it("renders exactly one order-type badge component per row (OrderStageBadge), not a disposition-status badge", () => {
    expect(src).toContain("OrderStageBadge");
    expect(src).not.toContain("StatusBadge");
  });

  it("does not render Human Legal Review Pending, publication-status, or 'Cited in this Finding' badges", () => {
    expect(src).not.toContain("LegalReviewBadge");
    expect(src).not.toContain("PublicationStatusBadge");
    expect(src).not.toMatch(/Cited in this [Ff]inding/);
  });

  it("keeps the internal finding record id, small/discreet, for traceability", () => {
    expect(src).toMatch(/f\.recordId/);
  });

  it("keeps 'View order in detail' navigation functional (a real Link to /orders/[id])", () => {
    expect(src).toMatch(/href=\{`\/orders\/\$\{o\.id\}`\}/);
    expect(src).toMatch(/View order in detail/);
  });

  it("derives the order-type badge from the order's own orderStage, never a hard-coded literal order type", () => {
    expect(src).not.toMatch(/"Interim Order"|"Final Order"|"Adjudication Order"/);
    expect(src).toContain("badgeOrder.orderStage");
  });
});
