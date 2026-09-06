// Guards the "what all provisions violated" prose paragraph requested for
// the Scenario Analyzer — compact, order-style citations built only by
// reformatting provisionNumber strings already on file, never by
// fabricating structure. Anything without a clean trailing bracket must be
// left untouched rather than mis-parsed.
import { describe, expect, it } from "vitest";
import { buildViolationParagraph, formatProvisionNumbersForParagraph } from "@/lib/provisionCitationParagraph";

describe("formatProvisionNumbersForParagraph", () => {
  it("collapses consecutive lettered sub-clauses sharing the same prefix", () => {
    expect(formatProvisionNumbersForParagraph(["Section 12A(a)", "Section 12A(b)", "Section 12A(c)"])).toBe(
      "Section 12A(a), (b) and (c)",
    );
  });

  it("collapses a two-item group with 'and', not a comma", () => {
    expect(formatProvisionNumbersForParagraph(["Regulation 33(1)(a)", "Regulation 33(1)(c)"])).toBe(
      "Regulation 33(1)(a) and (c)",
    );
  });

  it("does not merge across different prefixes", () => {
    expect(formatProvisionNumbersForParagraph(["Regulation 4(1)(a)", "Regulation 23(2)"])).toBe(
      "Regulation 4(1)(a), Regulation 23(2)",
    );
  });

  it("leaves a bare provision number (no trailing bracket) untouched and unmerged", () => {
    expect(formatProvisionNumbersForParagraph(["Section 27", "Section 12A(a)", "Section 12A(b)"])).toBe(
      "Section 27, Section 12A(a) and (b)",
    );
  });

  it("leaves a cross-reference or accounting-standard citation exactly as stored", () => {
    expect(
      formatProvisionNumbersForParagraph(["Regulation 34(3) read with Schedule V", "Ind AS 24", "Schedule V, Part A, Clause 1"]),
    ).toBe("Regulation 34(3) read with Schedule V, Ind AS 24, Schedule V, Part A, Clause 1");
  });

  it("returns an empty string for an empty list", () => {
    expect(formatProvisionNumbersForParagraph([])).toBe("");
  });
});

describe("buildViolationParagraph", () => {
  it("groups by instrument and sorts each group ascending before collapsing", () => {
    const result = buildViolationParagraph([
      { instrument: "SEBI Act, 1992", provisionNumber: "Section 12A(c)" },
      { instrument: "SEBI Act, 1992", provisionNumber: "Section 12A(a)" },
      { instrument: "LODR Regulations, 2015", provisionNumber: "Regulation 17(8)" },
      { instrument: "SEBI Act, 1992", provisionNumber: "Section 12A(b)" },
      { instrument: "LODR Regulations, 2015", provisionNumber: "Regulation 4(1)(a)" },
    ]);
    expect(result).toEqual([
      { instrument: "SEBI Act, 1992", sentence: "Section 12A(a), (b) and (c)" },
      { instrument: "LODR Regulations, 2015", sentence: "Regulation 4(1)(a), Regulation 17(8)" },
    ]);
  });
});
