// Fraud Doctrine Analyser's "Orders applying this doctrine" card
// (src/app/(app)/fraud-test/page.tsx, grouping logic in
// src/lib/fraudDoctrineApplication.ts). Post-freeze correction pass
// (Section B): this card's source list, DOCTRINE_APPLIED_RECORD_IDS, used
// to be ["REL-01", "REL-02", "ZEE-PLEDGE-01", "VCL-01"] with no date or
// content check against the underlying orders -- a legal-integrity defect,
// since two of those findings' orders could not be confirmed to actually
// discuss/apply the Reliance Industries Ltd. & Ors. v. SEBI (2026 INSC 585,
// decided 29 May 2026) doctrine in SEBI's own reasoning, only tagged under
// the same broad PFUTP fraud issue. These tests guard the corrected,
// narrower list and the one-card-per-order grouping.
import { readFileSync } from "fs";
import { describe, expect, it } from "vitest";
import { groupAppliedFindingsByOrder } from "@/lib/fraudDoctrineApplication";
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

describe("groupAppliedFindingsByOrder: one order = one authority card", () => {
  it("two findings sharing the same originating order (REL-01, REL-02) are grouped into ONE card, not two", () => {
    const groups = groupAppliedFindingsByOrder([
      finding({ recordId: "REL-01", orderIds: ["order-rel"], caseName: "Rajesh Exports Limited" }),
      finding({ recordId: "REL-02", orderIds: ["order-rel"], caseName: "Rajesh Exports Limited" }),
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0].orderId).toBe("order-rel");
    expect(groups[0].findings.map((f) => f.recordId)).toEqual(["REL-01", "REL-02"]);
  });

  it("findings from genuinely different orders produce separate cards", () => {
    const groups = groupAppliedFindingsByOrder([
      finding({ recordId: "A-01", orderIds: ["order-a"] }),
      finding({ recordId: "B-01", orderIds: ["order-b"] }),
    ]);
    expect(groups).toHaveLength(2);
  });

  it("two findings that merely share a case name but not an order id are never merged into one card", () => {
    const groups = groupAppliedFindingsByOrder([
      finding({ recordId: "X-01", orderIds: ["order-x1"], caseName: "Same Company Ltd" }),
      finding({ recordId: "X-02", orderIds: ["order-x2"], caseName: "Same Company Ltd" }),
    ]);
    expect(groups).toHaveLength(2);
  });

  it("a finding with no originating order (empty orderIds) is silently excluded, never invented into its own card", () => {
    const groups = groupAppliedFindingsByOrder([finding({ recordId: "NO-ORDER-01", orderIds: [] })]);
    expect(groups).toHaveLength(0);
  });

  it("empty input produces an empty list", () => {
    expect(groupAppliedFindingsByOrder([])).toEqual([]);
  });
});

describe("Fraud Doctrine Analyser page: the applied-doctrine record list is narrower and audited", () => {
  const page = readFileSync(new URL("../src/app/(app)/fraud-test/page.tsx", import.meta.url), "utf8");

  it("only REL-01 and REL-02 (the confirmed, content-verified Rajesh Exports interim order) remain in the applied list", () => {
    const match = page.match(/DOCTRINE_APPLIED_RECORD_IDS = \[([^\]]*)\]/);
    expect(match).not.toBeNull();
    const ids = match![1].split(",").map((s) => s.trim().replace(/"/g, "")).filter(Boolean);
    expect(ids.sort()).toEqual(["REL-01", "REL-02"]);
  });

  it("ZEE-PLEDGE-01, ZEE-PLEDGE-02 and VCL-01 no longer appear as unconditionally applying the doctrine (no primary-source confirmation was obtained)", () => {
    const match = page.match(/DOCTRINE_APPLIED_RECORD_IDS = \[([^\]]*)\]/);
    const ids = match![1];
    expect(ids).not.toMatch(/ZEE-PLEDGE-01/);
    expect(ids).not.toMatch(/ZEE-PLEDGE-02/);
    expect(ids).not.toMatch(/VCL-01/);
  });

  it("the page groups by order (imports groupAppliedFindingsByOrder) rather than rendering one list item per finding", () => {
    expect(page).toMatch(/groupAppliedFindingsByOrder/);
  });

  it("the section explains the applied-vs-discussed-vs-noticee-only distinction, not merely a date cutoff", () => {
    expect(page.toLowerCase()).toMatch(/noticee cited it in\s*\n?\s*submissions|noticee-only/i);
  });
});
