// Guards findingStatusLabel: order-stage-first display labels
// ("Final order · Confirmed" rather than "Confirmed in Final Order"), per
// explicit user feedback. The underlying FindingStatus enum value itself
// must stay completely unaffected -- this only governs what text renders.
import { describe, expect, it } from "vitest";
import { findingStatusLabel } from "@/lib/findingStatusDisplay";
import type { FindingStatus } from "@/types/domain";

describe("findingStatusLabel", () => {
  it("leads with the order stage for statuses that are unambiguously tied to one", () => {
    expect(findingStatusLabel("Prima facie")).toBe("Interim order · Prima facie");
    expect(findingStatusLabel("Confirmed at interim")).toBe("Interim order · Confirmed");
    expect(findingStatusLabel("Confirmed in Final Order")).toBe("Final order · Confirmed");
    expect(findingStatusLabel("Partly Confirmed in Final Order")).toBe("Final order · Partly confirmed");
    expect(findingStatusLabel("Not Confirmed in Final Order")).toBe("Final order · Not confirmed");
  });

  it('never claims an order stage for "Alleged" (not yet ruled on by any order)', () => {
    expect(findingStatusLabel("Alleged")).toBe("Alleged");
    expect(findingStatusLabel("Alleged")).not.toContain("order");
  });

  it("never guesses a stage for statuses that can occur at either interim or final", () => {
    expect(findingStatusLabel("Withdrawn")).toBe("Withdrawn");
    expect(findingStatusLabel("Inconclusive")).toBe("Inconclusive");
    expect(findingStatusLabel("Procedural observation")).toBe("Procedural observation");
    for (const s of ["Withdrawn", "Inconclusive", "Procedural observation"] as FindingStatus[]) {
      expect(findingStatusLabel(s)).not.toContain("order");
    }
  });

  it("has an entry for every FindingStatus value", () => {
    const all: FindingStatus[] = [
      "Alleged",
      "Prima facie",
      "Confirmed at interim",
      "Confirmed in Final Order",
      "Partly Confirmed in Final Order",
      "Not Confirmed in Final Order",
      "Withdrawn",
      "Inconclusive",
      "Procedural observation",
    ];
    for (const s of all) {
      expect(findingStatusLabel(s)).toBeTruthy();
    }
  });
});
