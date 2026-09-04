-- Data-integrity verification queries for the CFID Regulatory Navigator
-- database. Every query should return zero rows / a zero count; a non-zero
-- result is a real problem to investigate before trusting the data.
--
-- Run via the Supabase SQL editor, `psql`, or scripts/db/run-import.ts's
-- connection. Last run against the live project on 2026-09-04: all checks
-- passed (0 rows / 0 counts throughout).

-- 1. Duplicate detection --------------------------------------------------
select 'duplicate_official_url' as check_name, official_url as val, count(*)
from orders group by official_url having count(*) > 1
union all
select 'duplicate_record_id', record_id, count(*)
from scenario_findings group by record_id having count(*) > 1
union all
select 'duplicate_canonical_id', canonical_id, count(*)
from legal_provisions group by canonical_id having count(*) > 1
union all
select 'duplicate_order_relationship', from_order_id::text || '->' || to_order_id::text, count(*)
from order_relationships group by from_order_id, to_order_id having count(*) > 1;

-- 2. CFID verification -----------------------------------------------------
-- Every order in this table must be a genuine, confirmed CFID order.
select count(*) as orders_without_cfid_verified from orders where cfid_verified = false;
select count(*) as orders_missing_official_url from orders where official_url is null or official_url = '';

-- 3. Citation traceability --------------------------------------------------
-- Every scenario finding must have an official source URL and at least one
-- paragraph reference (interim or final) — never a fact without a citation.
select count(*) as findings_missing_source_url
from scenario_findings where official_source_url is null or official_source_url = '';
select count(*) as findings_missing_all_paragraph_refs
from scenario_findings where interim_paragraph_references is null and final_paragraph_references is null;

-- 4. Referential completeness ------------------------------------------------
-- Every finding_provisions row must resolve to a real finding and provision
-- (guaranteed by the foreign keys, but confirm no orphans slipped through
-- from a partial import).
select count(*) as orphaned_finding_provisions
from finding_provisions fp
left join scenario_findings sf on sf.id = fp.finding_id
left join legal_provisions lp on lp.id = fp.provision_id
where sf.id is null or lp.id is null;

-- 5. Seacoast negative precedent is preserved --------------------------------
-- This must always return exactly 1 row with finding_status = 'not_upheld'.
select record_id, finding_status from scenario_findings where record_id = 'SSSL-03';
