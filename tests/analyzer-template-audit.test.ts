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
import { readFileSync } from "fs";
import { describe, expect, it } from "vitest";
import { detectConcepts } from "@/lib/matching/conceptExtraction";
import { EXAMPLE_SCENARIOS } from "@/components/analyzer/ScenarioAnalyzerClient";
import { FIXED_SCENARIOS } from "@/data/curated/fixed-scenarios";

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

// Part 3 correction: a scenario with zero provisionResults but a non-empty
// overall result (e.g. gate-blocked or governing candidates still present,
// exactly "Statutory auditor negligence"'s case) must carry an explicit,
// restrained "no captured precedent" notice rather than silently omitting
// the primary provisions section. The notice must never read as a legal
// conclusion (no violation, SEBI never considered it, no obligation can
// apply, unsustainable) -- only that this corpus has no structured,
// provision-linked precedent for the facts. Source-guard test (no
// component-render harness in this repo, see other tests/*.test.ts files).
describe("ScenarioAnalyzerClient: zero-provisionResults notice is present, restrained, and correctly guarded", () => {
  const src = readFileSync(new URL("../src/components/analyzer/ScenarioAnalyzerClient.tsx", import.meta.url), "utf8");

  it("carries the exact required heading", () => {
    expect(src).toContain("No captured CFID precedent currently mapped to this scenario.");
  });

  it("explains the notice means only a corpus gap, never a legal conclusion", () => {
    expect(src).toMatch(/does not mean that no violation exists/);
    expect(src).toMatch(/SEBI has never considered/);
    expect(src).toMatch(/no Companies Act or SEBI obligation can apply/);
    expect(src).toMatch(/legally\s*\n?\s*unsustainable/);
  });

  it("is guarded on provisionResults.length === 0 together with hasResults, not shown unconditionally", () => {
    expect(src).toMatch(/result\.hasResults\s*&&\s*result\.provisionResults\.length === 0/);
  });
});

// Part 3 architectural normalization: every quick-start template's
// optional themeId, where present, must resolve to a real FIXED_SCENARIOS
// canonical scenario -- the same registry Compare Scenarios, Law Library
// fact search and Case/Order Detail's "broad CFID scenarios" summary
// already consume (see broadScenarioMatch.ts). A dangling themeId would
// silently break cross-navigation without any visible symptom elsewhere.
describe("EXAMPLE_SCENARIOS: themeId cross-references resolve to a real canonical FIXED_SCENARIOS entry", () => {
  const fixedScenarioIds = new Set(FIXED_SCENARIOS.map((s) => s.id));

  it("every set themeId is a real FIXED_SCENARIOS id", () => {
    for (const template of EXAMPLE_SCENARIOS) {
      if (template.themeId) {
        expect(fixedScenarioIds.has(template.themeId), `"${template.label}" has themeId "${template.themeId}" which is not a real FIXED_SCENARIOS id`).toBe(true);
      }
    }
  });

  // Checkpoint correction D: the prior checkpoint report claimed "9/13"
  // while the code has always carried 10 -- a reporting error in that
  // report, not a code or audit-harness defect (re-verified directly
  // against the current file: "Promoter's personal derivative trades as
  // revenue" also carries financial-statement-misrepresentation, taking
  // the true count to 10). Asserted as an exact count, not a floor, so a
  // future drift in either direction is caught rather than silently
  // tolerated.
  it("exactly 10 of the 13 templates carry a canonical themeId cross-reference", () => {
    const withTheme = EXAMPLE_SCENARIOS.filter((t) => t.themeId).length;
    expect(withTheme).toBe(10);
  });

  it("templates deliberately left without a themeId (genuine corpus gap or a Part-4 split-pending fact pattern) are exactly the expected three", () => {
    const orphans = EXAMPLE_SCENARIOS.filter((t) => !t.themeId).map((t) => t.label);
    expect(orphans.sort()).toEqual(
      ["Director duties / non-cooperation", "False CEO/CFO certification", "Statutory auditor negligence"].sort()
    );
  });
});

// Checkpoint correction D: scripts/audit-templates.ts's own TEMPLATES array
// was a hand-copied duplicate of EXAMPLE_SCENARIOS that had silently
// drifted out of sync -- it omitted "Promoter's personal derivative trades
// as revenue" (the 13th real template), producing an incomplete audit
// report with no visible symptom (the script's own console table simply
// printed 12 rows, which read as complete). Fixed by importing
// EXAMPLE_SCENARIOS directly into the audit script rather than
// hand-copying its contents, so the two can never again drift -- this is a
// source-guard test (the audit script is a side-effecting CLI tool that
// reads a live-corpus snapshot from the scratchpad, not an importable
// module a normal test can safely execute) confirming that fix is in place
// and stays in place: TEMPLATES must be assigned directly from the real
// import, never a separately hand-copied literal array of the same shape.
describe("scripts/audit-templates.ts: TEMPLATES is derived from the real EXAMPLE_SCENARIOS, never a hand-copied duplicate", () => {
  const src = readFileSync(new URL("../scripts/audit-templates.ts", import.meta.url), "utf8");

  it("imports EXAMPLE_SCENARIOS from the real ScenarioAnalyzerClient source", () => {
    expect(src).toMatch(/import\s*\{\s*EXAMPLE_SCENARIOS\s*\}\s*from\s*["']\.\.\/src\/components\/analyzer\/ScenarioAnalyzerClient["']/);
  });

  it("assigns TEMPLATES directly from EXAMPLE_SCENARIOS rather than a separate literal array", () => {
    expect(src).toMatch(/const TEMPLATES:.*=\s*EXAMPLE_SCENARIOS\s*;/);
  });
});
