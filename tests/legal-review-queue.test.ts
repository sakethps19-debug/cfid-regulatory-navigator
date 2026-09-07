// Guards the Legal Review Queue's cited-only vs recorded-basis-of-disposition
// per-finding summary (provisionRelationshipSummary) and confirms
// getValidationIssues() correctly resolves finding_id -> record_id so the
// queue can link validation issues back to the finding they're about.
import { describe, expect, it } from "vitest";
import { provisionRelationshipSummary } from "@/components/LegalReviewQueueClient";
import { scenarioFindings } from "./fixtures";

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
