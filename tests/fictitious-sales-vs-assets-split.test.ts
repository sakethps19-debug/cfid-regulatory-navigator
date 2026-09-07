// fictitious_sales_or_assets was split into fictitious_sales_or_revenue and
// fictitious_or_nongenuine_assets (see concept-tags.ts) after a user
// correctly pointed out that SSSL-02 (a sham preferential allotment backed
// by a fictitious receivable, no revenue transaction at all) was surfacing
// for "fictitious sales" queries purely because sales-side and asset-side
// fabrication shared one tag ID.
import { describe, expect, it } from "vitest";
import { detectConcepts } from "@/lib/matching/conceptExtraction";

describe("detectConcepts — fictitious sales vs. fictitious assets are now distinct", () => {
  it("detects only the sales/revenue tag for a pure fictitious-sales scenario (e.g. ARCOTECH-01-style)", () => {
    const text = "The company recorded fictitious sales and purchases with counterparties that deny ever having bought anything.";
    const ids = detectConcepts(text).map((d) => d.id);
    expect(ids).toContain("fictitious_sales_or_revenue");
    expect(ids).not.toContain("fictitious_or_nongenuine_assets");
  });

  it("detects only the assets tag for a pure fictitious-asset scenario with no sales element (e.g. DHFL-02-style)", () => {
    const text = "The lender's loan book included overstated assets that turned out to be non-genuine, with no borrower ever actually receiving disbursed funds.";
    const ids = detectConcepts(text).map((d) => d.id);
    expect(ids).toContain("fictitious_or_nongenuine_assets");
    expect(ids).not.toContain("fictitious_sales_or_revenue");
  });

  it("detects both tags for a scenario that genuinely alleges both (e.g. SSSL-01-style)", () => {
    const text = "The company reported fictitious revenue for years, and its balance sheet also carried overstated assets that were not genuine.";
    const ids = detectConcepts(text).map((d) => d.id);
    expect(ids).toContain("fictitious_sales_or_revenue");
    expect(ids).toContain("fictitious_or_nongenuine_assets");
  });

  it("no longer detects any fictitious-sales concept from a pure sham-preferential-allotment scenario (the exact SSSL-02 regression)", () => {
    const text =
      "The promoter received a preferential allotment of free shares without paying any genuine consideration, backed by a claimed asset that was never actually received.";
    const ids = detectConcepts(text).map((d) => d.id);
    // "never actually received" / "sham allotment" language should not, on
    // its own, fire the sales-specific tag.
    expect(ids).not.toContain("fictitious_sales_or_revenue");
  });
});
