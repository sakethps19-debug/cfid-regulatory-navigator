// Guards the bug where FindingsByStatus's status→group list covered only 4
// of the 9 FindingStatus values, silently dropping any finding whose status
// was confirmed_at_interim, alleged, inconclusive, procedural_observation
// or withdrawn from every order-detail page — 18 of 80 findings in the live
// data, with no error and no "not linked" message, just an empty section.
import { describe, expect, it } from "vitest";
import { GROUP_INFO, GROUP_ORDER } from "@/components/FindingsByStatus";
import type { FindingStatus } from "@/types/domain";

const ALL_STATUSES: FindingStatus[] = [
  "Alleged",
  "Prima facie",
  "Confirmed at interim",
  "Upheld",
  "Partly upheld",
  "Not upheld",
  "Withdrawn",
  "Inconclusive",
  "Procedural observation",
];

describe("FindingsByStatus grouping", () => {
  it("GROUP_INFO has an entry for every FindingStatus", () => {
    for (const status of ALL_STATUSES) {
      expect(GROUP_INFO[status]).toBeTruthy();
      expect(GROUP_INFO[status].title).toBeTruthy();
      expect(GROUP_INFO[status].hint).toBeTruthy();
    }
  });

  it("GROUP_ORDER lists every FindingStatus exactly once", () => {
    expect(new Set(GROUP_ORDER)).toEqual(new Set(ALL_STATUSES));
    expect(GROUP_ORDER.length).toBe(ALL_STATUSES.length);
  });
});
