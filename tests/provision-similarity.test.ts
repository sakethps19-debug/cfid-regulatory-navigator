// Guards the identical-numbering safeguard correction: a parent/sub-clause
// relationship must never be inferred from similar provision numbers alone
// across different instruments — only within the SAME instrument. Fixtures
// are synthetic (not PFUTP/LODR) to prove the logic is generic, plus one
// test against the actual PFUTP 4(2)(e) / LODR 4(2)(e)(i) pair to confirm
// the specific known case is now correctly classified.
import { describe, expect, it } from "vitest";
import { findSimilarlyNumberedProvisions } from "@/lib/provisionSimilarity";
import type { LegalProvision } from "@/types/domain";

function makeProvision(overrides: Partial<LegalProvision> & { id: string }): LegalProvision {
  return {
    instrument: "Test Instrument A",
    provisionNumber: "Regulation 4(2)(e)",
    subject: null,
    currentTextVerificationStatus: "Requires verification",
    officialSource: null,
    ordersConsidered: [],
    treatmentInPilotOrders: "",
    lawLibraryNote: null,
    ...overrides,
  };
}

describe("findSimilarlyNumberedProvisions", () => {
  it("never infers a parent/sub-clause relationship across different instruments — same number", () => {
    const target = makeProvision({ id: "A-4-2-e", instrument: "Test Instrument A", provisionNumber: "Regulation 4(2)(e)" });
    const other = makeProvision({ id: "B-4-2-e", instrument: "Test Instrument B", provisionNumber: "Regulation 4(2)(e)" });
    const result = findSimilarlyNumberedProvisions(target, [target, other]);
    expect(result).toHaveLength(1);
    expect(result[0].relation).toBe("similarly_numbered_different_instrument");
  });

  it("never infers a parent/sub-clause relationship across different instruments — overlapping/prefix numbering", () => {
    const target = makeProvision({ id: "A-4-2-e", instrument: "Test Instrument A", provisionNumber: "Regulation 4(2)(e)" });
    const other = makeProvision({ id: "B-4-2-e-i", instrument: "Test Instrument B", provisionNumber: "Regulation 4(2)(e)(i)" });
    const result = findSimilarlyNumberedProvisions(target, [target, other]);
    expect(result).toHaveLength(1);
    expect(result[0].relation).not.toBe("sub_clause_of");
    expect(result[0].relation).not.toBe("parent_of");
    expect(result[0].relation).toBe("similarly_numbered_different_instrument");
  });

  it("only reports a genuine sub-clause relationship when both provisions share the same instrument", () => {
    const target = makeProvision({ id: "A-4-2", instrument: "Test Instrument A", provisionNumber: "Regulation 4(2)" });
    const other = makeProvision({ id: "A-4-2-e", instrument: "Test Instrument A", provisionNumber: "Regulation 4(2)(e)" });
    const result = findSimilarlyNumberedProvisions(target, [target, other]);
    expect(result).toHaveLength(1);
    expect(result[0].relation).toBe("sub_clause_of");
  });

  it("reports the reverse (parent_of) direction correctly, same instrument only", () => {
    const target = makeProvision({ id: "A-4-2-e", instrument: "Test Instrument A", provisionNumber: "Regulation 4(2)(e)" });
    const other = makeProvision({ id: "A-4-2", instrument: "Test Instrument A", provisionNumber: "Regulation 4(2)" });
    const result = findSimilarlyNumberedProvisions(target, [target, other]);
    expect(result).toHaveLength(1);
    expect(result[0].relation).toBe("parent_of");
  });

  it("keeps PFUTP Regulation 4(2)(e) and LODR Regulation 4(2)(e)(i) legally and structurally distinct", () => {
    const pfutp = makeProvision({ id: "PFUTP-4-2-e", instrument: "PFUTP Regulations, 2003", provisionNumber: "Regulation 4(2)(e)" });
    const lodr = makeProvision({ id: "LODR-4-2-e-i", instrument: "LODR Regulations, 2015", provisionNumber: "Regulation 4(2)(e)(i)" });

    const fromPfutp = findSimilarlyNumberedProvisions(pfutp, [pfutp, lodr]);
    expect(fromPfutp).toHaveLength(1);
    expect(fromPfutp[0].provision.id).toBe("LODR-4-2-e-i");
    expect(fromPfutp[0].relation).toBe("similarly_numbered_different_instrument");
    expect(fromPfutp[0].relation).not.toBe("sub_clause_of");
    expect(fromPfutp[0].relation).not.toBe("parent_of");

    const fromLodr = findSimilarlyNumberedProvisions(lodr, [pfutp, lodr]);
    expect(fromLodr).toHaveLength(1);
    expect(fromLodr[0].provision.id).toBe("PFUTP-4-2-e");
    expect(fromLodr[0].relation).toBe("similarly_numbered_different_instrument");
  });

  it("does not flag unrelated numbering as similar", () => {
    const target = makeProvision({ id: "A-4-2-e", instrument: "Test Instrument A", provisionNumber: "Regulation 4(2)(e)" });
    const unrelated = makeProvision({ id: "A-11", instrument: "Test Instrument A", provisionNumber: "Section 11" });
    const result = findSimilarlyNumberedProvisions(target, [target, unrelated]);
    expect(result).toHaveLength(0);
  });
});
