// Maps detected concept-tag ids to the Legal Tests sheet rows (by
// `provisionOrIssue` text, matched at runtime against the imported
// legalTests.json) that should always surface as guardrails when those
// concepts are detected in a scenario — regardless of which precedent
// findings score highest. This keeps the safeguards in section 4 of the
// brief (circular fund-flow testing, third-party examination, distinct
// transactions, ultimate benefit, interim-vs-final) visible even when the
// matching engine's precedent ranking would not otherwise surface them.

export const GUARDRAIL_TRIGGERS: Record<string, string[]> = {
  circular_fund_movement: [
    "Circular fund-flow allegation",
    "Third-party examination",
    "Distinct transactions",
    "Ultimate benefit / sale proceeds",
  ],
  preferential_allotment: [
    "Circular fund-flow allegation",
    "Third-party examination",
    "Ultimate benefit / sale proceeds",
  ],
  cash_credit_facility: ["Circular fund-flow allegation", "Ultimate benefit / sale proceeds"],
  fund_diversion: ["Circular fund-flow allegation", "Ultimate benefit / sale proceeds"],
  fund_transfer_personal_account: ["Circular fund-flow allegation", "Ultimate benefit / sale proceeds"],
  fund_transfer_promoter_entity: ["Circular fund-flow allegation", "Third-party examination"],
  price_manipulation_nexus: ["PFUTP 4(2)(e): market nexus"],
  fictitious_sales_or_assets: ["Financial misstatement evidence"],
  financial_statement_misstatement: ["Financial misstatement evidence"],
};

/** Always shown once any Prima facie / interim-only finding appears in results. */
export const ALWAYS_ON_INTERIM_GUARDRAIL = "Interim versus final status";
