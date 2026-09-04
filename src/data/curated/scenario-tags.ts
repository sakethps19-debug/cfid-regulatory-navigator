// Curated fact-element overlay for the 34 scenario findings drawn from
// CFID_Precedent_Library_Pilot.xlsx ("Scenario Findings" sheet).
//
// This file does NOT add, remove or alter any fact, finding, status,
// paragraph reference or provision from the workbook. It only tags each
// existing record with controlled-vocabulary concept ids (defined in
// concept-tags.ts) so the deterministic matching engine can compare a
// user's scenario against the workbook's own factual patterns, and it
// records the evidentiary gaps already described in the workbook's
// "Legal Tests" sheet and qualification notes. Tags are curation, not
// new facts.

export interface ScenarioTagOverlay {
  recordId: string;
  transactionTypes: string[];
  actorRoles: string[];
  evidenceTypes: string[];
  allegedConduct: string[];
  /** Genuine outstanding evidentiary gaps only — never a note about the
   * precedent's own historical outcome; see precedentOutcomeNote below. */
  evidentiaryGaps: string[];
  /** How this precedent's own allegation was resolved, when applicable —
   * kept structurally separate from evidentiaryGaps so the Scenario
   * Analyzer never mixes "this precedent's history" into a checklist of
   * missing evidence for the user's present scenario. */
  precedentOutcomeNote?: string;
}

const RESOLVED_NOTE = "None outstanding — this allegation was resolved in the final order.";

