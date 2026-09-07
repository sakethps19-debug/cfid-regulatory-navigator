-- Per-provision tag attribution: a finding-provision link can now record
-- WHICH of the finding's own conduct/transaction/actor/evidence tags
-- specifically justify that link, instead of the flat, undifferentiated
-- provisionIds list every provision the finding cites getting surfaced for
-- ANY of the finding's tags. This is what makes the previous
-- NARROW_SCOPE_PROVISION_TAGS hard-coded map (src/data/curated/concept-tags.ts)
-- a general, data-driven mechanism instead of a fixed list a developer has
-- to remember to update.
alter table finding_provisions
  add column justifying_tags text[] not null default '{}';

comment on column finding_provisions.justifying_tags is
  'Concept-tag ids (see src/data/curated/concept-tags.ts) that specifically justify this finding-provision link. Empty array (the default) means the provision is universally linked whenever ANY of the finding''s own conduct/transaction/actor/evidence tags match the query -- current behavior, no regression. A non-empty array narrows the link: it only applies when the query''s detected concepts intersect this set. Used for topically narrow provisions (e.g. LODR Regulation 6, Compliance Officer duties) that get bundled into a multi-issue finding record alongside unrelated, more serious allegations.';

-- Populate the narrow, topically-scoped provisions that were previously
-- hard-coded in NARROW_SCOPE_PROVISION_TAGS -- every link to these
-- provisions across the whole corpus, not just the handful of findings a
-- prior investigation happened to check.
update finding_provisions fp
set justifying_tags = array['compliance_officer_deficiency']
from legal_provisions lp
where fp.provision_id = lp.id
  and lp.canonical_id in ('LODR-6-gen','LODR-6-1','LODR-6-2-gen','LODR-6-2-a','LODR-6-2-b','LODR-6-2-c');

update finding_provisions fp
set justifying_tags = array['false_compliance_certification']
from legal_provisions lp
where fp.provision_id = lp.id
  and lp.canonical_id = 'LODR-17-8';

update finding_provisions fp
set justifying_tags = array['audit_committee_deficiency']
from legal_provisions lp
where fp.provision_id = lp.id
  and lp.canonical_id in ('LODR-18-1-b','LODR-18-1-d','LODR-18-3-schedule-II');
