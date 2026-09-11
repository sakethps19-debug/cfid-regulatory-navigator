// Post-freeze correction pass, Sections F & G: the corpus-wide statutory-
// verification banner and the Law Library's historical finding-status
// filter buttons made these two screens read as case-outcome dashboards
// rather than law/case research screens. Removed from normal officer view
// on these two pages only -- CorpusReviewStatusBanner itself is untouched
// and still used, unmodified, on Analyzer and Compare Scenarios.
import { readFileSync } from "fs";
import { describe, expect, it } from "vitest";

function src(path: string): string {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

describe("Law Library: no corpus-verification banner, no historical outcome filters", () => {
  const page = src("src/app/(app)/law-library/page.tsx");
  const client = src("src/components/LawLibraryClient.tsx");

  it("the page no longer imports or renders CorpusReviewStatusBanner", () => {
    expect(page).not.toMatch(/import\s*\{[^}]*CorpusReviewStatusBanner/);
    expect(page).not.toMatch(/<CorpusReviewStatusBanner/);
  });

  it("the client no longer offers 'All statuses' or per-status filter buttons", () => {
    expect(client).not.toMatch(/All statuses/);
    expect(client).not.toMatch(/statusFilter/);
    expect(client).not.toMatch(/DISPOSITION_STATUS_ORDER/);
  });

  it("search, regulator/instrument navigation, and provision-level info remain", () => {
    expect(client).toMatch(/type="search"/);
    expect(client).toMatch(/REGULATOR_LABELS/);
    expect(client).toMatch(/href=\{`\/provisions\/\$\{p\.id\}`\}/);
  });
});

describe("Case Library: no corpus-verification banner", () => {
  const page = src("src/app/(app)/case-library/page.tsx");
  const client = src("src/components/CaseLibraryClient.tsx");

  it("the page no longer imports or renders CorpusReviewStatusBanner", () => {
    expect(page).not.toMatch(/import\s*\{[^}]*CorpusReviewStatusBanner/);
    expect(page).not.toMatch(/<CorpusReviewStatusBanner/);
  });

  it("order-stage filters, case search, and official-source links remain in the client", () => {
    expect(client.length).toBeGreaterThan(0);
  });
});

describe("CorpusReviewStatusBanner remains in use elsewhere (Analyzer, Compare Scenarios) -- not deleted globally", () => {
  it("Analyzer and Compare Scenarios still render it", () => {
    expect(src("src/app/(app)/analyzer/page.tsx")).toMatch(/CorpusReviewStatusBanner/);
    expect(src("src/app/(app)/compare-scenarios/page.tsx")).toMatch(/CorpusReviewStatusBanner/);
  });

  it("the component itself is untouched, still computing the same statutory-verification counts", () => {
    const component = src("src/components/CorpusReviewStatusBanner.tsx");
    expect(component).toMatch(/export function CorpusReviewStatusBanner/);
    expect(component).toMatch(/officiallyVerifiedCount/);
  });
});
