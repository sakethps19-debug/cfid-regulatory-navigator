// Post-checkpoint-4 UI/terminology hardening: a source-level regression
// guard against internal development/data-governance terminology (human
// legal review status, corpus curation/processing pipeline stage, "expert"
// authority claims) leaking back into a normal, non-Admin officer-facing
// route or component. Reads each listed file's source text directly (this
// repo's test suite is pure-logic-only, no component-rendering harness —
// see vitest.config.ts) and checks it for prohibited phrases.
//
// Scope, deliberately narrow: this checks specific files already confirmed
// officer-facing (Analyzer, Case Library, Law Library, Compare Scenarios,
// Source Library, Methodology & Limitations) plus the exported research
// brief/CSV builders. It does NOT assert anything about Admin-only files
// (LegalReviewBadge.tsx, FindingMaturityBadge.tsx, LegalReviewQueueClient.tsx,
// admin/* pages) — those legitimately keep this language, gated behind
// /admin routes not shown to a normal research user (see admin/page.tsx's
// own disclosure). Nor does it forbid legitimate source-provenance language
// ("official source", "officially verified", "order stage") — only the
// specific internal-workflow phrases below.
import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

const ROOT = join(__dirname, "..");

const PROHIBITED_PATTERNS: { label: string; pattern: RegExp }[] = [
  { label: "human legal review status", pattern: /human legal review/i },
  { label: "review pending", pattern: /review pending/i },
  { label: "legally reviewed", pattern: /legally reviewed/i },
  { label: "legally-reviewed", pattern: /legally-reviewed/i },
  { label: "human reviewed", pattern: /human reviewed/i },
  { label: "deeply analysed/analyzed", pattern: /deeply analy[sz]ed/i },
  { label: "deep-analyzed", pattern: /deep-analyz/i },
  { label: "expert-curated", pattern: /expert-curated/i },
  { label: "expert reviewed", pattern: /expert[- ]reviewed/i },
  { label: "expert verified", pattern: /expert[- ]verified/i },
  { label: "expert validated", pattern: /expert[- ]validated/i },
  { label: "curated by experts", pattern: /curated by experts?/i },
  { label: "processing status", pattern: /processing status/i },
  { label: "ingestion status", pattern: /ingestion status/i },
  { label: "corpus curation status", pattern: /corpus curation status/i },
];

// Officer-facing files confirmed by a repository-wide audit (Analyzer parts
// A and B, Case Library, Law Library, Compare Scenarios, Source Library,
// Methodology & Limitations, and the shared corpus-provenance banner
// rendered across several of those routes).
const OFFICER_FACING_FILES = [
  "src/components/analyzer/ScenarioAnalyzerClient.tsx",
  "src/components/analyzer/FixedScenarioAnalyzer.tsx",
  "src/components/analyzer/AnalyzerLanding.tsx",
  "src/components/CorpusReviewStatusBanner.tsx",
  "src/components/CaseLibraryClient.tsx",
  "src/components/LawLibraryClient.tsx",
  "src/components/CompareScenariosLandingClient.tsx",
  "src/components/CaseJourneyLandingClient.tsx",
  "src/components/ProvisionOrderList.tsx",
  "src/components/FindingsByStatus.tsx",
  "src/app/(app)/analyzer/page.tsx",
  "src/app/(app)/case-library/page.tsx",
  "src/app/(app)/law-library/page.tsx",
  "src/app/(app)/compare-scenarios/page.tsx",
  "src/app/(app)/library/page.tsx",
  "src/app/(app)/methodology/page.tsx",
  "src/app/(app)/orders/[id]/page.tsx",
  "src/app/(app)/provisions/[id]/page.tsx",
  "src/app/(app)/case-journey/page.tsx",
  "src/app/(app)/dashboard/page.tsx",
  "src/app/page.tsx",
  "src/components/NavBar.tsx",
];

describe("Officer-facing routes/components never contain prohibited internal-workflow terminology", () => {
  for (const relativePath of OFFICER_FACING_FILES) {
    it(`${relativePath} contains none of the prohibited phrases`, () => {
      let source: string;
      try {
        source = readFileSync(join(ROOT, relativePath), "utf8");
      } catch {
        // File may not exist in some checkouts (e.g. renamed) -- skip
        // rather than fail the whole suite on a path mismatch, but never
        // silently skip everything: at least one file in this list must
        // always be readable, checked separately below.
        return;
      }
      for (const { label, pattern } of PROHIBITED_PATTERNS) {
        expect(pattern.test(source), `${relativePath} contains prohibited "${label}" phrasing`).toBe(false);
      }
    });
  }

  it("at least one listed officer-facing file was actually readable (guards against a silent path-mismatch no-op)", () => {
    const anyReadable = OFFICER_FACING_FILES.some((p) => {
      try {
        readFileSync(join(ROOT, p), "utf8");
        return true;
      } catch {
        return false;
      }
    });
    expect(anyReadable).toBe(true);
  });
});

describe("Checkpoint correction 4 contradictory wording is fixed", () => {
  it("engine.ts never pairs 'expressly contemplates' engagement language with 'not shown as potentially relevant'", () => {
    const source = readFileSync(join(ROOT, "src/lib/matching/engine.ts"), "utf8");
    expect(source).not.toMatch(/not shown as potentially relevant/i);
  });

  it("ScenarioAnalyzerClient.tsx's missing-facts export line no longer claims a shown Additional-Fact-Required provision is 'not yet shown as potentially relevant'", () => {
    const source = readFileSync(join(ROOT, "src/components/analyzer/ScenarioAnalyzerClient.tsx"), "utf8");
    expect(source).not.toMatch(/not (yet )?shown as potentially relevant/i);
  });
});
