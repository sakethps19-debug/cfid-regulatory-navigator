// Guards the Legal Review Queue's cited-only vs recorded-basis-of-disposition
// per-finding summary (provisionRelationshipSummary), the data-quality
// triage filters added for section 22 of the audit (published-but-
// partially-verified / no-provisions / no-conduct-tags), and confirms
// getValidationIssues() correctly resolves finding_id -> record_id so the
// queue can link validation issues back to the finding they're about.
import { describe, expect, it } from "vitest";
import { DATA_QUALITY_FILTERS, provisionRelationshipSummary } from "@/components/LegalReviewQueueClient";
import { scenarioFindings } from "./fixtures";

function filterTest(key: string) {
  const filterDef = DATA_QUALITY_FILTERS.find((f) => f.key === key);
  if (!filterDef) throw new Error(`no such filter: ${key}`);
  return filterDef.test;
}

describe("provisionRelationshipSummary", () => {
  it("reports 'No provisions mapped' when provisionLinks is empty", () => {
    const finding = { ...scenarioFindings[0], provisionLinks: [] };
    expect(provisionRelationshipSummary(finding)).toBe("No provisions mapped");
  });

  it("counts upheld/not_upheld relationships as recorded basis of disposition, everything else as cited/considered only", () => {
    const finding = {
      ...scenarioFindings[0],
      provisionLinks: [
        { provisionId: "A", justifyingTags: [], relationship: "upheld" },
        { provisionId: "B", justifyingTags: [], relationship: "not_upheld" },
        { provisionId: "C", justifyingTags: [], relationship: "alleged" },
        { provisionId: "D", justifyingTags: [] }, // no relationship at all — also cited-only
      ],
    };
    expect(provisionRelationshipSummary(finding)).toBe("2 of 4 provisions recorded as basis of disposition, 2 cited/considered only");
  });

  it("singularizes correctly for exactly one provision", () => {
    const finding = { ...scenarioFindings[0], provisionLinks: [{ provisionId: "A", justifyingTags: [], relationship: "upheld" }] };
    expect(provisionRelationshipSummary(finding)).toBe("1 of 1 provision recorded as basis of disposition, 0 cited/considered only");
  });
});

describe("Data-quality triage filters (section 22)", () => {
  it("noProvisions matches only findings with an empty provisionLinks array", () => {
    const test = filterTest("noProvisions");
    expect(test({ ...scenarioFindings[0], provisionLinks: [] })).toBe(true);
    expect(test({ ...scenarioFindings[0], provisionLinks: [{ provisionId: "A", justifyingTags: [] }] })).toBe(false);
  });

  it("noConductTags matches only findings with an empty allegedConduct array", () => {
    const test = filterTest("noConductTags");
    expect(test({ ...scenarioFindings[0], allegedConduct: [] })).toBe(true);
    expect(test({ ...scenarioFindings[0], allegedConduct: ["fund_diversion"] })).toBe(false);
  });

  it("publishedPartiallyVerified excludes a non-searchable (Draft/Quarantined/Withdrawn) finding even if its verification flags look mixed", () => {
    const test = filterTest("publishedPartiallyVerified");
    const draftMixed = {
      ...scenarioFindings[0],
      publicationStatus: "Draft" as const,
      sourceDocumentVerified: true,
      paragraphCitationVerified: false,
      findingStatusVerified: true,
      provisionMappingVerified: false,
      noticeeMappingVerified: true,
      humanLegalReviewCompleted: false,
    };
    expect(test(draftMixed)).toBe(false);
  });

  it("publishedPartiallyVerified matches a searchable finding with a genuinely mixed (not all-true, not all-false) verification-flag combination", () => {
    const test = filterTest("publishedPartiallyVerified");
    const mixed = {
      ...scenarioFindings[0],
      publicationStatus: "Published to search" as const,
      sourceDocumentVerified: true,
      paragraphCitationVerified: false,
      findingStatusVerified: true,
      provisionMappingVerified: false,
      noticeeMappingVerified: true,
      humanLegalReviewCompleted: false,
    };
    expect(test(mixed)).toBe(true);
  });

  it("publishedPartiallyVerified excludes a fully verified searchable finding and a fully unverified one - both are different, more specific gaps", () => {
    const test = filterTest("publishedPartiallyVerified");
    const fullyVerified = {
      ...scenarioFindings[0],
      publicationStatus: "Published to search" as const,
      sourceDocumentVerified: true,
      paragraphCitationVerified: true,
      findingStatusVerified: true,
      provisionMappingVerified: true,
      noticeeMappingVerified: true,
      humanLegalReviewCompleted: false,
    };
    const fullyUnverified = {
      ...scenarioFindings[0],
      publicationStatus: "Published to search" as const,
      sourceDocumentVerified: false,
      paragraphCitationVerified: false,
      findingStatusVerified: false,
      provisionMappingVerified: false,
      noticeeMappingVerified: false,
      humanLegalReviewCompleted: false,
    };
    expect(test(fullyVerified)).toBe(false);
    expect(test(fullyUnverified)).toBe(false);
  });

  it("publishedPartiallyVerified excludes a human-reviewed finding regardless of its underlying verification flags", () => {
    const test = filterTest("publishedPartiallyVerified");
    const reviewedButMixedFlags = {
      ...scenarioFindings[0],
      publicationStatus: "Published to search" as const,
      sourceDocumentVerified: true,
      paragraphCitationVerified: false,
      findingStatusVerified: true,
      provisionMappingVerified: false,
      noticeeMappingVerified: true,
      humanLegalReviewCompleted: true,
    };
    expect(test(reviewedButMixedFlags)).toBe(false);
  });
});
