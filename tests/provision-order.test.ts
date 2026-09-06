// Guards the ascending-numeric ordering used everywhere provisions/sections
// are listed (Law Library, Provision Explorer, Scenario Analyzer). A plain
// string sort would put "Regulation 17(8)" before "Regulation 4(1)(a)"
// because "1" < "4" character-by-character — these fixtures are the exact
// failure mode reported against the live data.
import { describe, expect, it } from "vitest";
import { compareProvisionNumbers, sortByProvisionNumber } from "@/lib/provisionOrder";

describe("compareProvisionNumbers", () => {
  it("orders single-digit before double-digit regulation numbers", () => {
    const sorted = ["Regulation 17(8)", "Regulation 4(1)(a)", "Regulation 6(2)(a)"].sort(compareProvisionNumbers);
    expect(sorted).toEqual(["Regulation 4(1)(a)", "Regulation 6(2)(a)", "Regulation 17(8)"]);
  });

  it("orders lettered sub-clauses within the same number alphabetically", () => {
    const sorted = ["Regulation 4(1)(c)", "Regulation 4(1)(a)", "Regulation 4(1)(b)"].sort(compareProvisionNumbers);
    expect(sorted).toEqual(["Regulation 4(1)(a)", "Regulation 4(1)(b)", "Regulation 4(1)(c)"]);
  });

  it("orders SEBI Act sections ascending regardless of canonical_id string order", () => {
    // canonical_id alphabetic order would put SEBI-ACT-11C-2 before
    // SEBI-ACT-27 before SEBI-ACT-12A-a — none of that reflects section order.
    const sorted = ["Section 27", "Section 11C(2)", "Section 12A(a)", "Section 11(2)"].sort(compareProvisionNumbers);
    expect(sorted).toEqual(["Section 11(2)", "Section 11C(2)", "Section 12A(a)", "Section 27"]);
  });

  it("is stable for identical provision numbers", () => {
    expect(compareProvisionNumbers("Regulation 33(1)(a)", "Regulation 33(1)(a)")).toBe(0);
  });
});

describe("sortByProvisionNumber", () => {
  it("sorts a list of provision-like objects ascending without mutating the input", () => {
    const input = [{ provisionNumber: "Regulation 17(8)" }, { provisionNumber: "Regulation 4(1)(a)" }];
    const sorted = sortByProvisionNumber(input);
    expect(sorted.map((p) => p.provisionNumber)).toEqual(["Regulation 4(1)(a)", "Regulation 17(8)"]);
    expect(input.map((p) => p.provisionNumber)).toEqual(["Regulation 17(8)", "Regulation 4(1)(a)"]);
  });
});
