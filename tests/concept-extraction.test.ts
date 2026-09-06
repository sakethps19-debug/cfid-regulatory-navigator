// Guards against the exact failure mode a live user hit: typing the
// singular form of a curated synonym ("a fictitious sale") produced zero
// detected concepts and hence "No potentially relevant provisions" for a
// textbook fictitious-sales scenario, purely because the curated synonym
// list only had the plural form ("fictitious sales") and detection is pure
// substring matching. detectConcepts now also matches the automatically
// generated singular/plural variant of each synonym's last word.
import { describe, expect, it } from "vitest";
import { detectConcepts } from "@/lib/matching/conceptExtraction";

describe("detectConcepts — singular/plural robustness", () => {
  it("matches the plural synonym on file", () => {
    const detected = detectConcepts("The company recorded fictitious sales.");
    expect(detected.map((d) => d.id)).toContain("fictitious_sales_or_assets");
  });

  it("also matches when the scenario uses the singular form", () => {
    const detected = detectConcepts("The company recorded a fictitious sale.");
    expect(detected.map((d) => d.id)).toContain("fictitious_sales_or_assets");
  });

  it("matches a singular-form synonym written as plural in the scenario", () => {
    // "related party" is on file; a scenario written in the plural should
    // still hit it via the generated variant.
    const detected = detectConcepts("Transactions with related parties were not disclosed.");
    expect(detected.map((d) => d.id)).toContain("related_party_counterparty");
  });

  it("does not generate a bogus double-plural for a word already ending in a double s", () => {
    const detected = detectConcepts("The noticee denied access to the investigating authority.");
    expect(detected.map((d) => d.id)).toContain("non_cooperation_with_investigation");
  });

  it("still returns nothing for text with no recognizable CFID concept at all", () => {
    expect(detectConcepts("The weather was pleasant during the site visit.")).toEqual([]);
  });
});

describe("detectConcepts — the exact example-chip regression", () => {
  it("detects fictitious sales/assets from the Scenario Analyzer's own featured example text", () => {
    const text =
      "For the last three years, the company recorded fictitious sales with counterparties that deny ever transacting with it, and its financial statements show assets that are not genuine and cannot be verified against any underlying delivery, inventory or bank records.";
    const detected = detectConcepts(text);
    expect(detected.map((d) => d.id)).toContain("fictitious_sales_or_assets");
  });
});

// Found via a post-launch spot-check of officer-style paraphrases that don't
// reuse the exact curated synonym wording. Each of these previously
// returned zero detected concepts for a fact pattern this precedent
// library directly covers.
describe("detectConcepts — officer-phrasing spot checks", () => {
  it("detects fictitious sales from an adverb-form + buyer-denial paraphrase", () => {
    const text =
      "There were several fictitiously booked sale transactions and the buyers deny ever having bought anything from the company, and its balance sheet lists assets nobody can actually verify exist.";
    const detected = detectConcepts(text);
    expect(detected.map((d) => d.id)).toContain("fictitious_sales_or_assets");
  });

  it("detects price manipulation from a plain-English synchronized-trading description", () => {
    const text =
      "A small group of connected trading accounts kept buying and selling the same stock back and forth among themselves right before a big price jump, with no real change in who actually owned the shares.";
    const detected = detectConcepts(text);
    expect(detected.map((d) => d.id)).toContain("price_manipulation_nexus");
  });

  it("detects IPO proceeds diversion described as a 'public issue', not a 'rights issue'", () => {
    const text =
      "Money raised in the public issue was supposed to go toward a new plant, but instead it seems to have been transferred out to firms connected to the promoters soon after listing.";
    const detected = detectConcepts(text);
    expect(detected.map((d) => d.id)).toContain("rights_issue");
    expect(detected.map((d) => d.id)).toContain("fund_transfer_promoter_entity");
  });
});

