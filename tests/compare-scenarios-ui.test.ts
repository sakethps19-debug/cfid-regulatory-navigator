// Compare Scenarios: UI wiring source guards -- navigation, source
// traceability, responsive layout, and the "no Analyzer/LLM" scope
// boundary, following the same readFileSync + regex/string-assertion
// pattern as tests/case-journey.test.ts and tests/responsive-layout-pass
// .test.ts.
import { readFileSync } from "fs";
import { describe, expect, it } from "vitest";

function src(path: string): string {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

describe("navigation: Compare Scenarios under More, primary nav untouched", () => {
  const navbar = src("src/components/NavBar.tsx");

  it("adds Compare Scenarios to the More (secondary) nav, alongside Case Journey", () => {
    expect(navbar).toMatch(/href:\s*"\/compare-scenarios",\s*label:\s*"Compare Scenarios"/);
    expect(navbar).toContain('{ href: "/case-journey", label: "Case Journey" }');
  });

  it("does not promote Compare Scenarios into primary navigation, and Analyze/Cases/Law remain in primary nav", () => {
    const primaryNavMatch = navbar.match(/const PRIMARY_NAV_ITEMS = \[([\s\S]*?)\];/);
    expect(primaryNavMatch).toBeTruthy();
    const primaryNavBlock = primaryNavMatch![1];
    expect(primaryNavBlock).not.toContain("compare-scenarios");
    expect(primaryNavBlock).toContain('{ href: "/analyzer", label: "Analyze" }');
    expect(primaryNavBlock).toContain('{ href: "/case-library", label: "Cases" }');
    expect(primaryNavBlock).toContain('{ href: "/law-library", label: "Law" }');
  });
});

describe("Compare Scenarios does not modify Case Journey, Analyzer, Cases, Law, or migration 0024", () => {
  it("Case Journey's own lib/route files are untouched by this pass (still present, unmodified in scope)", () => {
    // Sanity: these files still exist and Compare Scenarios's own lib does
    // not import from them (a genuine cross-feature dependency would be a
    // scope violation per the task's explicit exclusions).
    const caseJourneyLib = src("src/lib/caseJourney.ts");
    expect(caseJourneyLib).toContain("export function buildCaseJourney");
    const scenarioComparisonLib = src("src/lib/scenarioComparison.ts");
    expect(scenarioComparisonLib).not.toMatch(/from "@\/lib\/caseJourney"/);
  });

  it("migration 0024 file is untouched (byte-identical marker: still contains its own safety-assertion DO block)", () => {
    const migration = src("supabase/migrations/0024_order_type_governing_classification_corrections.sql");
    expect(migration).toContain("Group A final_order correction");
  });

  it("does not import the free-text Analyzer's ScenarioAnalyzerClient or the /api/analyze route", () => {
    const page = src("src/app/(app)/compare-scenarios/[scenarioId]/page.tsx");
    const client = src("src/components/CompareScenariosResultClient.tsx");
    for (const f of [page, client]) {
      expect(f).not.toMatch(/ScenarioAnalyzerClient/);
      expect(f).not.toMatch(/api\/analyze/);
    }
  });
});

describe("scope boundary: no LLM, no vector similarity, no API calls anywhere in this feature's own files", () => {
  const files = [
    "src/lib/scenarioComparison.ts",
    "src/app/(app)/compare-scenarios/page.tsx",
    "src/app/(app)/compare-scenarios/[scenarioId]/page.tsx",
    "src/components/CompareScenariosLandingClient.tsx",
    "src/components/CompareScenariosResultClient.tsx",
  ];

  it.each(files)("%s contains no fetch()/API call and no LLM/vector-similarity CODE (comments describing the deliberate absence are fine)", (path) => {
    const codeOnly = src(path)
      .split("\n")
      .filter((line) => !line.trim().startsWith("//") && !line.trim().startsWith("*"))
      .join("\n");
    expect(codeOnly).not.toMatch(/\bfetch\(/);
    expect(codeOnly.toLowerCase()).not.toMatch(/openai|anthropic|embedding|cosine|vector[_ ]?similarity/);
    expect(codeOnly).not.toMatch(/from ["'](openai|@anthropic-ai)/);
  });
});

describe("source traceability: Case Detail link and official SEBI source retained", () => {
  const client = src("src/components/CompareScenariosResultClient.tsx");

  it("links each row to its own order's Case Detail page", () => {
    expect(client).toMatch(/href=\{`\/orders\/\$\{row\.order\.id\}`\}/);
  });

  it("renders the official SEBI source link via the shared SourceLink component", () => {
    expect(client).toMatch(/<SourceLink href=\{row\.order\.officialUrl\}/);
  });

  it("never fabricates a paragraph reference -- only renders paragraphReference when present on the actual direction record", () => {
    expect(client).toMatch(/d\.paragraphReference\s*&&/);
  });
});

describe("negative-precedent wording: 'Contravention not established', never 'not upheld' as a provision badge", () => {
  const client = src("src/components/CompareScenariosResultClient.tsx");

  it("renders the exact approved wording for a notUpheldOnly provision", () => {
    expect(client).toContain("Contravention not established");
    expect(client).not.toMatch(/>\s*Not upheld\s*</);
  });
});

describe("order-specific provision provenance UI: correct wording, shown only when needed", () => {
  const client = src("src/components/CompareScenariosResultClient.tsx");

  it("uses 'Provisions considered in this order' for order-specific rows and 'Provisions linked to matched finding(s)' otherwise, driven by hasFindingLevelOnlyProvisionLinkage", () => {
    expect(client).toContain("Provisions considered in this order");
    expect(client).toContain("Provisions linked to matched finding(s)");
    expect(client).toMatch(/row\.hasFindingLevelOnlyProvisionLinkage\s*\?\s*"Provisions linked to matched finding\(s\)"\s*:\s*"Provisions considered in this order"/);
  });

  it("shows the finding-level qualifier note only conditionally on hasFindingLevelOnlyProvisionLinkage, never unconditionally", () => {
    expect(client).toContain("Provision linkage is recorded at finding level in the current corpus and may span more than one captured order.");
    expect(client).toMatch(/row\.hasFindingLevelOnlyProvisionLinkage\s*&&\s*\(/);
  });

  it("marks a non-order-specific provision badge distinctly (Finding-level tag), never silently identical to an order-specific one", () => {
    expect(client).toMatch(/!summary\.orderSpecific\s*&&/);
    expect(client).toContain("Finding-level");
  });

  it("the column header for the desktop table stays neutral ('Provisions') since the specific per-row wording can't live in a shared <th>", () => {
    expect(client).toMatch(/<th[^>]*>Provisions<\/th>/);
    expect(client).not.toMatch(/<th[^>]*>Provisions considered<\/th>/);
  });
});

describe("responsive layout: reuses the wide app shell, no forced desktop-only width", () => {
  it("the result client renders both a desktop/tablet table (md:block) and a stacked mobile card list (md:hidden), same dual-render pattern as CaseLibraryClient", () => {
    const client = src("src/components/CompareScenariosResultClient.tsx");
    expect(client).toMatch(/hidden overflow-x-auto[^"]*md:block/);
    expect(client).toMatch(/md:hidden/);
  });

  it("landing and result grids use responsive column classes (stack on mobile, gain columns at sm/xl), never a fixed desktop-only pixel width", () => {
    const landing = src("src/components/CompareScenariosLandingClient.tsx");
    expect(landing).toMatch(/grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3/);
    for (const f of [landing, src("src/components/CompareScenariosResultClient.tsx")]) {
      // A min-w-[...px] floor on a table inside an overflow-x-auto wrapper
      // is the established, already-approved pattern (see CaseLibraryClient)
      // for a data-dense table that must not be crushed illegibly -- it is
      // not the anti-pattern this guard targets, which is a bare w-[...px]
      // that would force the whole page/container to a fixed width.
      expect(f).not.toMatch(/(?<!min-)w-\[\d+px\]/);
    }
  });

  it("the corpus-counts caveat paragraph widens on large displays via the app's tiered prose pattern (live-officer-review wide-screen fix) rather than staying flat-capped or stretching full-width", () => {
    const page = src("src/app/(app)/compare-scenarios/[scenarioId]/page.tsx");
    expect(page).toMatch(/max-w-3xl[^"]*xl:max-w-4xl[^"]*2xl:max-w-5xl/);
    expect(page).not.toContain("max-w-prose");
  });
});

describe("route structure: landing + scenario detail route only, no unnecessary nesting", () => {
  it("landing page exists at /compare-scenarios", () => {
    expect(() => src("src/app/(app)/compare-scenarios/page.tsx")).not.toThrow();
  });

  it("detail page exists at /compare-scenarios/[scenarioId]", () => {
    expect(() => src("src/app/(app)/compare-scenarios/[scenarioId]/page.tsx")).not.toThrow();
  });
});

describe("no database migration created for this feature", () => {
  it("no migration file numbered above 0024 exists in this pass", async () => {
    const fs = await import("fs");
    const files = fs.readdirSync(new URL("../supabase/migrations/", import.meta.url));
    const numbers = files.map((f) => parseInt(f.slice(0, 4), 10)).filter((n) => !Number.isNaN(n));
    expect(Math.max(...numbers)).toBe(24);
  });
});
