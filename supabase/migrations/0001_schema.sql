-- CFID Regulatory Navigator — core schema
-- 14 tables per the pilot's data-integrity and processing-stage requirements.
-- Every table is RLS-protected in 0002_rls.sql. Writes happen only through
-- server-side scripts using the service-role key (never the browser); reads
-- happen through the anon key, gated entirely by RLS.

create extension if not exists pgcrypto;
create extension if not exists pg_trgm;

-- ---------------------------------------------------------------------------
-- orders: one row per verified CFID order document (89 from
-- Verified_CFID_Order_Links.xlsx once fully imported).
-- ---------------------------------------------------------------------------
create type order_type as enum (
  'interim_order',
  'interim_cum_show_cause_notice',
  'confirmatory_order',
  'revocation_order',
  'final_order',
  'adjudication_order',
  'settlement_order',
  'other'
);

create type processing_stage as enum (
  'indexed',
  'downloaded',
  'text_extracted',
  'scenario_findings_extracted',
  'legally_reviewed',
  'needs_manual_review',
  'retrieval_failed'
);

create table orders (
  id uuid primary key default gen_random_uuid(),
  case_name text not null,
  listed_entity text,
  order_type order_type not null default 'other',
  order_type_source text not null default 'unspecified'
    check (order_type_source in ('official_url_slug', 'document_confirmed', 'unspecified')),
  order_date date,
  order_period_hint text, -- month/year folder parsed from the official URL, e.g. "Sep-2024"; NOT a substitute for the exact date
  order_number text, -- exact order number; only populated once confirmed from the workbook or the document itself
  passing_authority text,
  official_url text not null,
  cfid_verified boolean not null default false,
  cfid_verification_source text not null default 'unverified'
    check (cfid_verification_source in ('verified_workbook', 'document_confirmed', 'unverified')),
  investigation_period text,
  relevant_financial_years text,
  background_chronology text,
  scope_note text,
  processing_stage processing_stage not null default 'indexed',
  retrieval_status text not null default 'not_attempted'
    check (retrieval_status in ('not_attempted', 'success', 'failed')),
  retrieval_failure_reason text,
  source_row_ref text, -- traceability back to the Verified_CFID_Order_Links.xlsx row
  checksum text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (official_url)
);
create index orders_case_name_trgm_idx on orders using gin (case_name gin_trgm_ops);
create index orders_processing_stage_idx on orders (processing_stage);

-- ---------------------------------------------------------------------------
-- order_relationships: interim/final/confirmatory/revocation/corrigendum
-- links between orders in the same matter. Only populated where confidently
-- known — never inferred from unread documents.
-- ---------------------------------------------------------------------------
create type order_relationship_type as enum (
  'interim_to_final',
  'interim_to_confirmatory',
  'confirmatory_to_revocation',
  'corrigendum_to',
  'related_matter'
);

create table order_relationships (
  id uuid primary key default gen_random_uuid(),
  from_order_id uuid not null references orders(id) on delete cascade,
  to_order_id uuid not null references orders(id) on delete cascade,
  relationship_type order_relationship_type not null,
  note text,
  created_at timestamptz not null default now(),
  unique (from_order_id, to_order_id, relationship_type)
);

-- ---------------------------------------------------------------------------
-- noticees / order_noticees
-- ---------------------------------------------------------------------------
create table noticees (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  entity_type text check (entity_type in ('company', 'individual', 'huf', 'other')),
  created_at timestamptz not null default now(),
  unique (full_name)
);

create table order_noticees (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  noticee_id uuid not null references noticees(id) on delete cascade,
  noticee_number text, -- e.g. "Noticee 2" as used in the order
  role text, -- promoter / managing director / independent director / compliance officer / company / allottee / other
  outcome_status text,
  created_at timestamptz not null default now(),
  unique (order_id, noticee_id)
);

-- ---------------------------------------------------------------------------
-- legal_instruments / legal_provisions / provision_versions
-- ---------------------------------------------------------------------------
create table legal_instruments (
  id uuid primary key default gen_random_uuid(),
  name text not null unique, -- e.g. "PFUTP Regulations, 2003"
  issuing_authority text not null, -- SEBI / MCA / ICAI (Ind AS)
  official_source_url text,
  created_at timestamptz not null default now()
);

create table legal_provisions (
  id uuid primary key default gen_random_uuid(),
  canonical_id text not null unique, -- instrument + regulation/section + sub-clause, e.g. "PFUTP-4-2-e"
  instrument_id uuid not null references legal_instruments(id) on delete restrict,
  provision_number text not null, -- e.g. "Regulation 4(2)(e)"
  subject text,
  current_text_verification_status text not null default 'requires_verification'
    check (current_text_verification_status in ('requires_verification', 'order_cited_text_only', 'officially_verified')),
  official_source_url text,
  law_library_note text,
  related_provision_canonical_ids text[] not null default '{}',
  created_at timestamptz not null default now()
);
create index legal_provisions_instrument_idx on legal_provisions (instrument_id);

create table provision_versions (
  id uuid primary key default gen_random_uuid(),
  provision_id uuid not null references legal_provisions(id) on delete cascade,
  version_label text not null, -- e.g. "Current text (unverified)"
  effective_from date,
  effective_to date,
  exact_text text, -- only populated when actually sourced from an official document; never fabricated
  status text not null default 'requires_verification'
    check (status in ('requires_verification', 'order_cited_text_only', 'officially_verified')),
  source_url text,
  date_last_verified date,
  created_at timestamptz not null default now()
);
create index provision_versions_provision_idx on provision_versions (provision_id);

