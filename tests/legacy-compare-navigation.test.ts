// Pre-demo remediation + reconciliation pass (Section 11, Task 2; Section
// 15 regression #14) plus final pre-merge correction: the legacy pairwise
// "Compare" tool (/compare) was first demoted out of primary navigation,
// then removed from ALL navigation (including the secondary "More" menu),
// then -- on final product review -- retired entirely as an officer-facing
// surface: its two functions (ad hoc pairwise finding comparison, the
// interim->final reversals list) were deliberately superseded by Case
// Journey and Compare Scenarios, and the old generic comparison model no
// longer exists at all, not even as a reachable-only-by-bookmark legacy
// route. /compare now performs a server-side redirect to
// /compare-scenarios so an old link still resolves somewhere useful
// instead of exposing a third, obsolete comparison surface.
import { readFileSync } from "fs";
import { describe, expect, it } from "vitest";

function src(path: string): string {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

describe("legacy Compare is absent from all officer-facing navigation (primary and secondary)", () => {
  const navbar = src("src/components/NavBar.tsx");
  const dashboard = src("src/app/(app)/dashboard/page.tsx");

  it("PRIMARY_NAV_ITEMS no longer contains /compare, and still contains Home/Analyze/Cases/Law", () => {
    const primaryNavMatch = navbar.match(/const PRIMARY_NAV_ITEMS = \[([\s\S]*?)\];/);
    expect(primaryNavMatch).toBeTruthy();
    const primaryNavBlock = primaryNavMatch![1];
    expect(primaryNavBlock).not.toMatch(/href:\s*"\/compare"/);
    expect(primaryNavBlock).toContain('{ href: "/dashboard", label: "Home" }');
    expect(primaryNavBlock).toContain('{ href: "/analyzer", label: "Analyze" }');
    expect(primaryNavBlock).toContain('{ href: "/case-library", label: "Cases" }');
    expect(primaryNavBlock).toContain('{ href: "/law-library", label: "Law" }');
  });

  it("SECONDARY_NAV_ITEMS ('More' menu) also no longer contains /compare -- not left as a discoverable third comparison model", () => {
    const secondaryNavMatch = navbar.match(/const SECONDARY_NAV_ITEMS = \[([\s\S]*?)\];/);
    expect(secondaryNavMatch).toBeTruthy();
    const secondaryNavBlock = secondaryNavMatch![1];
    expect(secondaryNavBlock).not.toMatch(/href:\s*"\/compare"/);
  });

  it("SECONDARY_NAV_ITEMS still contains Case Journey and Compare Scenarios -- the two tools /compare's functions were separated into", () => {
    const secondaryNavMatch = navbar.match(/const SECONDARY_NAV_ITEMS = \[([\s\S]*?)\];/);
    const secondaryNavBlock = secondaryNavMatch![1];
    expect(secondaryNavBlock).toMatch(/href:\s*"\/case-journey",\s*label:\s*"Case Journey"/);
    expect(secondaryNavBlock).toMatch(/href:\s*"\/compare-scenarios",\s*label:\s*"Compare Scenarios"/);
  });

  it("no href anywhere in the source links to the legacy /compare route (only compare-scenarios/compare-journey-style paths remain)", () => {
    // A crude but effective source-wide guard: the literal string '"/compare"'
    // (with closing quote immediately after, so it doesn't match
    // "/compare-scenarios") must not appear in any .tsx file under src/,
    // since NavBar was the only known link to it and is now clear.
    expect(navbar).not.toContain('"/compare"');
  });

  it("Home no longer shows a 'Compare Precedents' card linking to /compare", () => {
    expect(dashboard).not.toContain("Compare Precedents");
    expect(dashboard).not.toMatch(/href:\s*"\/compare"/);
  });

  it("Home's primary task grid rebalances around exactly Analyze, Cases and Law", () => {
    expect(dashboard).toContain("Analyze a Scenario");
    expect(dashboard).toContain("Search Cases");
    expect(dashboard).toContain("Explore Law");
  });
});

describe("legacy /compare route no longer renders the old comparison product -- it redirects to Compare Scenarios", () => {
  const comparePage = src("src/app/(app)/compare/page.tsx");

  it("the /compare page performs a redirect rather than rendering the legacy pairwise/reversals UI", () => {
    expect(comparePage).toMatch(/redirect\(\s*"\/compare-scenarios"\s*\)/);
    expect(comparePage).not.toContain("PrecedentCompareClient");
    expect(comparePage).not.toContain("InterimFinalReversalsClient");
  });

  it("the redirect target is Compare Scenarios, not Case Journey or any other page", () => {
    expect(comparePage).toContain('redirect("/compare-scenarios")');
  });

  it("the retired legacy comparison components no longer exist in the codebase", () => {
    expect(() => src("src/components/PrecedentCompareClient.tsx")).toThrow();
    expect(() => src("src/components/InterimFinalReversalsClient.tsx")).toThrow();
    expect(() => src("src/lib/precedentShifts.ts")).toThrow();
  });
});
