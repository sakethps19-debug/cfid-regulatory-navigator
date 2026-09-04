# CFID Regulatory Navigator — Data Validation Report

Generated: 2026-09-04T04:24:37.326Z

This report is produced by `npm run validate:data` from the JSON generated
by `npm run import:data` out of `CFID_Precedent_Library_Pilot.xlsx` and
`Links.xlsx`. Neither source workbook is modified by either script.

## Summary

| Metric | Count |
| --- | --- |
| Imported orders | 3 |
| Scenario findings | 34 |
| Invalid or missing URLs | 0 |
| Missing paragraph references | 0 |
| Unknown provisions | 0 |
| Duplicate records | 0 |
| Conflicting findings | 0 |
| Orders-Awaiting-Analysis rows requiring manual review | 83 |
| Non-CFID / unverified orders (Links.xlsx, has link but unverified) | 59 |
| Rows marked "No order" | 24 |

## Invalid or missing URLs
None.

## Missing paragraph references
None.

## Unknown provisions
None — every Provision Index row maps to a curated id/pattern.

## Duplicate records
None — the import script also throws on duplicate Record IDs, so this list will always be empty for a successful import.

## Conflicting findings
None — no two findings share a case + scenario title with different statuses.

## Orders Awaiting Analysis — rows requiring manual review
83 of 85 rows in Links.xlsx are flagged for manual review before any admission to the precedent library:
- 59 row(s) have at least one order link but the order number has not yet been verified to contain "CFID".
- 24 row(s) are marked "No order"/"No CFID Order" or have no link at all.

No row has been deleted. See the "Orders Awaiting Analysis" page in the application for the full register.
