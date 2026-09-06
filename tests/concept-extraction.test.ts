// Guards against the exact failure mode a live user hit: typing the
// singular form of a curated synonym ("a fictitious sale") produced zero
// detected concepts and hence "No potentially relevant provisions" for a
// textbook fictitious-sales scenario, purely because the curated synonym
// list only had the plural form ("fictitious sales") and detection is pure
// substring matching. detectConcepts now also matches the automatically
// generated singular/plural variant of each synonym's last word.
import { describe, expect, it } from "vitest";
import { detectConcepts } from "@/lib/matching/conceptExtraction";

describe("detectConcepts — singular/plural robustness", () => {
  it("matches the plural synonym on file", () => {
    const detected = detectConcepts("The company recorded fictitious sales.");
    expect(detected.map((d) => d.id)).toContain("fictitious_sales_or_assets");
  });

  it("also matches when the scenario uses the singular form", () => {
    const detected = detectConcepts("The company recorded a fictitious sale.");
    expect(detected.map((d) => d.id)).toContain("fictitious_sales_or_assets");
  });

  it("matches a singular-form synonym written as plural in the scenario", () => {
    // "related party" is on file; a scenario written in the plural should
    // still hit it via the generated variant.
    const detected = detectConcepts("Transactions with related parties were not disclosed.");
    expect(detected.map((d) => d.id)).toContain("related_party_counterparty");
  });

  it("does not generate a bogus double-plural for a word already ending in a double s", () => {
    const detected = detectConcepts("The noticee denied access to the investigating authority.");
    expect(detected.map((d) => d.id)).toContain("non_cooperation_with_investigation");
  });

  it("still returns nothing for text with no recognizable CFID concept at all", () => {
    expect(detectConcepts("The weather was pleasant during the site visit.")).toEqual([]);
  });
});

describe("detectConcepts — the exact example-chip regression", () => {
  it("detects fictitious sales/assets from the Scenario Analyzer's own featured example text", () => {
    const text =
      "For the last three years, the company recorded fictitious sales with counterparties that deny ever transacting with it, and its financial statements show assets that are not genuine and cannot be verified against any underlying delivery, inventory or bank records.";
    const detected = detectConcepts(text);
    expect(detected.map((d) => d.id)).toContain("fictitious_sales_or_assets");
  });
});
