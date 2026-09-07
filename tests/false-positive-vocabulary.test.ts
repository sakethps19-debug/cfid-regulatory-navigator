// P1-10/11: audits the controlled synonym vocabulary (concept-tags.ts) for
// false-positive risk. Aggressive negative tests are as important as
// positive ones here - a generic word matching a specific regulatory
// concept is exactly the kind of overclaim this whole audit pass exists to
// remove. Each of the three defects named in the audit prompt gets a
// dedicated false-positive test alongside a true-positive test proving the
// legitimate detection path still works after the fix.
import { describe, expect, it } from "vitest";
import { detectConcepts } from "@/lib/matching/conceptExtraction";

describe("related_party_counterparty: bare 'vendor'/'counterparty' must not imply a related party", () => {
  it("does NOT detect a related party from an ordinary arm's-length vendor mention", () => {
    const detected = detectConcepts("The company paid its vendor for raw materials supplied last quarter.");
    expect(detected.map((d) => d.id)).not.toContain("related_party_counterparty");
  });

  it("does NOT detect a related party from an ordinary counterparty dispute", () => {
    const detected = detectConcepts("A counterparty failed to deliver the goods on the agreed date.");
    expect(detected.map((d) => d.id)).not.toContain("related_party_counterparty");
  });

  it("does NOT detect a related party merely because a customer is mentioned", () => {
    const detected = detectConcepts("The customer disputed the invoice amount raised by the company.");
    expect(detected.map((d) => d.id)).not.toContain("related_party_counterparty");
  });

  it("still detects a related party when the text actually asserts the relationship", () => {
    expect(detectConcepts("The transaction involved a related party of the promoter.").map((d) => d.id)).toContain(
      "related_party_counterparty"
    );
    expect(detectConcepts("The company transacted with a related-party vendor.").map((d) => d.id)).toContain(
      "related_party_counterparty"
    );
    expect(detectConcepts("The counterparty that is a related party was not disclosed.").map((d) => d.id)).toContain(
      "related_party_counterparty"
    );
  });
});

describe("director_general: bare 'director' must not double-count every specific director role", () => {
  it("does NOT tag a Managing Director mention as also a Non-executive director", () => {
    const detected = detectConcepts("The Managing Director approved the fund transfer without board authorization.");
    const ids = detected.map((d) => d.id);
    expect(ids).toContain("managing_director");
    expect(ids).not.toContain("director_general");
  });

  it("does NOT tag an Independent Director mention as also a Non-executive director", () => {
    const detected = detectConcepts("The Independent Director flagged the discrepancy at the board meeting.");
    const ids = detected.map((d) => d.id);
    expect(ids).toContain("independent_director");
    expect(ids).not.toContain("director_general");
  });

  it("does NOT tag a Nominee Director mention as also a Non-executive director", () => {
    const detected = detectConcepts("The nominee director raised concerns about the related-party transaction.");
    const ids = detected.map((d) => d.id);
    expect(ids).toContain("nominee_director");
    expect(ids).not.toContain("director_general");
  });

  it("still detects Non-executive director when the text actually names that role", () => {
    const detected = detectConcepts("A non-executive director abstained from voting on the resolution.");
    expect(detected.map((d) => d.id)).toContain("director_general");
  });
});

describe("revenue_recognition: bare 'understated' must not leak into unrelated contexts", () => {
  it("does NOT tag an unrelated use of 'understated' as touching revenue recognition", () => {
    const detected = detectConcepts("The risk exposure disclosed in the annual report was understated.");
    expect(detected.map((d) => d.id)).not.toContain("revenue_recognition");
  });

  it("does NOT tag a liability being understated as touching revenue recognition", () => {
    const detected = detectConcepts("The contingent liability was understated in the financial statements.");
    expect(detected.map((d) => d.id)).not.toContain("revenue_recognition");
  });

  it("still detects revenue recognition when revenue itself is described as understated", () => {
    expect(detectConcepts("The audit found understated revenue due to a classification error.").map((d) => d.id)).toContain(
      "revenue_recognition"
    );
    expect(detectConcepts("The company reported understated sales for the financial year.").map((d) => d.id)).toContain(
      "revenue_recognition"
    );
  });
});
