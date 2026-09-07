// Guards findingMaturityTier() against both a synthetic sweep of all
// verification-flag combinations and the actual shapes the live corpus was
// found to contain at audit time (91 searchable findings clustering into
// exactly 3 patterns: 66 fully field-verified, 14 field-verified except
// provision mapping, 11 fully unverified - see the doc comment in
// src/lib/findingMaturity.ts). A tier function that only matches the fixture
// data by coincidence, rather than by correct logic, would still pass a
// weaker test suite - so this exercises every branch directly, not just the
// shapes seen so far.
import { describe, expect, it } from "vitest";
import { findingMaturityTier, FINDING_MATURITY_EXPLANATION } from "@/lib/findingMaturity";
import { scenarioFindings } from "./fixtures";

const base = scenarioFindings[0];

function withFlags(overrides: Partial<typeof base>) {
  return { ...base, ...overrides };
}

describe("findingMaturityTier", () => {
  it("returns 'Draft / Quarantined' for any non-searchable publication status, regardless of verification flags or review", () => {
    for (const publicationStatus of ["Draft", "Quarantined", "Withdrawn"] as const) {
      const finding = withFlags({
        publicationStatus,
        humanLegalReviewCompleted: true,
        sourceDocumentVerified: true,
        paragraphCitationVerified: true,
        findingStatusVerified: true,
        provisionMappingVerified: true,
        noticeeMappingVerified: true,
      });
      expect(findingMaturityTier(finding)).toBe("Draft / Quarantined");
    }
  });

  it("returns 'Human reviewed' whenever humanLegalReviewCompleted is true and the finding is searchable, even with unverified fields", () => {
    const finding = withFlags({
      publicationStatus: "Published to search",
      humanLegalReviewCompleted: true,
      sourceDocumentVerified: false,
      paragraphCitationVerified: false,
      findingStatusVerified: false,
      provisionMappingVerified: false,
      noticeeMappingVerified: false,
    });
    expect(findingMaturityTier(finding)).toBe("Human reviewed");
  });

  it("returns 'Unverified candidate material' when all five verification flags are false and review is pending (the live 11-row pattern)", () => {
    const finding = withFlags({
      publicationStatus: "Published to search",
      humanLegalReviewCompleted: false,
      sourceDocumentVerified: false,
      paragraphCitationVerified: false,
      findingStatusVerified: false,
      provisionMappingVerified: false,
      noticeeMappingVerified: false,
    });
    expect(findingMaturityTier(finding)).toBe("Unverified candidate material");
  });

  it("returns 'Field-verified, human review pending' when all five verification flags are true but review is pending (the live 66-row pattern)", () => {
    const finding = withFlags({
      publicationStatus: "Published to search",
      humanLegalReviewCompleted: false,
      sourceDocumentVerified: true,
      paragraphCitationVerified: true,
      findingStatusVerified: true,
      provisionMappingVerified: true,
      noticeeMappingVerified: true,
    });
    expect(findingMaturityTier(finding)).toBe("Field-verified, human review pending");
  });

  it("returns 'Source-verified, provision-mapping pending' for exactly the live 14-row pattern (everything but provision mapping verified)", () => {
    const finding = withFlags({
      publicationStatus: "Published to search",
      humanLegalReviewCompleted: false,
      sourceDocumentVerified: true,
      paragraphCitationVerified: true,
      findingStatusVerified: true,
      provisionMappingVerified: false,
      noticeeMappingVerified: true,
    });
    expect(findingMaturityTier(finding)).toBe("Source-verified, provision-mapping pending");
  });

  it("returns 'Partially verified' for any other mixed combination not matching the named patterns above", () => {
    // Only sourceDocumentVerified true, nothing else - not the "all except
    // provision mapping" shape, not all-false, not all-true.
    const finding = withFlags({
      publicationStatus: "Published to search",
      humanLegalReviewCompleted: false,
      sourceDocumentVerified: true,
      paragraphCitationVerified: false,
      findingStatusVerified: false,
      provisionMappingVerified: false,
      noticeeMappingVerified: false,
    });
    expect(findingMaturityTier(finding)).toBe("Partially verified");

    // Only provisionMappingVerified true - the inverse of the named
    // "provision-mapping pending" shape, still just "Partially verified".
    const finding2 = withFlags({
      publicationStatus: "Published to search",
      humanLegalReviewCompleted: false,
      sourceDocumentVerified: false,
      paragraphCitationVerified: false,
      findingStatusVerified: false,
      provisionMappingVerified: true,
      noticeeMappingVerified: false,
    });
    expect(findingMaturityTier(finding2)).toBe("Partially verified");
  });

  it("every FindingMaturityTier value has a non-empty explanation string", () => {
    for (const tier of Object.keys(FINDING_MATURITY_EXPLANATION) as (keyof typeof FINDING_MATURITY_EXPLANATION)[]) {
      expect(FINDING_MATURITY_EXPLANATION[tier].length).toBeGreaterThan(0);
    }
  });
});