export const SCENARIO_TAG_OVERLAY: ScenarioTagOverlay[] = [
  {
    recordId: "REL-01",
    transactionTypes: ["financial_statement_disclosure", "consolidated_financials"],
    actorRoles: ["company"],
    evidenceTypes: ["audited_financial_statements", "consolidation_workpapers"],
    allegedConduct: ["non_disclosure_of_information"],
    evidentiaryGaps: [
      "Subsidiary and step-down subsidiary financial statements and consolidation working papers",
      "Confirmation of the website/filing publication history",
    ],
  },
  {
    recordId: "REL-02",
    transactionTypes: ["consolidated_financials", "financial_statement_disclosure"],
    actorRoles: ["company"],
    evidenceTypes: ["audited_financial_statements", "consolidation_workpapers", "gst_tax_records", "bank_statements_flow"],
    allegedConduct: ["financial_statement_misstatement", "fictitious_sales_or_assets", "price_manipulation_nexus"],
    evidentiaryGaps: [
      "Subsidiary-level books and consolidation support for the revenue figures",
      "Independent verification of customer-wise sales",
      "Completion of the forensic audit",
    ],
  },
  {
    recordId: "REL-03",
    transactionTypes: ["investigation_process"],
    actorRoles: ["company"],
    evidenceTypes: ["correspondence_summons_replies"],
    allegedConduct: ["non_cooperation_with_investigation"],
    evidentiaryGaps: [
      "Complete and consistent customer-wise sales data",
      "Explanation for the differing submissions across stages",
    ],
  },
  {
    recordId: "REL-04",
    transactionTypes: ["derivative_transaction", "fund_transfer_personal_account", "standalone_financials"],
    actorRoles: ["company", "promoter"],
    evidenceTypes: ["bank_statements_flow", "audited_financial_statements"],
    allegedConduct: ["fictitious_sales_or_assets", "financial_statement_misstatement", "price_manipulation_nexus"],
    evidentiaryGaps: [
      "Broker/exchange records for the promoter's personal derivative account",
      "Reconciliation showing how the personal trades entered the company's books",
      "Explanation from the promoter",
    ],
  },
  {
    recordId: "REL-05",
    transactionTypes: ["revenue_recognition", "standalone_financials"],
    actorRoles: ["company"],
    evidenceTypes: ["audited_financial_statements"],
    allegedConduct: ["financial_statement_misstatement"],
    evidentiaryGaps: [
      "Ind AS 21/115 classification workpapers",
      "Year-wise break-up of the foreign-exchange and interest components",
    ],
  },
  {
    recordId: "REL-06",
    transactionTypes: ["purchase_transaction"],
    actorRoles: ["company", "related_party_counterparty"],
    evidenceTypes: ["delivery_inventory_records", "gst_tax_records", "bank_statements_flow"],
    allegedConduct: ["fictitious_sales_or_assets", "financial_statement_misstatement"],
    evidentiaryGaps: [
      "Delivery challans, GST filings and banking trail for the purchases",
      "Confirmation from Vienna Multiventures and Harshil Enterprise",
    ],
  },
  {
    recordId: "REL-07",
    transactionTypes: ["consolidated_financials"],
    actorRoles: ["company"],
    evidenceTypes: ["consolidation_workpapers", "audited_financial_statements"],
    allegedConduct: ["financial_statement_misstatement"],
    evidentiaryGaps: [
      "Consolidation elimination workpapers",
      "Entity-wise intra-group balance confirmations",
    ],
  },
  {
    recordId: "REL-08",
    transactionTypes: ["investment_valuation"],
    actorRoles: ["company"],
    evidenceTypes: ["audited_financial_statements"],
    allegedConduct: ["financial_statement_misstatement", "fictitious_sales_or_assets"],
    evidentiaryGaps: [
      "Entity-wise documentary support for the investment",
      "Independent valuation or title evidence",
    ],
  },
  {
    recordId: "REL-09",
    transactionTypes: ["receivables_payables_adjustment"],
    actorRoles: ["company", "related_party_counterparty"],
    evidenceTypes: ["audited_financial_statements", "related_party_register"],
    allegedConduct: ["financial_statement_misstatement"],
    evidentiaryGaps: [
      "Multi-party netting/knock-off agreements and the basis for offset",
      "Counterparty confirmations",
    ],
  },
  {
    recordId: "REL-10",
    transactionTypes: ["fund_transfer_personal_account", "related_party_transaction"],
    actorRoles: ["company", "promoter"],
    evidenceTypes: ["bank_statements_flow"],
    allegedConduct: ["fund_routed_personal_account", "financial_statement_misstatement"],
    evidentiaryGaps: [
      "Board/Audit Committee approvals for routing payments through personal accounts",
      "End-use evidence for the statutory and operating payments",
      "Related-party disclosure records",
    ],
  },
  {
    recordId: "REL-11",
    transactionTypes: ["fund_transfer_promoter_entity", "related_party_transaction"],
    actorRoles: ["company", "promoter", "related_party_counterparty"],
    evidenceTypes: ["bank_statements_flow", "related_party_register"],
    allegedConduct: ["fund_diversion"],
    evidentiaryGaps: [
      "Business rationale and board approval for the transfers",
      "End-use/utilisation evidence",
      "Confirmation from the counterparty entities",
    ],
  },
  {
    recordId: "REL-12",
    transactionTypes: ["financial_statement_disclosure"],
    actorRoles: ["company"],
    evidenceTypes: ["audited_financial_statements"],
    allegedConduct: ["price_manipulation_nexus", "financial_statement_misstatement"],
    evidentiaryGaps: [
      "Evidence connecting the disclosures to actual trading or price impact",
      "Completion of the forensic audit",
    ],
  },
  {
    recordId: "SSSL-01",
    transactionTypes: ["financial_statement_disclosure", "standalone_financials"],
    actorRoles: ["company"],
    evidenceTypes: ["audited_financial_statements", "forensic_audit_report", "bank_statements_flow"],
    allegedConduct: ["fictitious_sales_or_assets", "financial_statement_misstatement", "price_manipulation_nexus"],
    evidentiaryGaps: [],
    precedentOutcomeNote: RESOLVED_NOTE,
  },
  {
    recordId: "SSSL-02",
    transactionTypes: ["preferential_allotment"],
    actorRoles: ["company", "promoter", "allottee_promoter"],
    evidenceTypes: ["shareholding_allotment_records", "audited_financial_statements"],
    allegedConduct: ["sham_preferential_allotment", "financial_statement_misstatement"],
    evidentiaryGaps: [],
    precedentOutcomeNote: RESOLVED_NOTE,
  },
  {
    recordId: "SSSL-03",
    transactionTypes: ["preferential_allotment", "cash_credit_facility"],
    actorRoles: ["company", "allottee_promoter", "allottee_third_party"],
    evidenceTypes: ["bank_statements_flow", "audited_financial_statements", "third_party_examination_statements"],
    allegedConduct: ["circular_fund_movement", "unsupported_share_allotment_consideration"],
    evidentiaryGaps: [
      "Important negative precedent: the final order accepted supported explanations for the loans/advances underlying the allotment.",
      "Third parties were not examined by the investigation.",
      "Sale proceeds remained with the allottees; no flow-back to the company or promoter was proved.",
    ],
  },
  {
    recordId: "SSSL-04",
    transactionTypes: ["rights_issue", "cash_credit_facility", "purchase_transaction"],
    actorRoles: ["company"],
    evidenceTypes: ["bank_statements_flow", "delivery_inventory_records", "utilisation_of_issue_proceeds_certificate"],
    allegedConduct: ["fund_diversion", "fictitious_sales_or_assets"],
    evidentiaryGaps: [],
    precedentOutcomeNote: RESOLVED_NOTE,
  },
  {
    recordId: "SSSL-05",
    transactionTypes: ["annual_report_disclosure", "related_party_transaction"],
    actorRoles: ["company"],
    evidenceTypes: ["audited_financial_statements"],
    allegedConduct: ["non_disclosure_of_information", "financial_statement_misstatement"],
    evidentiaryGaps: [],
    precedentOutcomeNote: RESOLVED_NOTE,
  },
  {
    recordId: "SSSL-06",
    transactionTypes: ["business_segment_disclosure"],
    actorRoles: ["company"],
    evidenceTypes: ["audited_financial_statements"],
    allegedConduct: ["false_business_or_corporate_announcement", "non_disclosure_of_information"],
    evidentiaryGaps: [],
    precedentOutcomeNote: RESOLVED_NOTE,
  },
  {
    recordId: "SSSL-07",
    transactionTypes: ["corporate_announcement"],
    actorRoles: ["company"],
    evidenceTypes: ["correspondence_summons_replies"],
    allegedConduct: ["false_business_or_corporate_announcement"],
    evidentiaryGaps: [],
    precedentOutcomeNote: RESOLVED_NOTE,
  },
  {
    recordId: "SSSL-08",
    transactionTypes: ["related_party_transaction", "annual_report_disclosure"],
    actorRoles: ["company", "related_party_counterparty"],
    evidenceTypes: ["related_party_register", "audit_committee_minutes_agendas"],
    allegedConduct: ["related_party_misrepresentation"],
    evidentiaryGaps: [],
    precedentOutcomeNote: RESOLVED_NOTE,
  },
  {
    recordId: "SSSL-09",
    transactionTypes: ["audit_committee_process"],
    actorRoles: ["company", "audit_committee_member", "independent_director"],
    evidenceTypes: ["board_minutes", "related_party_register"],
    allegedConduct: ["audit_committee_deficiency"],
    evidentiaryGaps: [],
    precedentOutcomeNote: RESOLVED_NOTE,
  },
  {
    recordId: "SSSL-10",
    transactionTypes: ["audit_committee_process"],
    actorRoles: ["company", "audit_committee_member"],
    evidenceTypes: ["audit_committee_minutes_agendas"],
    allegedConduct: ["audit_committee_deficiency", "false_compliance_certification"],
    evidentiaryGaps: [],
    precedentOutcomeNote: RESOLVED_NOTE,
  },
  {
    recordId: "SSSL-11",
    transactionTypes: ["compliance_officer_appointment"],
    actorRoles: ["company", "compliance_officer"],
    evidenceTypes: ["board_minutes"],
    allegedConduct: ["compliance_officer_deficiency"],
    evidentiaryGaps: [],
    precedentOutcomeNote: RESOLVED_NOTE,
  },
  {
    recordId: "SSSL-12",
    transactionTypes: ["board_director_duties"],
    actorRoles: ["managing_director"],
    evidenceTypes: ["audited_financial_statements", "bank_statements_flow"],
    allegedConduct: ["financial_statement_misstatement", "fund_diversion", "director_governance_failure"],
    evidentiaryGaps: [
      "Liability for the SSSL-03 cash preferential-allotment allegation was specifically excluded — do not treat the Managing Director's overall liability as extending to that allegation.",
    ],
  },
  {
    recordId: "SSSL-13",
    transactionTypes: ["preferential_allotment"],
    actorRoles: ["promoter", "allottee_promoter"],
    evidenceTypes: ["shareholding_allotment_records"],
    allegedConduct: ["sham_preferential_allotment"],
    evidentiaryGaps: [],
    precedentOutcomeNote: RESOLVED_NOTE,
  },
  {
    recordId: "SSSL-14",
    transactionTypes: ["board_director_duties"],
    actorRoles: ["managing_director", "executive_director"],
    evidenceTypes: ["board_minutes"],
    allegedConduct: ["director_governance_failure"],
    evidentiaryGaps: [],
    precedentOutcomeNote: RESOLVED_NOTE,
  },
  {
    recordId: "SSSL-15",
    transactionTypes: ["audit_committee_process", "board_director_duties"],
    actorRoles: ["audit_committee_member"],
    evidenceTypes: ["audit_committee_minutes_agendas", "utilisation_of_issue_proceeds_certificate"],
    allegedConduct: ["audit_committee_deficiency", "director_governance_failure"],
    evidentiaryGaps: [],
    precedentOutcomeNote: RESOLVED_NOTE,
  },
  {
    recordId: "SSSL-16",
    transactionTypes: ["certification_process"],
    actorRoles: ["managing_director"],
    evidenceTypes: ["board_minutes"],
    allegedConduct: ["false_compliance_certification"],
    evidentiaryGaps: [],
    precedentOutcomeNote: RESOLVED_NOTE,
  },
  {
    recordId: "SSSL-17",
    transactionTypes: ["board_director_duties"],
    actorRoles: ["executive_director"],
    evidenceTypes: ["audited_financial_statements", "bank_statements_flow"],
    allegedConduct: ["aiding_abetting", "director_governance_failure"],
    evidentiaryGaps: [],
    precedentOutcomeNote: RESOLVED_NOTE,
  },
  {
    recordId: "SSSL-18",
    transactionTypes: ["preferential_allotment"],
    actorRoles: ["allottee_third_party"],
    evidenceTypes: ["bank_statements_flow", "third_party_examination_statements"],
    allegedConduct: ["circular_fund_movement", "unsupported_share_allotment_consideration"],
    evidentiaryGaps: [
      "Negative precedent: the evidence did not establish that the allottees used the company's own money or that sale proceeds returned to the company or the promoter; directions against these noticees were vacated.",
    ],
  },
  {
    recordId: "SSSL-19",
    transactionTypes: ["audit_committee_process", "board_director_duties"],
    actorRoles: ["director_general", "audit_committee_member"],
    evidenceTypes: ["audit_committee_minutes_agendas"],
    allegedConduct: ["audit_committee_deficiency", "director_governance_failure"],
    evidentiaryGaps: [],
    precedentOutcomeNote: RESOLVED_NOTE,
  },
  {
    recordId: "SSSL-20",
    transactionTypes: ["audit_committee_process", "board_director_duties"],
    actorRoles: ["independent_director", "audit_committee_member"],
    evidenceTypes: ["audit_committee_minutes_agendas"],
    allegedConduct: ["audit_committee_deficiency", "director_governance_failure"],
    evidentiaryGaps: [],
    precedentOutcomeNote: RESOLVED_NOTE,
  },
  {
    recordId: "SSSL-21",
    transactionTypes: ["board_director_duties"],
    actorRoles: ["independent_director"],
    evidenceTypes: ["board_minutes"],
    allegedConduct: ["director_governance_failure"],
    evidentiaryGaps: [],
    precedentOutcomeNote: RESOLVED_NOTE,
  },
  {
    recordId: "SSSL-22",
    transactionTypes: ["compliance_officer_appointment", "audit_committee_process"],
    actorRoles: ["compliance_officer"],
    evidenceTypes: ["audit_committee_minutes_agendas"],
    allegedConduct: ["compliance_officer_deficiency", "audit_committee_deficiency"],
    evidentiaryGaps: [],
    precedentOutcomeNote: RESOLVED_NOTE,
  },
];
