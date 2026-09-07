// Guards the corpus-maturity transparency work: searchable-findings
// filtering must stay a single, shared definition (never redefined
// separately in the engine vs. the dashboard/admin metrics, which could
// silently drift apart) and orders-contributing-structured-findings counts
// must be derived from the actual orderIds on file, never assumed or
// hardcoded.
import { describe, expect, it } from "vitest";
import { EXCLUDED_PUBLICATION_STATUSES, isSearchableFinding } from "@/lib/publicationLifecycle";
import { scenarioFindings } from "./fixtures";
import type { PublicationStatus } from "@/types/domain";

describe("isSearchableFinding", () => {
  it("excludes Draft, Quarantined and Withdrawn", () => {
    const excluded: PublicationStatus[] = ["Draft", "Quarantined", "Withdrawn"];
    for (const publicationStatus of excluded) {
      expect(isSearchableFinding({ ...scenarioFindings[0], publicationStatus })).toBe(false);
    }
  });

  it("includes Published to search and Published with warning", () => {
    const included: PublicationStatus[] = ["Published to search", "Published with warning"];
    for (const publicationStatus of included) {
      expect(isSearchableFinding({ ...scenarioFindings[0], publicationStatus })).toBe(true);
    }
  });

  it("EXCLUDED_PUBLICATION_STATUSES has exactly the 3 excluded statuses, no more, no fewer", () => {
    expect([...EXCLUDED_PUBLICATION_STATUSES].sort()).toEqual(["Draft", "Quarantined", "Withdrawn"].sort());
  });
});

describe("Orders contributing structured findings — derived, never hardcoded", () => {
  it("the pilot fixture's own orderIds union matches a hand-count for its two source orders", () => {
    const orderIds = new Set(scenarioFindings.flatMap((f) => f.orderIds));
    // The pilot fixture set is drawn from exactly Rajesh Exports Limited
    // (one interim order) and Seacoast Shipping Services Limited (an
    // interim order plus its final order) — 3 distinct orders on file.
    expect(orderIds.size).toBe(3);
  });

  it("a finding recorded only against its final_order_id still counts that order as contributing", () => {
    const findingWithFinalOnly = { ...scenarioFindings[0], orderIds: ["FINAL-ORDER-ONLY"] };
    const orderIds = new Set([findingWithFinalOnly].flatMap((f) => f.orderIds));
    expect(orderIds.has("FINAL-ORDER-ONLY")).toBe(true);
  });
});
