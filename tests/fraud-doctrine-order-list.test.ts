// Fraud Doctrine Analyser's "Orders applying this doctrine" card
// (src/app/(app)/fraud-test/page.tsx, grouping logic in
// src/lib/fraudDoctrineApplication.ts).
//
// SPARC final surgical correction: DOCTRINE_APPLIED_RECORD_IDS was
// previously ["REL-01", "REL-02"] only, after a prior pass wrongly
// excluded Zee/Varanium for "unreachable primary text" and wrongly
// believed Debock/Max had no linked finding record at all. The completed
// post-deployment official-source audit obtained and read every relevant
// SEBI order PDF directly and confirmed seven orders (Rajesh Exports,
// Hexa Tradex, Zee Entertainment, Max Financial Services, Varanium Cloud,
// Debock Industries, Trafiksol) as SEBI itself applying/adopting the
// doctrine in its own reasoning. These tests guard the corrected list,
// the one-card-per-order grouping (including multi-finding orders beyond
// REL), and the new temporal safety guard.
import { readFileSync } from "fs";
import { describe, expect, it } from "vitest";
import { DOCTRINE_JUDGMENT_DATE, groupAppliedFindingsByOrder } from "@/lib/fraudDoctrineApplication";
import type { ScenarioFinding } from "@/types/domain";

function finding(overrides: Partial<ScenarioFinding> & Pick<ScenarioFinding, "recordId" | "orderIds">): ScenarioFinding {
  return {
    caseName: "Test Matter",
    findingStatus: "Prima facie",
    scenarioTitle: "Test scenario",
    officialSourceUrl: "https://www.sebi.gov.in/test.html",
    category: null,
    ...overrides,
  } as ScenarioFinding;
}

const POST_CUTOFF_DATE = "2026-06-03"; // safely after DOCTRINE_JUDGMENT_DATE, matches Rajesh Exports' real order date

describe("groupAppliedFindingsByOrder: one order = one authority card", () => {
  it("two findings sharing the same originating order (REL-01, REL-02) are grouped into ONE card, not two", () => {
    const groups = groupAppliedFindingsByOrder(
      [
        finding({ recordId: "REL-01", orderIds: ["order-rel"], caseName: "Rajesh Exports Limited" }),
        finding({ recordId: "REL-02", orderIds: ["order-rel"], caseName: "Rajesh Exports Limited" }),
      ],
      new Map([["order-rel", POST_CUTOFF_DATE]])
    );
    expect(groups).toHaveLength(1);
    expect(groups[0].orderId).toBe("order-rel");
    expect(groups[0].findings.map((f) => f.recordId)).toEqual(["REL-01", "REL-02"]);
  });

  it("Zee Entertainment's two findings (ZEE-PLEDGE-01, ZEE-PLEDGE-02) render as ONE order card", () => {
    const groups = groupAppliedFindingsByOrder(
      [
        finding({ recordId: "ZEE-PLEDGE-01", orderIds: ["order-zee"], caseName: "Zee Entertainment Enterprises Ltd." }),
        finding({ recordId: "ZEE-PLEDGE-02", orderIds: ["order-zee"], caseName: "Zee Entertainment Enterprises Ltd." }),
      ],
      new Map([["order-zee", "2026-07-31"]])
    );
    expect(groups).toHaveLength(1);
    expect(groups[0].findings.map((f) => f.recordId)).toEqual(["ZEE-PLEDGE-01", "ZEE-PLEDGE-02"]);
  });

  it("Varanium Cloud's three findings (VCL-01, VCL-02, VCL-03) render as ONE order card", () => {
    const groups = groupAppliedFindingsByOrder(
      [
        finding({ recordId: "VCL-01", orderIds: ["order-vcl"], caseName: "Varanium Cloud Ltd" }),
        finding({ recordId: "VCL-02", orderIds: ["order-vcl"], caseName: "Varanium Cloud Ltd" }),
        finding({ recordId: "VCL-03", orderIds: ["order-vcl"], caseName: "Varanium Cloud Ltd" }),
      ],
      new Map([["order-vcl", "2026-08-25"]])
    );
    expect(groups).toHaveLength(1);
    expect(groups[0].findings.map((f) => f.recordId)).toEqual(["VCL-01", "VCL-02", "VCL-03"]);
  });

  it("findings from genuinely different orders produce separate cards", () => {
    const groups = groupAppliedFindingsByOrder(
      [finding({ recordId: "A-01", orderIds: ["order-a"] }), finding({ recordId: "B-01", orderIds: ["order-b"] })],
      new Map([
        ["order-a", POST_CUTOFF_DATE],
        ["order-b", POST_CUTOFF_DATE],
      ])
    );
    expect(groups).toHaveLength(2);
  });

  it("two findings that merely share a case name but not an order id are never merged into one card", () => {
    const groups = groupAppliedFindingsByOrder(
      [
        finding({ recordId: "X-01", orderIds: ["order-x1"], caseName: "Same Company Ltd" }),
        finding({ recordId: "X-02", orderIds: ["order-x2"], caseName: "Same Company Ltd" }),
      ],
      new Map([
        ["order-x1", POST_CUTOFF_DATE],
        ["order-x2", POST_CUTOFF_DATE],
      ])
    );
    expect(groups).toHaveLength(2);
  });

  it("a finding with no originating order (empty orderIds) is silently excluded, never invented into its own card", () => {
    const groups = groupAppliedFindingsByOrder([finding({ recordId: "NO-ORDER-01", orderIds: [] })], new Map());
    expect(groups).toHaveLength(0);
  });

  it("empty input produces an empty list", () => {
    expect(groupAppliedFindingsByOrder([], new Map())).toEqual([]);
  });

  it("a finding's own findingStatus passes through unchanged -- grouping never overwrites or generalises a finding's real disposition (e.g. a negative/exonerating one) into something implying the doctrine's application equals a contravention being established", () => {
    const groups = groupAppliedFindingsByOrder(
      [finding({ recordId: "HEXA-01", orderIds: ["order-hexa"], caseName: "Hexa Tradex Limited", findingStatus: "Not Confirmed in Final Order" })],
      new Map([["order-hexa", "2026-07-24"]])
    );
    expect(groups[0].findings[0].findingStatus).toBe("Not Confirmed in Final Order");
  });
});

