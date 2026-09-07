-- One-time backfill of data_change_log entries for the curated-data
-- corrections already applied this session before the change log itself
-- existed: SSSL-02's conduct/transaction-type correction, the 8 further
-- mistagged findings found by the corpus-wide conduct-tag audit, and the
-- fictitious_sales_or_assets tag split across 27 findings.
insert into data_change_log (table_name, record_ref, field_name, old_value, new_value, reason, changed_by) values
('scenario_findings', 'SSSL-02', 'alleged_conduct', '["fictitious_sales_or_assets","sham_preferential_allotment","fund_diversion"]', '["sham_preferential_allotment"]', 'User correctly identified this finding as purely a sham preferential allotment: no fictitious sale (no revenue transaction at all) and no fund diversion (no cash moved either way, per Manish Shah''s own deposition).', 'claude'),
('scenario_findings', 'SSSL-02', 'transaction_types', '[]', '["preferential_allotment"]', 'Was empty despite the finding being squarely about a preferential allotment; restored to match sibling finding SSSL-03.', 'claude'),
('scenario_findings', 'LSIL-01', 'alleged_conduct', '["price_manipulation_nexus","circular_fund_movement","fictitious_sales_or_assets"]', '["price_manipulation_nexus","false_business_or_corporate_announcement"]', 'Corpus-wide conduct-tag audit: pure pump-and-dump plus a fabricated pivot announcement, no fictitious sale or circular fund movement anywhere in the facts.', 'claude'),
('scenario_findings', 'ROHL-01', 'alleged_conduct', '["financial_statement_misstatement","fictitious_sales_or_assets","price_manipulation_nexus"]', '["financial_statement_misstatement","price_manipulation_nexus"]', 'Corpus-wide conduct-tag audit: pure associate-vs-subsidiary consolidation dispute, no fabricated sale or asset alleged.', 'claude'),
('scenario_findings', 'FRL-01', 'alleged_conduct', '["non_disclosure_of_information","fund_diversion"]', '["non_disclosure_of_information"]', 'Corpus-wide conduct-tag audit: the order''s own text says "core fraud and diversion charges not established" -- only disclosure lapses were confirmed.', 'claude'),
('scenario_findings', 'BHSL-PROC-01', 'alleged_conduct', '["fund_diversion","related_party_misrepresentation"]', '[]', 'Corpus-wide conduct-tag audit: finding_status is "procedural_observation" -- the finding is entirely a jurisdictional/limitation ruling, no merits determination was made on the underlying conduct.', 'claude'),
('scenario_findings', 'ZEE-PLEDGE-01', 'alleged_conduct', '["related_party_misrepresentation","fund_diversion","non_disclosure_of_information","false_business_or_corporate_announcement"]', '["related_party_misrepresentation","non_disclosure_of_information","false_business_or_corporate_announcement","false_compliance_certification"]', 'Corpus-wide conduct-tag audit: unauthorized land pledge as third-party loan security with a false approvals declaration -- no company funds moved, so fund_diversion removed; false_compliance_certification added for the false declaration.', 'claude'),
('scenario_findings', 'BGL-AC-02', 'alleged_conduct', '["fictitious_sales_or_assets","financial_statement_misstatement","false_compliance_certification"]', '["financial_statement_misstatement","false_compliance_certification"]', 'Corpus-wide conduct-tag audit: profits were inflated because inadequate books made an impairment figure unverifiable -- the order never asserts a specific asset was fabricated.', 'claude'),
('scenario_findings', 'NAGL-01', 'alleged_conduct', '["fund_diversion","fictitious_sales_or_assets","false_business_or_corporate_announcement"]', '["fund_diversion","false_business_or_corporate_announcement"]', 'Corpus-wide conduct-tag audit: non-existent shell vendors were used purely as a fund-diversion conduit, no separate fictitious sale/purchase booking independently alleged.', 'claude'),
('scenario_findings', 'BGDL-02', 'alleged_conduct', '["fictitious_sales_or_assets"]', '[]', 'Corpus-wide conduct-tag audit: purely a restraint-revocation order describing no conduct at all.', 'claude');

with classification(record_id, category) as (
  values
    ('ARCOTECH-01','sales'), ('ARL-AUD-01','sales'), ('ASERL-WOAL-01','sales'), ('BDMCL-01','sales'),
    ('CITL-01','sales'), ('MBL-01','sales'), ('MFL-01','sales'), ('MGEL-01','sales'), ('OMAXE-01','sales'),
    ('REL-01','sales'), ('SHARON-01','sales'), ('SSSL-04','sales'), ('VCL-01','sales'),
    ('DHFL-02','assets'), ('EROS-01','assets'), ('FCEL-01','assets'), ('REL-04','assets'),
    ('BGDL-01','both'), ('FEEL-01','both'), ('KWALITY-01','both'), ('RICOH-01','both'), ('SANWARIA-01','both'),
    ('SETUB-01','both'), ('SICL-01','both'), ('SKT-01','both'), ('SSSL-01','both'), ('TTL-01','both')
),
old_values as (
  select
    sf.record_id,
    c.category,
    sf.alleged_conduct as new_value,
    case
      when c.category = 'sales' then array_replace(sf.alleged_conduct, 'fictitious_sales_or_revenue', 'fictitious_sales_or_assets')
      when c.category = 'assets' then array_replace(sf.alleged_conduct, 'fictitious_or_nongenuine_assets', 'fictitious_sales_or_assets')
      else array_remove(array_replace(sf.alleged_conduct, 'fictitious_sales_or_revenue', 'fictitious_sales_or_assets'), 'fictitious_or_nongenuine_assets')
    end as old_value
  from scenario_findings sf
  join classification c on c.record_id = sf.record_id
)
insert into data_change_log (table_name, record_ref, field_name, old_value, new_value, reason, changed_by)
select
  'scenario_findings',
  record_id,
  'alleged_conduct',
  to_jsonb(old_value)::text,
  to_jsonb(new_value)::text,
  case category
    when 'sales' then 'fictitious_sales_or_assets split into two tags: this finding''s fact pattern is sales/revenue fabrication only.'
    when 'assets' then 'fictitious_sales_or_assets split into two tags: this finding''s fact pattern is asset fabrication only, no sales/revenue transaction.'
    else 'fictitious_sales_or_assets split into two tags: this finding independently alleges both fictitious sales/revenue and fictitious assets.'
  end,
  'claude'
from old_values;
