import type { OrderStage } from "@/types/domain";

/** Officer-facing DISPLAY normalization only — collapses the exact
 * orderStage values that are all genuinely "interim-family" orders (an
 * interim order proper, an interim order combined with a show-cause
 * notice, or any future interim variant) into one simple badge/filter
 * label an officer scanning the Case Library actually needs: "is this
 * still at the interim stage, or has it moved on". This is a DISPLAY
 * mapping only — it never writes back to orders.order_type, never changes
 * OrderStageBadge (which continues to render the exact orderStage verbatim
 * elsewhere in the app, e.g. Order Detail, Home, ProvisionOrderList), and
 * is not a substitute for the separate, full order-type reclassification
 * audit covering all ~92 corpus orders (explicitly out of scope for this
 * pass). Every OrderStage value maps to exactly one family below, so this
 * can never silently drop an order from a family-filtered view. */
export type CaseLibraryOrderTypeFamily = "Interim" | "Confirmatory" | "Final" | "Adjudication" | "Revocation" | "Other";

const FAMILY_BY_STAGE: Record<OrderStage, CaseLibraryOrderTypeFamily> = {
  "Interim order": "Interim",
  "Interim order cum show cause notice": "Interim",
  "Confirmatory order": "Confirmatory",
  "Final order": "Final",
  "Adjudication order": "Adjudication",
  "Settlement order": "Other",
  "Revocation order": "Revocation",
  Other: "Other",
};

export function caseLibraryOrderTypeFamily(orderStage: OrderStage): CaseLibraryOrderTypeFamily {
  return FAMILY_BY_STAGE[orderStage];
}

/** Display order for the family filter/badges — interim-and-earlier-stage
 * families first, then dispositive/final-stage families, matching how an
 * officer would scan a case's procedural progression. */
export const CASE_LIBRARY_ORDER_TYPE_FAMILY_ORDER: CaseLibraryOrderTypeFamily[] = [
  "Interim",
  "Confirmatory",
  "Adjudication",
  "Final",
  "Revocation",
  "Other",
];
