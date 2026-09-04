-- Matter/Order data-model correction (per the CFID officer's explicit
-- data-model and workflow correction). This migration:
--   1. Introduces a `matters` table, distinct from `orders`, populated only
--      from relationships already known and recorded in order_relationships
--      — never a new, invented grouping.
--   2. Adds `cfid_verification_basis` — a controlled-vocabulary field
--      recording *how* CFID origin was established, because an order
--      (especially an adjudication order) can lack "CFID" in its own order
--      number yet still arise from a CFID investigation. Backfilled for the
--      89 existing orders from the fact already true of them (their order
--      identifier does contain a "CFID" tag — that is literally how
--      cfid_verified was set) — this is not a reclassification.
--   3. Adds `official_order_title` (exact, as it appears on the official
--      document — left NULL until actually captured; never backfilled from
--      case_name, which is a matter-level label, not the order's own exact
--      title) and `normalized_matter_name` (backfilled from the existing
--      case_name, which already served this grouping purpose).
--   4. Expands order_relationships' relationship_type vocabulary. The
--      existing 5 values are kept as-is (including the one already-recorded
--      Seacoast interim_to_final row) — nothing is renamed or reclassified.
--   5. Adds six independent review-flag columns to scenario_findings, so a
--      finding is never described as "verified" merely because it was
--      script-generated. Backfilled to true only for the 34 pilot findings
--      that were already characterized as legally_reviewed (i.e. this
--      records an already-established fact, not a new claim); every future
--      finding defaults to all-false ("needs manual review").

-- ---------------------------------------------------------------------------
-- matters: groups orders that are already known, via order_relationships, to
-- concern the same matter/investigation. Never auto-derived from company
-- name or matter-name similarity alone.
-- ---------------------------------------------------------------------------
create table matters (
  id uuid primary key default gen_random_uuid(),
  normalized_matter_name text not null unique,
  description text,
  created_at timestamptz not null default now()
);

alter table orders add column matter_id uuid references matters(id) on delete set null;
create index orders_matter_idx on orders (matter_id);

alter table orders add column official_order_title text; -- exact, from the document itself; never backfilled/corrected
alter table orders add column normalized_matter_name text;
update orders set normalized_matter_name = case_name where normalized_matter_name is null;

-- ---------------------------------------------------------------------------
-- cfid_verification_basis
-- ---------------------------------------------------------------------------
create type cfid_verification_basis_type as enum (
  'cfid_tag_in_order_number',
  'cfid_origin_established_from_official_order',
  'related_to_verified_cfid_parent_matter',
  'confirmed_by_authorised_cfid_officer',
  'needs_manual_verification',
  'not_cfid'
);

alter table orders add column cfid_verification_basis cfid_verification_basis_type
  not null default 'needs_manual_verification';

-- Records the fact already true of every existing row: cfid_verified was
-- set by matching "CFID" in the order's own identifier/order number.
update orders set cfid_verification_basis = 'cfid_tag_in_order_number'
  where cfid_verified = true;

-- ---------------------------------------------------------------------------
-- Seed the one matter already established by an existing, verified
-- order_relationships row (Seacoast interim -> final). No other grouping is
-- invented here.
-- ---------------------------------------------------------------------------
do $$
declare
  m_id uuid;
  interim_id uuid;
  final_id uuid;
begin
  select from_order_id, to_order_id into interim_id, final_id
  from order_relationships
  where relationship_type = 'interim_to_final'
  limit 1;

  if interim_id is not null and final_id is not null then
    insert into matters (normalized_matter_name, description)
    select o.normalized_matter_name, 'Grouped from an existing order_relationships (interim_to_final) row.'
    from orders o where o.id = final_id
    on conflict (normalized_matter_name) do update set description = excluded.description
    returning id into m_id;

    update orders set matter_id = m_id where id in (interim_id, final_id);
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Expand order_relationships relationship-type vocabulary. Existing values
-- are kept — this is additive only, so no existing row is reclassified.
-- ---------------------------------------------------------------------------
alter type order_relationship_type add value if not exists 'same_matter';
alter type order_relationship_type add value if not exists 'precedes';
alter type order_relationship_type add value if not exists 'confirms';
alter type order_relationship_type add value if not exists 'modifies';
alter type order_relationship_type add value if not exists 'revokes';
alter type order_relationship_type add value if not exists 'finalises';
alter type order_relationship_type add value if not exists 'adjudication_arising_from';
alter type order_relationship_type add value if not exists 'same_investigation';
alter type order_relationship_type add value if not exists 'different_noticee_group';

-- ---------------------------------------------------------------------------
-- Per-finding review flags: each is independently tracked and independently
-- true/false — a finding is never "verified" merely because it was parsed
-- from a workbook by a script.
-- ---------------------------------------------------------------------------
alter table scenario_findings add column source_document_verified boolean not null default false;
alter table scenario_findings add column paragraph_citation_verified boolean not null default false;
alter table scenario_findings add column finding_status_verified boolean not null default false;
alter table scenario_findings add column provision_mapping_verified boolean not null default false;
alter table scenario_findings add column noticee_mapping_verified boolean not null default false;
alter table scenario_findings add column human_legal_review_completed boolean not null default false;

-- Records the fact already true of the 34 pilot findings: they come from
-- the human-curated CFID_Precedent_Library_Pilot.xlsx and their parent
-- order's processing_stage is already legally_reviewed. This is not a new
-- claim — it is the existing legally_reviewed characterization, now
-- expressed as independent flags instead of one coarse stage value.
update scenario_findings sf
set source_document_verified = true,
    paragraph_citation_verified = true,
    finding_status_verified = true,
    provision_mapping_verified = true,
    noticee_mapping_verified = true,
    human_legal_review_completed = true
from orders o
where o.id = sf.order_id and o.processing_stage = 'legally_reviewed';

alter table matters enable row level security;
create policy matters_select_allowed_user on matters
  for select using (is_allowed_user());
