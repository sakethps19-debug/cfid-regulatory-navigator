// Pre-demo remediation (Section 11, Section 15 regression #14): the legacy
// pairwise "Compare" tool (/compare) previously sat in primary navigation
// and as a Home card, competing conceptually with the two purpose-built
// comparison views this app has since grown (Case Journey, Compare
// Scenarios). /compare itself is NOT removed or redirected -- it has real,
// non-duplicated functionality (ad hoc pairwise finding comparison, the
// interim->final reversals list) -- only demoted out of primary
// navigation and the Home card grid, and given a distinguishing label in
// the secondary ("More") menu so it no longer reads as a third competing
// "compare" concept.
import { readFileSync } from "fs";
import { describe, expect, it } from "vitest";

function src(path: string): string {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

describe("legacy Compare is removed from primary navigation and Home", () => {
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

  it("/compare route is preserved (not deleted), reachable from the secondary nav with a distinguishing label -- bookmarks still resolve", () => {
    const secondaryNavMatch = navbar.match(/const SECONDARY_NAV_ITEMS = \[([\s\S]*?)\];/);
    expect(secondaryNavMatch).toBeTruthy();
    const secondaryNavBlock = secondaryNavMatch![1];
    expect(secondaryNavBlock).toMatch(/href:\s*"\/compare"/);
    // Must not carry the bare "Compare" label competing with "Compare Scenarios".
    expect(secondaryNavBlock).not.toMatch(/href:\s*"\/compare",\s*label:\s*"Compare"\s*[,}]/);
  });

  it("the legacy /compare page itself still exists and is functional (not deleted or hard-redirected)", () => {
    const comparePage = src("src/app/(app)/compare/page.tsx");
    expect(comparePage).toContain("PrecedentCompareClient");
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
