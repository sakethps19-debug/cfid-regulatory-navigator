# CFID Regulatory Navigator — Data Validation Report

Generated: 2026-09-04T05:01:03.836Z

This report is produced by `npm run validate:data` from the JSON generated
by `npm run import:data` out of `CFID_Precedent_Library_Pilot.xlsx`,
`Verified_CFID_Order_Links.xlsx` (authoritative CFID order list) and
`Residual_Order_Links.xlsx` (exclusion / pending-link register only). The
original `Links.xlsx` compilation is no longer used. None of the source
workbooks are modified by either script.

## Summary

| Metric | Count |
| --- | --- |
| Imported orders (deep scenario-finding analysis) | 3 |
| Scenario findings | 34 |
| Verified CFID order rows (Verified_CFID_Order_Links.xlsx) | 89 |
| Verified cases awaiting detailed scenario analysis | 86 |
| Residual — awaiting link from user | 23 |
| Residual — duplicate of a verified order | 11 |
| Residual — confirmed not a CFID order | 3 |
| Invalid or missing URLs | 0 |
| Missing paragraph references | 0 |
| Unknown provisions | 0 |
| Duplicate records | 0 |
| Conflicting findings | 0 |
| Rows requiring manual review | 109 |

## Invalid or missing URLs
None.

## Missing paragraph references
None.

## Unknown provisions
None — every Provision Index row maps to a curated id/pattern.

## Duplicate records
None — the import script also throws on duplicate scenario-finding Record IDs, so this list will always be empty for a successful import.

## Conflicting findings
None — no two findings share a case + scenario title with different statuses.

## Rows requiring manual review
109 row(s) require manual review before any admission to the deep-analyzed precedent library:
- 86 verified CFID order(s) confirmed genuine but not yet turned into scenario findings.
- 23 residual entr(y/ies) still awaiting a link from the user.

11 residual row(s) are duplicates of an order already counted once in the verified list (informational only, not a review item). 3 residual row(s) were confirmed **not** CFID orders and are excluded from precedent use.

No row has been deleted. See the "Orders Awaiting Analysis" page in the application for the full register.
