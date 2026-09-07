# 13-named-scenario audit

## Provenance

The "13 named test scenarios" is Section 27, "REQUIRED TEST SCENARIOS", of the
consolidated implementation-and-review prompt that opened this repository's
correctness-review pass. That section's exact text:

> Maintain automated tests for at least:
>
> 1. Fictitious sales and assets disclosed through financial statements.
> 2. Promoter personal derivative transactions recorded as company revenue.
> 3. Rights-issue proceeds routed through entities against unsupported purchases.
> 4. Preferential allotment allegedly funded through circular transactions where: loans are recorded in audited accounts; third parties were not examined; sale proceeds remain with the allottees.
> 5. Company funds routed through a promoter's personal bank account.
> 6. Audit Committee not properly constituted or meetings not conducted.
> 7. Vacancy or improper appointment of the Compliance Officer.
> 8. Related-party non-disclosure.
> 9. False announcements.
> 10. False CEO/CFO certification.
> 11. Director non-cooperation.
> 12. Auditor negligence.
> 13. Price manipulation where supported by the corpus.

This list was reconstructed by locating that prompt in this session's own
prior conversation history, not guessed or re-derived from present-day test
names. Scenarios 1-7 already had named, numbered regression tests
(`tests/matching-engine.test.ts`, `describe("Mandatory scenario N: ...")`)
from earlier in this project's history. Scenarios 8-13 did not; they are
added in `tests/mandatory-scenarios-8-13.test.ts` by this pass.

