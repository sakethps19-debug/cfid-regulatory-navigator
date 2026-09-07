# Audit: `finding_provisions.relationship`

## Why this audit

The Provision Detail page and the Legal Review Queue both display a
per-provision "cited/considered" vs. "basis of the finding's outcome"
distinction, drawn from `finding_provisions.relationship`
(`alleged` | `applied` | `upheld` | `not_upheld`). This audit checks
whether that field actually supports the interpretation the UI puts on it,
rather than assuming it does.

## Live counts (re-queried at the time of this audit)

```sql
select relationship, count(*) from finding_provisions group by relationship order by 2 desc;
```

| relationship | count |
|---|---|
| alleged | 806 |
| upheld | 58 |
| not_upheld | 7 |
| applied | 0 |
| **total** | **871** |

`applied` is a valid value under the column's own CHECK constraint
(`supabase/migrations/0001_schema.sql`) but has never actually been used.

## How the column's value is set

`scripts/db/build-import-sql.ts`, `provisionRelationshipForFinding()`:

```ts
function provisionRelationshipForFinding(status: FindingStatus): string {
  switch (status) {
    case "Confirmed in Final Order":
    case "Partly Confirmed in Final Order":
      return "upheld";
    case "Not Confirmed in Final Order":
      return "not_upheld";
    case "Prima facie":
    case "Alleged":
    default:
      return "alleged";
  }
}
```

This is the ONLY committed logic that writes this column, and it derives
the value mechanically from the FINDING's overall `finding_status` —
broadcasting the same relationship value to every provision the finding
cites. Taken alone, this would NOT support a claim that any specific
provision was individually "the basis of the outcome": it would just be
the finding's own status, repeated once per provision.

## But the live data does not match a pure mechanical broadcast

```sql
select sf.finding_status, fp.relationship, count(*)
from finding_provisions fp join scenario_findings sf on sf.id = fp.finding_id
group by 1,2;
```

| finding_status | relationship | count | matches mechanical derivation? |
|---|---|---|---|
| alleged | alleged | 41 | yes |
| prima_facie | alleged | 105 | yes |
| confirmed_at_interim | alleged | 51 | yes |
| confirmed_at_interim | **upheld** | **19** | **no** |
| upheld | **alleged** | **431** | **no** |
| upheld | upheld | 34 | yes |
| partly_upheld | **alleged** | **115** | **no** |
| partly_upheld | **not_upheld** | **1** | **no** |
| partly_upheld | upheld | 5 | yes |
| not_upheld | **alleged** | **59** | **no** |
| not_upheld | not_upheld | 6 | yes |
| inconclusive | alleged | 4 | yes |

**625 of 871 rows (72%) deviate from what the mechanical import-time
derivation alone would produce.** If the column were never touched after
import, every row for a given finding would carry the same relationship
value (whatever that finding's overall status mechanically maps to) —
instead, individual findings show a genuine mix. Example:

```sql
select sf.record_id, count(*) total,
  count(*) filter (where fp.relationship='upheld') n_upheld,
  count(*) filter (where fp.relationship='alleged') n_alleged
from finding_provisions fp join scenario_findings sf on sf.id=fp.finding_id
where sf.finding_status='upheld'
group by sf.id, sf.record_id
having count(*) filter (where fp.relationship='upheld') > 0
   and count(*) filter (where fp.relationship='alleged') > 0;
```

`SSSL-01` (overall status "Confirmed in Final Order") cites 26 provisions;
only 2 are marked `upheld`, the other 24 `alleged`. `FCEL-01` cites 22
provisions; only 4 are `upheld`. A pure mechanical broadcast would mark
all 26 (or all 22) `upheld`, since the finding's own overall status is
"upheld" — it does not. This pattern is consistent across every
multi-provision "upheld"/"partly_upheld" finding checked, and is strong
evidence of genuine, deliberate per-provision analysis at some point after
import, not a leftover mechanical default.

## The gap: no recorded provenance for that curation

```sql
select table_name, field_name, count(*) from data_change_log group by 1,2;
```

`data_change_log` (the project's own audit trail for exactly this kind of
correction) has **zero** entries for `finding_provisions.relationship`.
No migration file contains an `UPDATE` against this column either. The
625 deviating rows were evidently set through direct, ad hoc database
writes in an earlier working session, without being logged through the
change-log mechanism the project otherwise uses for curated corrections.
This is a real process gap, independent of whether the curation itself
was accurate.

## Conclusion and what changed

The data is **not** merely a copy-and-paste of the finding's own status —
genuine per-provision work exists for the large majority of resolved
findings. But:

1. There is no recorded methodology or reviewer attribution for that
   work, and no `human_legal_review_completed = true` finding exists yet
   (0 of 91) to independently corroborate it.
2. The field, as a single 3-valued column, still conflates two concepts
   the review correctly distinguishes: the provision's **role** in the
   finding's reasoning (cited vs. basis-of-disposition) and the
   finding's own **disposition** (which stage, confirmed or not). A
   finding at ANY procedural stage — including `confirmed_at_interim` —
   can carry `relationship = 'upheld'` for one of its provisions (19 such
   rows exist); reading `upheld` as "this was confirmed in a FINAL order"
   would misstate the record for those 19.

Given genuine curation clearly exists, a schema migration splitting the
column was judged **not warranted by this audit** — it would restructure
information already present, not add missing information, and 871 live
rows would need re-classifying by hand regardless of the column shape.
Instead, every place this field is displayed
(`src/app/(app)/provisions/[id]/page.tsx`,
`src/components/FindingsByStatus.tsx`,
`src/components/LegalReviewQueueClient.tsx`, and the field's own doc
comment in `src/types/domain.ts`) was reworded to:

- call it a **recorded** / **curated data-entry classification**, never
  an established fact;
- point explicitly to the finding's own human-legal-review status;
- never imply a final order specifically — a finding carrying `upheld`
  can be at any procedural stage, always shown separately via its own
  status badge.

## Categorisation requested by this audit

| Category | Count | Basis |
|---|---|---|
| Cited / considered only (role) | 806 | `relationship = 'alleged'` |
| Recorded as basis of disposition (role) | 65 | `relationship in ('upheld','not_upheld')` |
| Unknown / not yet curated (role) | 0 | no rows outside the three values above |
| — of which disposition = final-order confirmed | 39 | `relationship='upheld'` and `finding_status in ('upheld','partly_upheld')` |
| — of which disposition = interim-confirmed only | 19 | `relationship='upheld'` and `finding_status='confirmed_at_interim'` |
| — of which disposition = not confirmed | 7 | `relationship='not_upheld'` |

**Recommendation for future curation work:** any further direct edits to
`finding_provisions.relationship` should be logged to `data_change_log`
(table_name `finding_provisions`, field_name `relationship`) the same way
every other curated correction in this project is, so a reviewer can see
what changed, when, and (via the `reason` column) why.
