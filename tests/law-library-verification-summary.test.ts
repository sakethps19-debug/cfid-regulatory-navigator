// Guards P1-12/13's overclaim-prevention fix: computeVerificationSummary
// must accurately report how narrow the officially-verified base of the
// Law Library is, live-computed from the provisions list (never
// hardcoded), so the Law Library can surface this directly rather than
// requiring an officer to notice it by counting per-provision badges.
import { describe, expect, it } from "vitest";
import { computeVerificationSummary } from "@/components/LawLibraryClient";
import type { LegalProvision } from "@/types/domain";

function makeProvision(overrides: Partial<LegalProvision> & { id: string }): LegalProvision {
  return {
    instrument: "Test Instrument",
    provisionNumber: "Regulation 1",
    subject: "Test subject",
    currentTextVerificationStatus: "Requires verification",
    officialSource: null,
    ordersConsidered: [],
    treatmentInPilotOrders: "",
    lawLibraryNote: null,
    ...overrides,
  };
}

describe("computeVerificationSummary", () => {
  it("counts verified provisions accurately and lists no instrument when none are verified", () => {
    const provisions = [
      makeProvision({ id: "1", instrument: "SEBI Act, 1992" }),
      makeProvision({ id: "2", instrument: "LODR Regulations, 2015", currentTextVerificationStatus: "Order-cited text only" }),
    ];
    const summary = computeVerificationSummary(provisions);
    expect(summary).toEqual({ verifiedCount: 0, total: 2, instrumentNames: [] });
  });

  it("reports the exact concentration when verification is confined to one instrument (the live 8/99-in-PFUTP-only shape)", () => {
    const provisions = [
      makeProvision({ id: "1", instrument: "PFUTP Regulations, 2003", provisionNumber: "Regulation 4(1)", currentTextVerificationStatus: "Officially verified" }),
      makeProvision({ id: "2", instrument: "PFUTP Regulations, 2003", provisionNumber: "Regulation 4(2)(a)", currentTextVerificationStatus: "Officially verified" }),
      makeProvision({ id: "3", instrument: "SEBI Act, 1992", currentTextVerificationStatus: "Requires verification" }),
      makeProvision({ id: "4", instrument: "LODR Regulations, 2015", currentTextVerificationStatus: "Order-cited text only" }),
    ];
    const summary = computeVerificationSummary(provisions);
    expect(summary).toEqual({ verifiedCount: 2, total: 4, instrumentNames: ["PFUTP Regulations, 2003"] });
  });

  it("lists every instrument with at least one verified provision, sorted and deduplicated, when spread across more than one", () => {
    const provisions = [
      makeProvision({ id: "1", instrument: "SEBI Act, 1992", currentTextVerificationStatus: "Officially verified" }),
      makeProvision({ id: "2", instrument: "LODR Regulations, 2015", currentTextVerificationStatus: "Officially verified" }),
      makeProvision({ id: "3", instrument: "LODR Regulations, 2015", provisionNumber: "Regulation 2", currentTextVerificationStatus: "Officially verified" }),
    ];
    const summary = computeVerificationSummary(provisions);
    expect(summary.verifiedCount).toBe(3);
    expect(summary.instrumentNames).toEqual(["LODR Regulations, 2015", "SEBI Act, 1992"]);
  });

  it("handles an empty provisions list without dividing by zero or throwing", () => {
    expect(computeVerificationSummary([])).toEqual({ verifiedCount: 0, total: 0, instrumentNames: [] });
  });
});