**A discrepancy found during this audit and fixed separately:** the Scenario
Analyzer's 13 one-click UI templates (`EXAMPLE_SCENARIOS` in
`src/components/analyzer/ScenarioAnalyzerClient.tsx`) drifted from this list
at some point - 12 of the 13 template scenarios map cleanly onto this list,
but item 2 ("Promoter personal derivative transactions recorded as company
revenue") had been silently dropped from the template picker and replaced
with an extra, off-list template ("Non-disclosure of material information").
The underlying matching-engine test for scenario 2 was never affected (it
calls `analyzeScenario` directly, bypassing the UI template list entirely),
so this was a UI-convenience gap, not an engine defect. Fixed in this pass -
see "Changes made" in the final report.

## Audit matrix

Legend: **PASS** = automated regression test passes and expected/actual
match; **PASS (partial match, documented)** = a regression test passes, but
the curated corpus's closest available record only partially matches the
scenario's exact wording (e.g. actor granularity), explained below rather
than concealed. Every "actual result" below is the literal output of running
the cited test file, not a description of intended behavior.

---

### Scenario 1: Fictitious sales and assets disclosed through financial statements

| Field | Value |
|---|---|
| Entered facts | "Fictitious sales and assets disclosed through financial statements." |
| Actor role | `company` |
| Transaction type | `financial_statement_disclosure`, `standalone_financials` |
| Evidence indicators | `audited_financial_statements`, `forensic_audit_report`, `bank_statements_flow` |
| Expected conduct tags | `fictitious_sales_or_assets`, `financial_statement_misstatement` |
| Expected relevant provisions | SEBI Act 12A, PFUTP 3(a)-(d), 4(1), 4(2)(e)/(f)/(k)/(r); LODR 4(1), 4(2)(e)(i), 33, 48; Ind AS (various) |
| Expected supporting precedent | SSSL-01 |
| Expected contrary precedent | None required |
| Expected finding-stage treatment | SSSL-01 is a final-order "Confirmed in Final Order" finding |
| Cited-only vs outcome-determining | Not exercised by this fixture-based test (fixtures predate the `finding_provisions.relationship` field); verified separately against live data on the provision detail page (e.g. PFUTP Reg. 4(1): 18 outcome-determining vs. 32 cited-only findings, from real corpus data) |
| Actual result | `tests/matching-engine.test.ts`, "Mandatory scenario 1" - retrieves SSSL-01 |
| PASS/FAIL | **PASS** |
| Discrepancy | None |

### Scenario 2: Promoter's personal derivative transactions recorded as company revenue

| Field | Value |
|---|---|
| Entered facts | "Promoter's personal derivative transactions recorded as company revenue." |
| Actor role | `company`, `promoter` |
| Transaction type | `derivative_transaction`, `fund_transfer_personal_account`, `standalone_financials` |
| Evidence indicators | `bank_statements_flow`, `audited_financial_statements` |
| Expected conduct tags | `fictitious_sales_or_assets`, `financial_statement_misstatement` |
| Expected relevant provisions | SEBI Act 12A, PFUTP 3(a)-(d)/4(1)/4(2)(e)(f)(k)(r), LODR 4(1)/4(2)(e)(i)/33/48, Ind AS (various) |
| Expected supporting precedent | REL-04 |
| Expected contrary precedent | None required |
| Expected finding-stage treatment | REL-04 is interim-only, "Prima facie" |
| Cited-only vs outcome-determining | Not exercised by this fixture-based test; see scenario 1 |
| Actual result | `tests/matching-engine.test.ts`, "Mandatory scenario 2" - retrieves REL-04 |
| PASS/FAIL | **PASS** |
| Discrepancy | The Scenario Analyzer's one-click UI template list had silently dropped this scenario in favour of an off-list template - fixed in this pass (see Provenance above). The underlying engine test was unaffected throughout. |

### Scenario 3: Rights-issue proceeds routed through entities against unsupported purchases

| Field | Value |
|---|---|
| Entered facts | "Rights-issue proceeds routed through entities against unsupported purchases." |
| Actor role | `company` |
| Transaction type | `rights_issue`, `cash_credit_facility`, `purchase_transaction` |
| Evidence indicators | `bank_statements_flow`, `delivery_inventory_records`, `utilisation_of_issue_proceeds_certificate` |
| Expected conduct tags | `fund_diversion`, `fictitious_sales_or_assets` |
| Expected relevant provisions | SEBI Act 12A/27, PFUTP 3(a)-(d)/4(1)/4(2)(e)(f)(k)(r), LODR Audit Committee bundle, LODR 32 |
| Expected supporting precedent | SSSL-04 |
| Expected contrary precedent | None required |
| Expected finding-stage treatment | SSSL-04 is a final-order "Confirmed in Final Order" finding |
| Cited-only vs outcome-determining | Not exercised by this fixture-based test; see scenario 1 |
| Actual result | `tests/matching-engine.test.ts`, "Mandatory scenario 3" - retrieves SSSL-04 |
| PASS/FAIL | **PASS** |
| Discrepancy | None |

### Scenario 4: Preferential allotment financed through circular transactions (negative precedent)

| Field | Value |
|---|---|
| Entered facts | "Preferential allotment allegedly financed through circular transactions, but loans are recorded in audited accounts, third parties were not examined and sale proceeds remain with the allottees." |
| Actor role | `company`, `allottee_promoter`, `allottee_third_party` |
| Transaction type | `preferential_allotment`, `cash_credit_facility` |
| Evidence indicators | `bank_statements_flow`, `audited_financial_statements`, `third_party_examination_statements` |
| Expected conduct tags | `circular_fund_movement`, `unsupported_share_allotment_consideration` |
| Expected relevant provisions | SEBI Act 12A/27, PFUTP 3(a)-(d)/4(1)/4(2)(e), LODR 4(1)/4(2)(e)(i)/32/33/48 |
| Expected supporting precedent | n/a (this is the negative/contrary-precedent scenario) |
| Expected contrary precedent | SSSL-03, findingStatus "Not Confirmed in Final Order" |
| Expected finding-stage treatment | Final order overrides the interim allegation; must never read as a definitive violation conclusion; the circular fund-flow guardrail checklist must fire |
| Cited-only vs outcome-determining | Not exercised by this fixture-based test; see scenario 1 |
| Actual result | `tests/matching-engine.test.ts`, "Mandatory scenario 4" (3 tests) - retrieves SSSL-03 as contrary precedent with status "Not Confirmed in Final Order"; no forbidden definitive-violation phrase anywhere in generated text; "Circular fund-flow allegation" guardrail present |
| PASS/FAIL | **PASS** |
| Discrepancy | None |

### Scenario 5: Company funds routed through a promoter's personal bank account

| Field | Value |
|---|---|
| Entered facts | "Company funds routed through a promoter's personal bank account." |
| Actor role | `company`, `promoter` |
| Transaction type | `fund_transfer_personal_account`, `related_party_transaction` |
| Evidence indicators | `bank_statements_flow` |
| Expected conduct tags | `fund_routed_personal_account`, `financial_statement_misstatement` |
| Expected relevant provisions | SEBI Act 12A, PFUTP 3(a)-(d)/4(1)/4(2)(e)(f)(k)(r), LODR 23(2)/34, Ind AS (various) |
| Expected supporting precedent | REL-10 |
| Expected contrary precedent | None required |
| Expected finding-stage treatment | REL-10 is interim-only, "Prima facie" |
| Cited-only vs outcome-determining | Not exercised by this fixture-based test; see scenario 1 |
| Actual result | `tests/matching-engine.test.ts`, "Mandatory scenario 5" - retrieves REL-10, labelled "Prima facie" |
| PASS/FAIL | **PASS** |
| Discrepancy | None |

### Scenario 6: Audit Committee not properly constituted or meetings not conducted

| Field | Value |
|---|---|
| Entered facts | "Audit Committee not properly constituted or meetings not conducted." |
| Actor role | `company`, `audit_committee_member`, `independent_director` |
| Transaction type | `audit_committee_process` |
| Evidence indicators | `board_minutes`, `related_party_register`, `audit_committee_minutes_agendas` |
| Expected conduct tags | `audit_committee_deficiency` |
| Expected relevant provisions | SEBI Act 27, PFUTP 4(2)(f), LODR 4(1), LODR Compliance Officer, LODR Audit Committee bundle |
| Expected supporting precedent | SSSL-09 and/or SSSL-10 |
| Expected contrary precedent | None required |
| Expected finding-stage treatment | Both are final-order "Confirmed in Final Order" findings |
| Cited-only vs outcome-determining | Not exercised by this fixture-based test; see scenario 1 |
| Actual result | `tests/matching-engine.test.ts`, "Mandatory scenario 6" - retrieves SSSL-09 and/or SSSL-10 |
| PASS/FAIL | **PASS** |
| Discrepancy | None |

### Scenario 7: Vacancy or improper appointment of the Compliance Officer

| Field | Value |
|---|---|
| Entered facts | "Vacancy or improper appointment of the Compliance Officer." |
| Actor role | `company`, `compliance_officer` |
| Transaction type | `compliance_officer_appointment` |
| Evidence indicators | `board_minutes` |
| Expected conduct tags | `compliance_officer_deficiency` |
| Expected relevant provisions | SEBI Act 27, LODR Compliance Officer bundle |
| Expected supporting precedent | SSSL-11 |
| Expected contrary precedent | None required |
| Expected finding-stage treatment | SSSL-11 is a final-order "Confirmed in Final Order" finding |
| Cited-only vs outcome-determining | Not exercised by this fixture-based test; see scenario 1 |
| Actual result | `tests/matching-engine.test.ts`, "Mandatory scenario 7" - retrieves SSSL-11 |
| PASS/FAIL | **PASS** |
| Discrepancy | None |

### Scenario 8: Related-party non-disclosure

| Field | Value |
|---|---|
| Entered facts | "A related-party transaction with a counterparty connected to the promoter was not disclosed in the related-party register and was misrepresented as an arm's-length dealing." |
| Actor role | `company`, `related_party_counterparty` |
| Transaction type | `related_party_transaction`, `annual_report_disclosure` |
| Evidence indicators | `related_party_register`, `audit_committee_minutes_agendas` |
| Expected conduct tags | `related_party_misrepresentation` |
| Expected relevant provisions | Provisions carried by SSSL-08's `provisionsConsideredRaw` (related-party disclosure requirements) |
| Expected supporting precedent | SSSL-08 |
| Expected contrary precedent | None required |
| Expected finding-stage treatment | SSSL-08 is a final-order "Confirmed in Final Order" finding |
| Cited-only vs outcome-determining | Not exercised by this fixture-based test; see scenario 1 |
| Actual result | `tests/mandatory-scenarios-8-13.test.ts`, "Mandatory scenario 8" - retrieves SSSL-08 |
| PASS/FAIL | **PASS** |
| Discrepancy | None. New test added by this pass; no prior automated coverage existed for this scenario. |

### Scenario 9: False announcements

| Field | Value |
|---|---|
| Entered facts | "The company made a stock exchange announcement about an intended acquisition and projected turnover that turned out to be unsubstantiated, with no supporting documentation for the claims made in the announcement." |
| Actor role | `company` |
| Transaction type | `corporate_announcement` |
| Evidence indicators | `correspondence_summons_replies` |
| Expected conduct tags | `false_business_or_corporate_announcement` |
| Expected relevant provisions | Provisions carried by SSSL-07's `provisionsConsideredRaw` (disclosure/announcement requirements) |
| Expected supporting precedent | SSSL-07 |
| Expected contrary precedent | None required |
| Expected finding-stage treatment | SSSL-07 is a final-order "Confirmed in Final Order" finding |
| Cited-only vs outcome-determining | Not exercised by this fixture-based test; see scenario 1 |
| Actual result | `tests/mandatory-scenarios-8-13.test.ts`, "Mandatory scenario 9" - retrieves SSSL-07 |
| PASS/FAIL | **PASS** |
| Discrepancy | None. New test added by this pass. |

### Scenario 10: False CEO/CFO certification

| Field | Value |
|---|---|
| Entered facts | "The Managing Director signed the compliance certificate to the board despite being aware that the financial statements did not present a true and fair view." |
| Actor role | `managing_director` |
| Transaction type | `certification_process` |
| Evidence indicators | `board_minutes` |
| Expected conduct tags | `false_compliance_certification` |
| Expected relevant provisions | LODR Regulation 17(8)/33(2) certification provisions carried by SSSL-16's `provisionsConsideredRaw` |
| Expected supporting precedent | SSSL-16 |
| Expected contrary precedent | None required |
| Expected finding-stage treatment | SSSL-16 is a final-order "Confirmed in Final Order" finding |
| Cited-only vs outcome-determining | Not exercised by this fixture-based test; see scenario 1 |
| Actual result | `tests/mandatory-scenarios-8-13.test.ts`, "Mandatory scenario 10" - retrieves SSSL-16 |
| PASS/FAIL | **PASS** |
| Discrepancy | The curated actor role is `managing_director` (the certifying officer in this specific order), not a separately-tagged "CFO" role - the pilot corpus does not carry a distinct CFO actor tag. This is a faithful reflection of the real order (an MD-signed Regulation 17(8) certificate), not a substitution; SEBI's own certification requirement routinely names the MD/CEO and CFO jointly. |

### Scenario 11: Director non-cooperation

| Field | Value |
|---|---|
| Entered facts | "The company and its directors failed to cooperate with the investigation, giving contradictory and incomplete submissions and not producing complete information despite repeated summons." |
| Actor role | `company` (curated) |
| Transaction type | `investigation_process` |
| Evidence indicators | `correspondence_summons_replies` |
| Expected conduct tags | `non_cooperation_with_investigation` |
| Expected relevant provisions | SEBI Act investigation-cooperation provisions carried by REL-03's `provisionsConsideredRaw` |
| Expected supporting precedent | REL-03 (best available; see discrepancy) |
| Expected contrary precedent | None required |
| Expected finding-stage treatment | REL-03 is interim-only, "Prima facie" |
| Cited-only vs outcome-determining | Not exercised by this fixture-based test; see scenario 1 |
| Actual result | `tests/mandatory-scenarios-8-13.test.ts`, "Mandatory scenario 11" - retrieves REL-03 |
| PASS/FAIL | **PASS (partial match, documented)** |
| Discrepancy | The pilot fixture set's only `non_cooperation_with_investigation` record (REL-03) is curated with `actorRoles: ["company"]`, a company-level finding, not a named director specifically. This is a genuine data-completeness gap in the 3-order pilot fixture set used for fast engine tests, not an engine defect: querying the live 91-finding corpus directly (via `mcp__Supabase__execute_sql`, not added to fixtures in this pass) surfaces a real director-specific example, `ZEE-PLEDGE-02` (Zee Entertainment Enterprises Ltd., `actorRoles: ["managing_director"]`, "gave incorrect and contradictory statements on oath to the Investigating Authority"), confirming the underlying corpus and engine do support this scenario correctly once the finding is on file; the pilot fixture set used for fast, DB-independent engine tests simply predates it. |

### Scenario 12: Auditor negligence

| Field | Value |
|---|---|
| Entered facts | "The statutory auditor certified the company's financial statements for several years despite inflated sales and profits from circular transactions with connected entities that were never detected." |
| Actor role | `statutory_auditor`, `related_party_counterparty` |
| Transaction type | `purchase_transaction`, `consolidated_financials` |
| Evidence indicators | `forensic_audit_report`, `bank_statements_flow`, `audited_financial_statements` |
| Expected conduct tags | `financial_statement_misstatement`, `fictitious_sales_or_revenue`, `audit_committee_deficiency` |
| Expected relevant provisions | SEBI Act 12A(a)-(c) |
| Expected supporting precedent | ARL-AUD-01 (Arvind Remedies Limited) |
| Expected contrary precedent | None required |
| Expected finding-stage treatment | Final-order "Not Confirmed in Final Order" - gross negligence was found established, but the PFUTP fraud charge against the auditor specifically was not sustained for want of proof of connivance/collusion; the engine must present this exact status, never upgrade it |
| Cited-only vs outcome-determining | Not exercised (added fixture predates `relationship`); the real live record's provision links are `alleged`-relationship only in the live database (the auditor's PFUTP liability was the disposition and was NOT confirmed), consistent with the curated finding status |
| Actual result | `tests/mandatory-scenarios-8-13.test.ts`, "Mandatory scenario 12" (2 tests) - retrieves ARL-AUD-01; finding status is presented as "Not Confirmed in Final Order", not upgraded |
| PASS/FAIL | **PASS** |
| Discrepancy | The pilot fixture set (Rajesh Exports + Seacoast only) has no statutory-auditor-actor record at all, so this scenario had zero test coverage before this pass and could not be tested against the existing fast fixtures. `tests/fixtures-extended.ts` adds one additional record, `ARL-AUD-01`, hand-transcribed faithfully from the live database (not invented), specifically to close this gap. This is the one scenario in this audit that required extending the fixture set rather than reusing what already existed. |

