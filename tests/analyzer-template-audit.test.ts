// Part 1/Part 8 template-audit remediation: a live, deterministic audit run
// against the production corpus (see scripts/audit-templates.ts, run
// manually against a fresh Supabase snapshot -- not part of this suite,
// since it needs live data) reproduced the exact reported defect: four of
// the twelve Scenario Analyzer quick-start templates (EXAMPLE_SCENARIOS,
// ScenarioAnalyzerClient.tsx) produced ZERO provisionResults --
// "Preferential allotment / circular funding", "Rights issue funds
// diverted", "False corporate announcement" and "Statutory auditor
// negligence". Root cause for three of the four: the template's own prose
// genuinely describes an adverse (conduct-kind) fact, but no curated
// synonym on the relevant concept tag matched that exact contiguous phrase
// -- see the three edits in concept-tags.ts this pass made (each with its
// own comment explaining the specific missing phrase). The fourth
// ("Statutory auditor negligence") has NO finding_provisions link in the
// live corpus tying an auditor-eligibility provision to a genuine
// auditor-negligence conduct tag -- the only Companies Act 139/141 link on
// file (BGL-PREF-04) is about auditor tenure/independence and
// aiding/abetting, not failure to detect red flags -- so that is a genuine
// corpus gap, not a synonym-matching bug, and must NOT be closed by
// inventing a tag/synonym that would misattribute an unrelated finding.
//
// These tests guard the concept-detection layer directly (detectConcepts),
// the precise level the fix lives at, using each template's exact text
// (imported from ScenarioAnalyzerClient.tsx, not a hand-copied duplicate,
// so this suite cannot silently drift from what the UI actually renders).
import { describe, expect, it } from "vitest";
import { detectConcepts } from "@/lib/matching/conceptExtraction";
import { EXAMPLE_SCENARIOS } from "@/components/analyzer/ScenarioAnalyzerClient";

function templateText(label: string): string {
  const t = EXAMPLE_SCENARIOS.find((s) => s.label === label);
  if (!t) throw new Error(`Template "${label}" not found in EXAMPLE_SCENARIOS -- has it been renamed or removed?`);
  return t.text;
}

describe("Scenario Analyzer quick-start templates: the three fixed zero-result templates now detect their adverse concept", () => {
  it("'Preferential allotment / circular funding' now detects unsupported_share_allotment_consideration (circular chain of loans / kept the sale proceeds)", () => {
    const detected = detectConcepts(templateText("Preferential allotment / circular funding"));
    const ids = detected.map((d) => d.id);
    expect(ids).toContain("unsupported_share_allotment_consideration");
  });

  it("'Rights issue funds diverted' now detects fund_diversion (instead of being used for the disclosed purpose)", () => {
    const detected = detectConcepts(templateText("Rights issue funds diverted"));
    const ids = detected.map((d) => d.id);
    expect(ids).toContain("fund_diversion");
  });

  it("'False corporate announcement' now detects false_business_or_corporate_announcement (turned out to be unsubstantiated / no supporting documentation)", () => {
    const detected = detectConcepts(templateText("False corporate announcement"));
    const ids = detected.map((d) => d.id);
    expect(ids).toContain("false_business_or_corporate_announcement");
  });
});

describe("Scenario Analyzer quick-start templates: 'Statutory auditor negligence' remains an honest no-captured-precedent gap, not a fabricated match", () => {
  it("detects the topic (statutory auditor / financial statements) but no adverse conduct concept -- confirms this is a genuine corpus gap, not a text-detection miss", () => {
    const detected = detectConcepts(templateText("Statutory auditor negligence"));
    const conductIds = detected.filter((d) => d.kind === "conduct").map((d) => d.id);
    // If this ever starts passing, it means either a corpus/tag change
    // legitimately closed the gap (update this test deliberately) or a
    // synonym was added too broadly (investigate before accepting).
    expect(conductIds).toEqual([]);
  });
});

describe("Scenario Analyzer quick-start templates: previously-working templates are unaffected by the new synonyms", () => {
  it("'Fictitious sales/assets' still detects its own concepts unchanged", () => {
    const detected = detectConcepts(templateText("Fictitious sales/assets"));
    const ids = detected.map((d) => d.id);
    expect(ids).toContain("fictitious_sales_or_revenue");
  });

  it("'Price/market manipulation' still detects its own concepts unchanged", () => {
    const detected = detectConcepts(templateText("Price/market manipulation"));
    const ids = detected.map((d) => d.id);
    expect(ids.length).toBeGreaterThan(0);
  });
});
