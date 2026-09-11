// Reconciliation-pass finding (Task 3): the shared PageHeader component
// (src/components/PageHeader.tsx) hardcoded its description paragraph to
// max-w-3xl (48rem) with no responsive widening, while the app shell itself
// (src/app/(app)/layout.tsx) grows to max-w-7xl / xl:max-w-[85rem] /
// 2xl:max-w-[100rem] / 3xl:max-w-[130rem]. At xl/2xl breakpoints that left a
// short page-introduction sentence reading as a narrow, floating column
// inside a much wider workspace. Fixed by adding a graduated widening
// (xl:max-w-4xl 2xl:max-w-5xl) to the call sites that used the bare pattern
// -- never full shell width, and never touching the separate, already-
// correct max-w-prose (character-based reading measure) pattern used for
// long-form statutory/prose content elsewhere in the app. These guard
// against silently regressing back to the bare max-w-3xl-only pattern.
//
// Final pre-merge correction: the legacy compare/page.tsx (formerly one of
// the three widened call sites, its own section-intro paragraphs) was
// retired entirely and now only performs a server-side redirect to
// /compare-scenarios -- it no longer has any prose to widen. See
// tests/legacy-compare-navigation.test.ts for that retirement's coverage.
import { readFileSync } from "fs";
import { describe, expect, it } from "vitest";

function read(relativePath: string): string {
  return readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8");
}

describe("PageHeader: description paragraph widens at large breakpoints instead of staying a fixed narrow column", () => {
  it("PageHeader.tsx's description paragraph carries the graduated xl/2xl widening classes alongside its base max-w-3xl", () => {
    const source = read("src/components/PageHeader.tsx");
    expect(source).toMatch(/max-w-3xl[^"]*xl:max-w-4xl[^"]*2xl:max-w-5xl/);
  });

  it("FixedScenarioAnalyzer.tsx's intro paragraph carries the same widening classes, now via the shared NARRATIVE_PROSE_CLASSES constant (live-officer-review global-justify pass) rather than a duplicated literal string", () => {
    const proseClasses = read("src/lib/proseClasses.ts");
    expect(proseClasses).toMatch(/max-w-3xl[^"]*xl:max-w-4xl[^"]*2xl:max-w-5xl/);
    const source = read("src/components/analyzer/FixedScenarioAnalyzer.tsx");
    expect(source).toContain('import { NARRATIVE_PROSE_CLASSES, NARRATIVE_JUSTIFY_ONLY } from "@/lib/proseClasses"');
    expect(source).toMatch(/NARRATIVE_PROSE_CLASSES/);
  });

  it("the widening is graduated, not full shell width -- neither xl:max-w-[85rem] nor 2xl:max-w-[100rem] nor 3xl:max-w-[130rem] (the shell's own tiers) appear on these paragraphs", () => {
    for (const path of ["src/components/PageHeader.tsx", "src/components/analyzer/FixedScenarioAnalyzer.tsx", "src/lib/proseClasses.ts"]) {
      const source = read(path);
      expect(source).not.toMatch(/max-w-\[85rem\]/);
      expect(source).not.toMatch(/max-w-\[100rem\]/);
      expect(source).not.toMatch(/max-w-\[130rem\]/);
    }
  });

  it("long-form reading-measure prose (max-w-prose) elsewhere in the app is untouched by this pass -- it is a deliberately separate, narrower pattern", () => {
    const source = read("src/components/PageHeader.tsx");
    expect(source).not.toMatch(/className="[^"]*max-w-prose/);
  });
});
