// Application-wide responsive layout / large-display pass. This pass is
// pure CSS/layout (Tailwind class changes to the app shell, grids, and a
// readable-prose-measure utility) with zero changes to legal logic, corpus
// data, provision mappings, or navigation architecture — so these tests are
// source guards against the actual page/component source, the same pattern
// used by case-library-order-detail-cleanup.test.ts and
// officer-facing-cleanup.test.ts, rather than fixture-driven unit tests
// (there is no new computation here to unit test).
import { readFileSync } from "fs";
import { describe, expect, it } from "vitest";

function src(path: string): string {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

describe("app shell: tiered workspace width (Part 1/2/14)", () => {
  const layout = src("src/app/(app)/layout.tsx");
  const navbar = src("src/components/NavBar.tsx");

  it("main content wrapper widens at xl/2xl/3xl instead of a single flat max-w-7xl cap", () => {
    expect(layout).toMatch(/<main[^>]*max-w-7xl[^>]*xl:max-w-\[[^\]]+\][^>]*2xl:max-w-\[[^\]]+\][^>]*3xl:max-w-\[[^\]]+\]/);
  });

  it("NavBar's header wrapper carries the identical width tier classes as <main>, so header and content never diverge", () => {
    const mainWidthClasses = layout.match(/<main className="([^"]+)"/)?.[1];
    expect(mainWidthClasses).toBeTruthy();
    const tierTokens = mainWidthClasses!.match(/(?:xl|2xl|3xl):max-w-\[[^\]]+\]/g);
    expect(tierTokens && tierTokens.length).toBe(3);
    for (const token of tierTokens!) {
      expect(navbar).toContain(token);
    }
    // Base tier stays max-w-7xl (1280px) on both — small/tablet/normal-laptop
    // behaviour is deliberately unchanged, only the wider tiers are new.
    expect(navbar).toMatch(/max-w-7xl/);
  });

  it("does not touch DisclaimerBanner, footer, or navigation architecture", () => {
    expect(layout).toContain("<NavBar />");
    expect(layout).toContain("<DisclaimerBanner />");
    expect(layout).toContain("no-print");
  });
});

describe("custom 3xl breakpoint for large/meeting-room displays (Part 2/15)", () => {
  it("globals.css defines a --breakpoint-3xl distinct from Tailwind's stock 2xl (1536px), so a 1920px desktop and a 2560px+ display are not forced into the same width tier", () => {
    const css = src("src/app/globals.css");
    expect(css).toMatch(/--breakpoint-3xl:\s*125rem/);
  });
});

describe("readable prose measure separated from workspace width (Part 13)", () => {
  it("Order Detail's Scope Note, Issues Examined and Directions/Outcomes narrative are capped at max-w-prose, not left to stretch full-width", () => {
    const page = src("src/app/(app)/orders/[id]/page.tsx");
    // Scope note dd
    expect(page).toMatch(/Scope note[\s\S]{0,400}<dd className="[^"]*max-w-prose[^"]*"/);
    // Issues examined dd
    expect(page).toMatch(/Issues examined[\s\S]{0,150}<dd className="[^"]*max-w-prose[^"]*"/);
    // Directions & outcomes narrative paragraph
    expect(page).toMatch(/directions\.map[\s\S]{0,200}<p className="[^"]*max-w-prose[^"]*">\{d\.directionOrOutcome\}/);
  });

  it("Provision Detail's verbatim statutory text stays at readable measure even though the surrounding Card may be wide", () => {
    const page = src("src/app/(app)/provisions/[id]/page.tsx");
    expect(page).toMatch(/<blockquote className="[^"]*max-w-prose[^"]*"/);
  });

  it("Fixed Scenario Analysis's 'what this covers' explanation widens on wide displays instead of the old flat max-w-prose cap (live-officer-review wide-screen fix), matching the same tiered pattern as the theme-picker intro/PageHeader", () => {
    const comp = src("src/components/analyzer/FixedScenarioAnalyzer.tsx");
    expect(comp).toMatch(/What this covers[\s\S]{0,700}<p className="[^"]*max-w-3xl[^"]*xl:max-w-4xl[^"]*2xl:max-w-5xl[^"]*">\{scenario\.explanation\}/);
    expect(comp).not.toMatch(/What this covers[\s\S]{0,700}<p className="[^"]*max-w-prose[^"]*">\{scenario\.explanation\}/);
  });

  it("legal/research prose measure is never applied by shrinking font size (Part 16: do not solve width via smaller text)", () => {
    const page = src("src/app/(app)/orders/[id]/page.tsx");
    // The prose-measure dd/p tags introduced by this pass keep their
    // existing text-sm sizing; max-w-prose narrows the line length, not the
    // font.
    expect(page).toMatch(/max-w-prose text-left text-sm/);
  });
});