// A user explicitly ruled out one allegation while alleging another: "There
// was no diversion of funds. The only issue is that related party
// transactions were not disclosed." Pure substring matching had no concept
// of negation, so "no diversion of funds" still matched fund_diversion's
// synonym "diversion of funds" and surfaced fund-diversion-specific
// provisions and precedents directly contradicting the stated facts.
describe("detectConcepts — negation handling", () => {
  it("does not detect a concept the scenario explicitly rules out", () => {
    const text = "There was no diversion of funds. The only issue is that related party transactions were not disclosed.";
    const detected = detectConcepts(text);
    const ids = detected.map((d) => d.id);
    expect(ids).not.toContain("fund_diversion");
    expect(ids).toContain("related_party_transaction");
    expect(ids).toContain("non_disclosure_of_information");
  });

  it("does not detect price manipulation when the scenario says it was ruled out", () => {
    const text =
      "The investigation ruled out any price manipulation. The remaining concern is non-cooperation with SEBI, as the noticee did not respond to summons.";
    const detected = detectConcepts(text);
    const ids = detected.map((d) => d.id);
    expect(ids).not.toContain("price_manipulation_nexus");
    expect(ids).toContain("non_cooperation_with_investigation");
  });

  it("still detects a concept mentioned positively elsewhere, even if negated in an earlier sentence", () => {
    const text =
      "There was no diversion of funds in FY21. However in FY22, Rs.50cr was diverted to a promoter-controlled entity.";
    const detected = detectConcepts(text);
    expect(detected.map((d) => d.id)).toContain("fund_diversion");
  });

  it("does not let a negation word aimed at a disclosure verb suppress the underlying related-party concept", () => {
    // "never flagged AS a related party dealing" negates the disclosure,
    // not the existence of the related-party dealing itself — the dealing
    // is exactly what's being alleged. A naive wide negation window
    // regressed this during development; guard against it recurring.
    const text = "This was never flagged as a related party dealing in the books.";
    const detected = detectConcepts(text);
    expect(detected.map((d) => d.id)).toContain("related_party_transaction");
  });

  it("does not let 'no record of X' suppress detection of X itself", () => {
    const text = "Tax filings showed no record of the purchases the company claimed to have made from this vendor.";
    const detected = detectConcepts(text);
    expect(detected.map((d) => d.id)).toContain("related_party_counterparty");
  });

  it("still matches a synonym that itself begins with a negation word ('no genuine sale')", () => {
    const text = "There was no genuine sale underlying these recorded transactions.";
    const detected = detectConcepts(text);
    expect(detected.map((d) => d.id)).toContain("fictitious_sales_or_assets");
  });

  it("does not suppress a genuine same-sentence match across a contrastive conjunction ('not established, though X was confirmed')", () => {
    // A very common CFID order construction: one allegation fails, a
    // narrower one is confirmed, stated as one contrastive sentence. A
    // negation cue on the "not established" side must not bleed across
    // "though" and wrongly suppress the genuinely-alleged, unnegated
    // concept on the other side.
    const text =
      "The final order held that the core fraud charge was not established, though LODR disclosure lapses were confirmed and a penalty was imposed on that narrower basis.";
    const detected = detectConcepts(text);
    expect(detected.map((d) => d.id)).toContain("non_disclosure_of_information");
  });
});

// Found via a 483-scenario stress-test battery covering mixed positive/
// negative allegations, multi-entity scenarios and adversarial inputs.
describe("detectConcepts — synonym-list precision", () => {
  it("does not flag related-party misrepresentation from a properly-disclosed, compliant related-party transaction", () => {
    // related_party_misrepresentation's synonym list used to include the
    // bare phrase "related party" — far too generic for a tag that means
    // wrongdoing (misrepresentation), since it fired on every mention of a
    // related-party transaction at all, compliant ones included.
    const text =
      "The related party transaction with the promoter's family trust was disclosed in the annual report and separately approved by the Audit Committee and shareholders as required.";
    const detected = detectConcepts(text);
    const ids = detected.map((d) => d.id);
    expect(ids).toContain("related_party_transaction");
    expect(ids).not.toContain("related_party_misrepresentation");
  });

  it("still detects related-party misrepresentation when actually alleged", () => {
    const text = "The company misrepresented related party transactions in its annual report.";
    const detected = detectConcepts(text);
    expect(detected.map((d) => d.id)).toContain("related_party_misrepresentation");
  });

  it("detects non-cooperation described as refusing to hand over records", () => {
    const text =
      "The company refused to hand over its ERP system logins and underlying accounting records to the court-appointed forensic auditor.";
    const detected = detectConcepts(text);
    expect(detected.map((d) => d.id)).toContain("non_cooperation_with_investigation");
  });

  it("detects an Audit Committee deficiency described as existing only on paper", () => {
    const text =
      "Although the company's annual report listed an Audit Committee with the required composition, no meeting minutes, agendas or attendance records could be produced for any financial year under review.";
    const detected = detectConcepts(text);
    expect(detected.map((d) => d.id)).toContain("audit_committee_deficiency");
  });

  it("detects false compliance certification phrased with 'compliance' between the two key words", () => {
    const text = "Noticee 2, the CFO, was held liable for false compliance certification.";
    const detected = detectConcepts(text);
    expect(detected.map((d) => d.id)).toContain("false_compliance_certification");
  });
});
