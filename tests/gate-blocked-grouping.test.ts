// Tests for groupGateBlocked — the demo-polish sprint's grouping of the
// Analyzer's "additional facts required" section. A real scenario can
// gate-block dozens of provisions, each with a genuinely distinct
// retrieval-prerequisite reason, so grouping by identical reason text
// barely compresses anything (verified separately against the live
// production corpus: a 68-provision gate-blocked set produced 60+ distinct
// reason strings). Grouping by legal function (a coarse, already-computed
// categorization shown elsewhere on the page via LegalFunctionTag) gives
// real compression instead. Never changes which provisions are gate-blocked
// or why — grouping only.
import { describe, expect, it } from "vitest";
import { analyzeScenario } from "@/lib/matching/engine";
import { legalTests, provisions, scenarioFindings } from "./fixtures";
import { groupGateBlocked } from "@/components/analyzer/ScenarioAnalyzerClient";
import { compareProvisionNumbers } from "@/lib/provisionOrder";

describe("groupGateBlocked", () => {
  it("preserves every gate-blocked provision across groups, with no duplicates or omissions", () => {
    const result = analyzeScenario(
      { freeText: "The related-party transaction was properly approved by the Audit Committee and shareholders and was appropriately disclosed." },
      scenarioFindings,
      provisions,
      legalTests,
    );
    const groups = groupGateBlocked(result.gateBlockedProvisionResults);
    const groupedIds = groups.flatMap((g) => g.items.map((i) => i.provision.id)).sort();
    const originalIds = result.gateBlockedProvisionResults.map((i) => i.provision.id).sort();
    expect(groupedIds).toEqual(originalIds);
  });

  it("never produces more groups than distinct legal-function categories among the gate-blocked provisions", () => {
    const result = analyzeScenario(
      { freeText: "A listed company entered into a related-party transaction with an entity connected to the promoter group." },
      scenarioFindings,
      provisions,
      legalTests,
    );
    const groups = groupGateBlocked(result.gateBlockedProvisionResults);
    const distinctLegalFunctions = new Set(result.gateBlockedProvisionResults.map((i) => i.legalFunction));
    expect(groups.length).toBe(distinctLegalFunctions.size);
    // No provision appears in more than one group.
    const seenIds = new Set<string>();
    for (const group of groups) {
      for (const item of group.items) {
        expect(seenIds.has(item.provision.id)).toBe(false);
        seenIds.add(item.provision.id);
      }
    }
  });

  it("groups sort largest-first so the most common category reads first", () => {
    const result = analyzeScenario(
      { freeText: "A listed company entered into a related-party transaction with an entity connected to the promoter group." },
      scenarioFindings,
      provisions,
      legalTests,
    );
    const groups = groupGateBlocked(result.gateBlockedProvisionResults);
    for (let i = 1; i < groups.length; i++) {
      expect(groups[i - 1].items.length).toBeGreaterThanOrEqual(groups[i].items.length);
    }
  });

  it("every provision within a group shares that group's own legal function", () => {
    const result = analyzeScenario(
      { freeText: "The independent director failed to raise concerns about a related-party transaction." },
      scenarioFindings,
      provisions,
      legalTests,
    );
    const groups = groupGateBlocked(result.gateBlockedProvisionResults);
    for (const group of groups) {
      for (const item of group.items) {
        expect(item.legalFunction).toBe(group.legalFunction);
      }
    }
  });

  it("sorts provisions within a group by provision number, not match score", () => {
    const result = analyzeScenario(
      { freeText: "A listed company entered into a related-party transaction with an entity connected to the promoter group." },
      scenarioFindings,
      provisions,
      legalTests,
    );
    const groups = groupGateBlocked(result.gateBlockedProvisionResults);
    for (const group of groups) {
      for (let i = 1; i < group.items.length; i++) {
        expect(compareProvisionNumbers(group.items[i - 1].provision.provisionNumber, group.items[i].provision.provisionNumber)).toBeLessThanOrEqual(0);
      }
    }
  });

  it("returns an empty array for no gate-blocked provisions", () => {
    expect(groupGateBlocked([])).toEqual([]);
  });
});