-- ---------------------------------------------------------------------------
-- legal_tests: reasoning/guardrail patterns (e.g. circular fund-flow test)
-- ---------------------------------------------------------------------------
create table legal_tests (
  id uuid primary key default gen_random_uuid(),
  provision_or_issue text not null,
  working_principle text not null,
  paragraph_anchors text,
  implementation_guardrail text not null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- scenario_findings: individual allegation/scenario-level records
-- ---------------------------------------------------------------------------
create type finding_status as enum (
  'alleged',
  'prima_facie',
  'confirmed_at_interim',
  'upheld',
  'partly_upheld',
  'not_upheld',
  'withdrawn',
  'inconclusive',
  'procedural_observation'
);

create table scenario_findings (
  id uuid primary key default gen_random_uuid(),
  record_id text not null unique, -- e.g. "REL-01", "SSSL-03"
  order_id uuid references orders(id) on delete set null,
  final_order_id uuid references orders(id) on delete set null, -- set when a related final order exists
  case_name text not null,
  category text,
  scenario_title text not null,
  factual_pattern text not null,
  allegation_text text,
  provisions_considered_raw text,
  noticee_actor_names text[] not null default '{}',
  finding_status finding_status not null,
  interim_paragraph_references text,
  final_paragraph_references text,
  qualification text,
  official_source_url text not null,
  transaction_types text[] not null default '{}',
  actor_roles text[] not null default '{}',
  evidence_types text[] not null default '{}',
  alleged_conduct text[] not null default '{}',
  evidentiary_gaps text[] not null default '{}',
  ingredients_not_established text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index scenario_findings_case_idx on scenario_findings (case_name);
create index scenario_findings_status_idx on scenario_findings (finding_status);
create index scenario_findings_fts_idx on scenario_findings using gin (
  to_tsvector('english',
    coalesce(scenario_title, '') || ' ' || coalesce(factual_pattern, '') || ' ' || coalesce(allegation_text, '')
  )
);

-- ---------------------------------------------------------------------------
-- finding_provisions: join table (replaces a flat provisionIds array)
-- ---------------------------------------------------------------------------
create table finding_provisions (
  id uuid primary key default gen_random_uuid(),
  finding_id uuid not null references scenario_findings(id) on delete cascade,
  provision_id uuid not null references legal_provisions(id) on delete cascade,
  relationship text not null default 'alleged'
    check (relationship in ('alleged', 'applied', 'upheld', 'not_upheld')),
  unique (finding_id, provision_id)
);

-- ---------------------------------------------------------------------------
-- source_documents: retrieval attempts against official URLs
-- ---------------------------------------------------------------------------
create table source_documents (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  url text not null,
  content_type text check (content_type in ('html', 'pdf', 'unknown')),
  retrieval_status text not null default 'not_attempted'
    check (retrieval_status in ('not_attempted', 'success', 'failed')),
  retrieval_error text,
  checksum text,
  raw_text_excerpt text, -- only populated on a genuine successful retrieval
  retrieved_at timestamptz,
  created_at timestamptz not null default now()
);
create index source_documents_order_idx on source_documents (order_id);

-- ---------------------------------------------------------------------------
-- processing_runs: audit trail of batch operations
-- ---------------------------------------------------------------------------
create table processing_runs (
  id uuid primary key default gen_random_uuid(),
  run_type text not null, -- 'import_verified_orders' | 'import_residual' | 'import_pilot_library' | 'retrieval_batch'
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  orders_processed integer not null default 0,
  successes integer not null default 0,
  failures integer not null default 0,
  summary text,
  created_by text not null default 'system'
);

-- ---------------------------------------------------------------------------
-- validation_issues: every flagged item, never silently dropped
-- ---------------------------------------------------------------------------
create table validation_issues (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references orders(id) on delete cascade,
  finding_id uuid references scenario_findings(id) on delete cascade,
  issue_type text not null,
  severity text not null default 'warning' check (severity in ('info', 'warning', 'error')),
  description text not null,
  source_row_ref text,
  resolved boolean not null default false,
  created_at timestamptz not null default now()
);
create index validation_issues_order_idx on validation_issues (order_id);
create index validation_issues_type_idx on validation_issues (issue_type);

-- ---------------------------------------------------------------------------
-- residual_register: exclusion / pending-link entries from
-- Residual_Order_Links.xlsx. Deliberately NOT part of orders/
-- scenario_findings — never used as a source of precedent.
-- ---------------------------------------------------------------------------
create table residual_register (
  id uuid primary key default gen_random_uuid(),
  case_or_order_name text not null,
  order_identifier text,
  official_url text,
  reason text not null,
  status text not null check (status in ('pending_link', 'duplicate_of_verified', 'not_cfid')),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- query_runs: scenario-query audit log. Disabled by default — the
-- application only inserts here when ENABLE_QUERY_LOGGING=true is set
-- server-side. No scenario text is logged otherwise.
-- ---------------------------------------------------------------------------
create table query_runs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  query_text text,
  actor_filter text,
  transaction_type_filter text,
  result_summary jsonb,
  user_email text
);

-- updated_at triggers
create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger orders_set_updated_at before update on orders
  for each row execute function set_updated_at();
create trigger scenario_findings_set_updated_at before update on scenario_findings
  for each row execute function set_updated_at();
