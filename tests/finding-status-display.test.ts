// Post-checkpoint-5 officer-UX overhaul: findingStatusLabel/
// findingDispositionLabel no longer guess an order stage from the
// FindingStatus value -- order stage and finding disposition are different
// dimensions (see src/lib/findingStatusDisplay.ts's own header comment) and
// must never be fused into one compound label like "Final order · Not
// confirmed" again. The underlying FindingStatus enum value itself stays
// completely unaffected -- this only governs what text renders.
import { describe, expect, it } from "vitest";
import { findingDispositionLabel, findingStatusLabel } from "@/lib/findingStatusDisplay";
import type { FindingStatus } from "@/types/domain";

const ALL_STATUSES: FindingStatus[] = [
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

describe("findingDispositionLabel (badge-safe: pair with OrderStageBadge, never a guessed stage)", () => {
  it("never returns text containing the word 'order' for any status -- stage is a separate concern", () => {
    for (const s of ALL_STATUSES) {
      const label = findingDispositionLabel(s);
      if (label) expect(label.toLowerCase()).not.toContain("order");
    }
  });

  it('returns null for "Alleged" and "Prima facie" -- neither is a disposition fact, and neither may render as a status badge', () => {
    expect(findingDispositionLabel("Alleged")).toBeNull();
    expect(findingDispositionLabel("Prima facie")).toBeNull();
  });

  it("uses conservative, source-supportable disposition wording for final-order statuses", () => {
    expect(findingDispositionLabel("Confirmed in Final Order")).toBe("Contravention established");
    expect(findingDispositionLabel("Partly Confirmed in Final Order")).toBe("Partly established");
    expect(findingDispositionLabel("Not Confirmed in Final Order")).toBe("Contravention not established");
  });

  it("never re-labels Withdrawn/Inconclusive/Procedural observation as a disguised negative", () => {
    expect(findingDispositionLabel("Withdrawn")).toBe("Withdrawn");
    expect(findingDispositionLabel("Inconclusive")).toBe("Inconclusive");
    expect(findingDispositionLabel("Procedural observation")).toBe("Procedural observation");
  });
});

describe("findingStatusLabel (export-only fallback text, still never a guessed order-stage prefix)", () => {
  it("never contains the word 'order' immediately followed by a middle-dot compound (the old 'Final order · X' pattern)", () => {
    for (const s of ALL_STATUSES) {
      expect(findingStatusLabel(s)).not.toMatch(/\border\s*·/i);
    }
  });

  it("uses fuller explanatory prose for Alleged/Prima facie rather than the bare word functioning as a status tag", () => {
    expect(findingStatusLabel("Alleged")).not.toBe("Alleged");
    expect(findingStatusLabel("Alleged").toLowerCase()).toContain("not yet decided");
    expect(findingStatusLabel("Prima facie")).not.toBe("Prima facie");
    expect(findingStatusLabel("Prima facie").toLowerCase()).toContain("prima facie");
  });

  it("matches findingDispositionLabel for every status that has a real disposition", () => {
    for (const s of ALL_STATUSES) {
      const disposition = findingDispositionLabel(s);
      if (disposition) expect(findingStatusLabel(s)).toBe(disposition);
    }
  });

  it("has a non-empty entry for every FindingStatus value", () => {
    for (const s of ALL_STATUSES) {
      expect(findingStatusLabel(s)).toBeTruthy();
    }
  });
});