describe("groupAppliedFindingsByOrder: temporal safety guard", () => {
  it("a finding whose order predates the judgment (28 May 2026) is excluded even though its id is present in the input -- the exact 'accidentally added to the curated list' regression case", () => {
    const groups = groupAppliedFindingsByOrder(
      [finding({ recordId: "PRE-CUTOFF-01", orderIds: ["order-pre"], caseName: "Pre-Judgment Order" })],
      new Map([["order-pre", "2026-05-28"]])
    );
    expect(groups).toHaveLength(0);
  });

  it("a finding whose order has no date on file (null) is excluded, never assumed eligible", () => {
    const groups = groupAppliedFindingsByOrder(
      [finding({ recordId: "NO-DATE-01", orderIds: ["order-nodate"] })],
      new Map([["order-nodate", null]])
    );
    expect(groups).toHaveLength(0);
  });

  it("a finding whose order id is entirely absent from the date map is excluded, never assumed eligible", () => {
    const groups = groupAppliedFindingsByOrder([finding({ recordId: "UNKNOWN-ORDER-01", orderIds: ["order-unknown"] })], new Map());
    expect(groups).toHaveLength(0);
  });

  it("a finding whose order is dated exactly on the judgment date (29 May 2026) IS included -- the cutoff is inclusive", () => {
    const groups = groupAppliedFindingsByOrder(
      [finding({ recordId: "SAME-DAY-01", orderIds: ["order-sameday"] })],
      new Map([["order-sameday", DOCTRINE_JUDGMENT_DATE]])
    );
    expect(groups).toHaveLength(1);
  });

  it("DOCTRINE_JUDGMENT_DATE is the documented 29 May 2026 cutoff", () => {
    expect(DOCTRINE_JUDGMENT_DATE).toBe("2026-05-29");
  });
});

describe("Fraud Doctrine Analyser page: the applied-doctrine record list reflects the completed official-source audit", () => {
  const page = readFileSync(new URL("../src/app/(app)/fraud-test/page.tsx", import.meta.url), "utf8");

  function appliedIds(): string[] {
    const match = page.match(/DOCTRINE_APPLIED_RECORD_IDS = \[([^\]]*)\]/);
    expect(match).not.toBeNull();
    return match![1]
      .split(",")
      .map((s) => s.trim().replace(/"/g, ""))
      .filter(Boolean);
  }

  it("all seven verified Category-A orders' findings are present, matching the audit exactly", () => {
    expect(appliedIds().sort()).toEqual(
      [
        "REL-01",
        "REL-02",
        "HEXA-01",
        "ZEE-PLEDGE-01",
        "ZEE-PLEDGE-02",
        "MFS-01",
        "VCL-01",
        "VCL-02",
        "VCL-03",
        "DBK-01",
        "TRF-01",
      ].sort()
    );
  });

  it("Nalwa Sons is deliberately NOT included -- its order incorporates Hexa's findings by reference rather than independently applying the doctrine", () => {
    expect(appliedIds().some((id) => id.startsWith("NALWA"))).toBe(false);
  });

  it("the page groups by order (imports groupAppliedFindingsByOrder) rather than rendering one list item per finding", () => {
    expect(page).toMatch(/groupAppliedFindingsByOrder/);
  });

  it("the page fetches orders and passes an order-date map into the grouping call, wiring the temporal safety guard", () => {
    expect(page).toMatch(/getOrders/);
    expect(page).toMatch(/orderDateById/);
    expect(page).toMatch(/groupAppliedFindingsByOrder\(appliedFindings, orderDateById\)/);
  });

  it("the section explains the applied-vs-discussed-vs-noticee-only distinction, not merely a date cutoff", () => {
    expect(page.toLowerCase()).toMatch(/noticee cited it in\s*\n?\s*submissions|noticee-only/i);
  });

  it("the page's own commentary does not equate 'applied' with 'contravention established' -- it explicitly says findings concluding non-establishment are listed on the same footing", () => {
    expect(page).toMatch(/NOT established is listed here on the same footing/);
  });
});
