-- A generated, stored tsvector column so the Supabase JS client's
-- .textSearch() (which requires an actual column, not an arbitrary
-- expression) can complement the deterministic matching engine with
-- Postgres full-text search over free-text scenario descriptions.
alter table scenario_findings
  add column search_vector tsvector generated always as (
    to_tsvector('english',
      coalesce(scenario_title, '') || ' ' || coalesce(factual_pattern, '') || ' ' || coalesce(allegation_text, '')
    )
  ) stored;

drop index if exists scenario_findings_fts_idx;
create index scenario_findings_search_vector_idx on scenario_findings using gin (search_vector);
