-- Additional table beyond the required 14: preserves the "Directions and
-- Outcomes" data already curated in CFID_Precedent_Library_Pilot.xlsx
-- (interim protective directions, final penalties/disgorgement/remedial
-- directions) at the individual-direction level, each traceable to a
-- paragraph reference.
create table order_directions (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references orders(id) on delete set null,
  case_name text not null,
  stage text not null,
  direction_or_outcome text not null,
  paragraph_reference text,
  official_source_url text not null,
  created_at timestamptz not null default now()
);
create index order_directions_order_idx on order_directions (order_id);

alter table order_directions enable row level security;
create policy order_directions_select_allowed_user on order_directions
  for select using (is_allowed_user());