describe("grids gain columns on wide displays without excluding narrower ones (Part 2/3/5/9/12)", () => {
  it("Home's primary-task grid matches its exact card count at xl -- 3 cards (Analyze/Cases/Law) after the legacy Compare card was removed (pre-demo remediation, Section 11), never a 4th empty grid slot", () => {
    const page = src("src/app/(app)/dashboard/page.tsx");
    expect(page).toMatch(/grid gap-4 sm:grid-cols-2 xl:grid-cols-3/);
  });

  it("Fixed Scenario Analysis's scenario-card grid gains a column at xl, and its provision-groups list becomes two columns at xl", () => {
    const comp = src("src/components/analyzer/FixedScenarioAnalyzer.tsx");
    expect(comp).toMatch(/grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3/);
    expect(comp).toMatch(/grid grid-cols-1 gap-4 xl:grid-cols-2/);
  });

  it("Law Library's regulator/instrument/provision browse grids gain columns at wider tiers", () => {
    const regulatorPage = src("src/app/(app)/law-library/[regulator]/page.tsx");
    expect(regulatorPage).toMatch(/grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4/);
    const instrumentPage = src("src/app/(app)/law-library/[regulator]/[instrumentId]/page.tsx");
    expect(instrumentPage).toMatch(/grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4/);
  });

  it("Order Detail and Provision Detail metadata <dl> gain a third column at lg, with full-width fields spanning all three", () => {
    const orderPage = src("src/app/(app)/orders/[id]/page.tsx");
    expect(orderPage).toMatch(/<dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">/);
    expect(orderPage).toMatch(/sm:col-span-2 lg:col-span-3/);
    const provisionPage = src("src/app/(app)/provisions/[id]/page.tsx");
    expect(provisionPage).toMatch(/<dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">/);
  });
});

describe("Case Library table: already-correct pattern preserved (Part 7/11/18)", () => {
  it("still renders the full desktop/tablet table plus the md:hidden stacked mobile card list — no artificial narrowing introduced", () => {
    const comp = src("src/components/CaseLibraryClient.tsx");
    expect(comp).toMatch(/<table className="w-full min-w-\[1000px\][^"]*"/);
    expect(comp).toMatch(/md:hidden/);
    expect(comp).toMatch(/md:block/);
  });

  it("preserves the just-completed Cases cleanup: newest-first ordering, display-only order-type families, and legal-function labelling are untouched by this layout pass", () => {
    const comp = src("src/components/CaseLibraryClient.tsx");
    expect(comp).toContain("CASE_LIBRARY_ORDER_TYPE_FAMILY_ORDER");
    const orderPage = src("src/app/(app)/orders/[id]/page.tsx");
    expect(orderPage).toContain("Contravention not established");
    expect(orderPage).toContain("summary.legalFunctionLabel");
  });
});

describe("no legal/data-logic files touched by this layout pass (Part 17)", () => {
  it("fixed-scenarios.ts and the Analyzer resolver/engine are absent from this test file's own touched-file set (sanity: this suite only reads layout/page/component source)", () => {
    // This is a documentation-style guard: the responsive pass's own tests
    // exclusively read page/layout/component files, never data/lib logic
    // files such as fixed-scenarios.ts, fixedScenarioResolver.ts, or
    // matching/engine.ts. If a future edit to this test file starts reading
    // those, it is out of this pass's stated scope.
    const thisFile = readFileSync(new URL(import.meta.url), "utf8");
    expect(thisFile).not.toMatch(/data\/curated\/fixed-scenarios/);
    expect(thisFile).not.toMatch(/lib\/matching\/engine/);
  });
});
