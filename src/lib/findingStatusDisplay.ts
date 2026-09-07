import type { FindingStatus } from "@/types/domain";

// Human-facing label for a finding's procedural status, order-stage-first
// ("Interim order"/"Final order") rather than folding the stage and the
// outcome into one compound phrase ("Confirmed at interim"/"Confirmed in
// Final Order") -- per explicit feedback that the order stage itself
// (interim/final/revocation, etc) should be named plainly, separate from
// what that order actually decided about the allegation.
//
// The underlying FindingStatus enum VALUE is unchanged everywhere else in
// the app -- the database mapping, the matching engine's scoring/grouping
// sets (NEGATIVE_STATUSES/UPHELD_STATUSES/UNRESOLVED_STATUSES/
// FINAL_ORDER_DISPOSITIONS), and every test fixture all still key off the
// same 9 values. Only this display label changes.
//
// Two statuses deliberately get NO stage prefix, rather than a guessed one:
// - "Alleged" is, by its own definition (see FindingsByStatus.GROUP_INFO),
//   raised in the show-cause notice and not yet ruled on by any order at
//   all -- labelling it "Interim order" would misstate the record.
// - Withdrawn / Inconclusive / Procedural observation can each occur at
//   either an interim or a final stage, and the status value alone does not
//   say which; showing no stage is more honest than guessing one.
const FINDING_STATUS_DISPLAY_LABEL: Record<FindingStatus, string> = {
  Alleged: "Alleged",
  "Prima facie": "Interim order · Prima facie",
  "Confirmed at interim": "Interim order · Confirmed",
  "Confirmed in Final Order": "Final order · Confirmed",
  "Partly Confirmed in Final Order": "Final order · Partly confirmed",
  "Not Confirmed in Final Order": "Final order · Not confirmed",
  Withdrawn: "Withdrawn",
  Inconclusive: "Inconclusive",
  "Procedural observation": "Procedural observation",
};

export function findingStatusLabel(status: FindingStatus): string {
  return FINDING_STATUS_DISPLAY_LABEL[status];
}
