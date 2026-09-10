import type { FindingStatus } from "@/types/domain";

// Post-checkpoint-5 officer-UX overhaul: ORDER STAGE and FINDING DISPOSITION
// are different dimensions and must never be fused into one compound label.
// The previous version of this module baked a GUESSED stage word ("Final
// order · ", "Interim order · ") directly into each FindingStatus's display
// text — not derived from the actual linked Order.orderStage, just an
// assumption per enum value. That produced exactly the defect a live CFID
// officer flagged: a finding disposition line reading "Final order · Not
// confirmed" sitting next to (or in place of) an order's own genuine stage
// badge, which for a case like DB Realty Limited (a real Final Order, SEBI
// order dated 4 Feb 2025) read as if the tool were contradicting its own
// order-stage classification.
//
// The actual procedural stage of an order is ALWAYS sourced from
// Order.orderStage (see OrderStageBadge) — never guessed here. This module
// now exposes DISPOSITION-ONLY text: what happened to this specific
// finding, never what kind of document decided it, and never combined with
// a stage word. "Alleged" and "Prima facie" deliberately never render as a
// terse status badge anywhere in the officer-facing app (global product
// rule) — findingDispositionLabel returns null for both, since nothing has
// actually been decided by any order yet; findingStatusLabel (still used in
// the free-form text/CSV research-brief exports, which cite a precedent
// inline with no Order object at hand to pair a stage badge against) uses
// fuller explanatory phrasing for those two instead of the bare word
// functioning as a two-word pseudo-badge.
const FINDING_DISPOSITION_LABEL: Record<FindingStatus, string | null> = {
  Alleged: null,
  "Prima facie": null,
  "Confirmed at interim": "Confirmed at interim stage",
  "Confirmed in Final Order": "Contravention established",
  "Partly Confirmed in Final Order": "Partly established",
  "Not Confirmed in Final Order": "Contravention not established",
  Withdrawn: "Withdrawn",
  Inconclusive: "Inconclusive",
  "Procedural observation": "Procedural observation",
};

/** The finding's own disposition/outcome, with no guessed order-stage
 * prefix and never the bare word "Alleged"/"Prima facie" — null for those
 * two, since nothing has actually been decided by any order yet and
 * neither may render as a status badge (global officer-facing product
 * rule). Pair with OrderStageBadge (sourced from the actual linked
 * Order.orderStage) wherever an officer also needs to know what kind of
 * document this finding came from — never derive the stage from this
 * function, and never re-combine the two into one string. */
export function findingDispositionLabel(status: FindingStatus): string | null {
  return FINDING_DISPOSITION_LABEL[status];
}

// Fuller, export-safe phrasing for the two statuses findingDispositionLabel
// returns null for — a free-form citation line still needs SOME text, and
// "Alleged (not yet decided by any order)" reads as explanatory prose, not
// a terse status tag, so it stays within the "prose may describe this"
// carve-out of the same global rule.
const EXPORT_ONLY_LABEL: Partial<Record<FindingStatus, string>> = {
  Alleged: "Alleged (not yet decided by any order)",
  "Prima facie": "Prima facie view recorded in an interim order",
};

/** Used only by the Scenario Analyzer's free-form text/CSV research-brief
 * exports (resultToText/resultToCsv), which cite a precedent inline with no
 * Order object at hand to pair a separate stage badge against. Disposition
 * text only, identical to findingDispositionLabel — never a guessed stage
 * prefix — with EXPORT_ONLY_LABEL's fuller phrasing standing in for the two
 * statuses that have no disposition yet. Never used to drive a colored
 * on-screen badge component; see findingDispositionLabel + OrderStageBadge
 * for those. */
export function findingStatusLabel(status: FindingStatus): string {
  return EXPORT_ONLY_LABEL[status] ?? FINDING_DISPOSITION_LABEL[status] ?? status;
}