### Scenario 13: Price manipulation where supported by the corpus

| Field | Value |
|---|---|
| Entered facts | "The misleading financial picture created by the misstatements distorted price discovery and induced investors to trade at prices not reflective of the company's true position." |
| Actor role | `company` |
| Transaction type | `financial_statement_disclosure` |
| Evidence indicators | `audited_financial_statements` |
| Expected conduct tags | `price_manipulation_nexus`, `financial_statement_misstatement` |
| Expected relevant provisions | SEBI Act 12A, PFUTP 3(a)-(d)/4(1)/4(2)(e)(f)(k)(r) |
| Expected supporting precedent | At least one of REL-12, REL-02, REL-04, SSSL-01 (see discrepancy) |
| Expected contrary precedent | None required |
| Expected finding-stage treatment | Mixed (SSSL-01 final/Confirmed; REL-02, REL-04, REL-12 interim/Prima facie) - each finding's own status must be presented as-is |
| Cited-only vs outcome-determining | Not exercised by this fixture-based test; see scenario 1 |
| Actual result | `tests/mandatory-scenarios-8-13.test.ts`, "Mandatory scenario 13" - retrieves at least one of the four; empirically SSSL-01, REL-02 and REL-04 are returned, REL-12 is not |
| PASS/FAIL | **PASS (partial match, documented)** |
| Discrepancy | REL-12, REL-02, REL-04 and SSSL-01 all carry the identical `allegedConduct` pairing this scenario's facts detect (`price_manipulation_nexus` + `financial_statement_misstatement`), so all four score-tie. `engine.ts`'s per-provision cap (`supporting.slice(0, 3)`) then keeps only three: SSSL-01 wins outright on its final-order confidence multiplier; REL-02 and REL-04 win the remaining two slots over REL-12 purely on fixture array order (JavaScript's stable sort preserves original relative order among exact score ties - there is no explicit secondary tiebreak, e.g. by record id, in the engine). This is a genuine, minor, low-priority engine property worth knowing about - an officer querying a topic where more than 3 precedents tie exactly could have one silently excluded from a specific provision's "top 3" - but it is not a correctness defect: no false information is shown, nothing is mislabelled, and 3 genuinely on-topic precedents (one of them final-order and Confirmed) are still surfaced. See "Known remaining weaknesses" in the final report. |

## Summary

| # | Scenario | Result |
|---|---|---|
| 1 | Fictitious sales/assets | PASS |
| 2 | Promoter derivative transactions as revenue | PASS |
| 3 | Rights-issue proceeds routed through entities | PASS |
| 4 | Preferential allotment / circular funding (negative) | PASS |
| 5 | Funds via personal account | PASS |
| 6 | Audit Committee lapse | PASS |
| 7 | Compliance Officer vacancy | PASS |
| 8 | Related-party non-disclosure | PASS |
| 9 | False announcements | PASS |
| 10 | False CEO/CFO certification | PASS (documented actor-role note) |
| 11 | Director non-cooperation | PASS (partial match, documented) |
| 12 | Auditor negligence | PASS (fixture extended) |
| 13 | Price manipulation | PASS (partial match, documented) |

13 of 13 scenarios pass. Three carry an explicit, disclosed limitation in the
curated pilot-fixture data or the top-3 tie-break behaviour rather than a
silent gap; none was concealed or forced to pass by weakening a test.
