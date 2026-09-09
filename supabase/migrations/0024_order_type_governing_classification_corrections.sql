-- Order-stage metadata correction pass, applying the project's governing
-- order-type classification hierarchy (independently reviewed prior to
-- this migration):
--   1. Official SEBI URL/listing title gives the initial clue.
--   2. The official SEBI order/PDF title or first-page character controls
--      where available.
--   3. A document titled simply "ORDER" / "Order in the matter of ..." is
--      classified final_order.
--   4. Explicitly named special types (Interim/Interim Ex-Parte,
--      Interim cum SCN, Confirmatory, Final, Adjudication, Revocation)
--      retain their actual character; Corrigendum/Miscellaneous/disposal-
--      type documents remain "other".
--   5. Type is NEVER inferred from WTM/QJA/AO prefix, penalties,
--      directions, chronology, findings, or relationship to another order.
--
-- Every row below is updated by its exact, already-verified id (matched
-- 1:1 against order_number/order_date during this pass's own read-only
-- audit — see the accompanying final report). This migration touches
-- ONLY orders.order_type and orders.official_order_title. It never
-- touches matter_id, scenario_findings, finding_provisions,
-- order_directions, order_noticees, order_relationships, official_url, or
-- any legal_provisions/legal_instruments row, and it never inserts a new
-- order row. Every UPDATE is naturally idempotent (an exact SET, not a
-- delta) and safe to re-run.

-- ---------------------------------------------------------------------
-- Group A: plain SEBI "Order in the matter of ..." / "Order in respect
-- of ..." documents, previously misclassified as "other", corrected to
-- final_order under rule 3. official_order_title is populated for each
-- (all 11 were previously null) using the exact wording already present
-- in each row's own official_url slug -- the same derivation already
-- reflected in this table's one existing populated title (Max Financial
-- Services Limited, "Order in the matter of Max Financial Services
-- Limited", itself a verbatim rendering of its own listing-page slug) --
-- never a fabricated or paraphrased title.
-- ---------------------------------------------------------------------

-- Tarapur Transformers Limited -- 31-08-2026 -- QJA/SS/CFID/CFID-SEC6/32688/2026-27
update orders
set order_type = 'final_order',
    official_order_title = coalesce(official_order_title, 'Order in the matter of Tarapur Transformers Limited')
where id = 'fdf46fec-831a-411e-ba10-0f382cd51e40'
  and order_number = 'QJA/SS/CFID/CFID-SEC6/32688/2026-27';

-- Bajaj Hindusthan Sugar Limited -- 13-05-2026 -- QJA/MN/CFID/CFID-TPD/32406/2026-27
update orders
set order_type = 'final_order',
    official_order_title = coalesce(official_order_title, 'Order in the matter of Bajaj Hindusthan Sugar Limited')
where id = '1ee13f3e-c32e-41b1-8d66-2194ef11dea8'
  and order_number = 'QJA/MN/CFID/CFID-TPD/32406/2026-27';

-- Mediaone Global Entertainment Limited -- 27-02-2026 -- QJA/MN/CFID/CFID-SEC6/32159/2025-26
update orders
set order_type = 'final_order',
    official_order_title = coalesce(official_order_title, 'Order in the matter of Mediaone Global Entertainment Ltd')
where id = 'd7d6a9fb-8f89-467e-ac63-66186bd9c445'
  and order_number = 'QJA/MN/CFID/CFID-SEC6/32159/2025-26';

-- In the matter of Arcotech Limited -- 27-02-2026 -- QJA/MN/CFID/CFID-SEC5/32160/2025-26
update orders
set order_type = 'final_order',
    official_order_title = coalesce(official_order_title, 'Order in the matter of Arcotech Ltd')
where id = '8d684f48-5a41-45b9-9828-5e82ee6f0928'
  and order_number = 'QJA/MN/CFID/CFID-SEC5/32160/2025-26';

-- Droneacharya Aerial Innovations Ltd -- 28-11-2025 -- QJA/SS/CFID/CFID-SEC5/31818/2025-26
-- (this listing page's own slug reads "order-in-respect-of-...", not
-- "order-in-the-matter-of-...": preserved verbatim, not normalized to the
-- more common phrasing.)
update orders
set order_type = 'final_order',
    official_order_title = coalesce(official_order_title, 'Order in respect of Droneacharya Aerial Innovations Limited')
where id = '5995ced6-1397-42e7-8dc0-9224be4c6375'
  and order_number = 'QJA/SS/CFID/CFID-SEC5/31818/2025-26';

-- In the matter of Dewan Housing Finance Corporation Limited -- 12-08-2025 -- WTM/AN/CFID/CFID/31591/2025-26
update orders
set order_type = 'final_order',
    official_order_title = coalesce(official_order_title, 'Order in the matter of Dewan Housing Finance Corporation Ltd')
where id = '9a0cc27a-8974-452b-be1a-c357af484e3a'
  and order_number = 'WTM/AN/CFID/CFID/31591/2025-26';

-- Binny Limited -- 31-07-2024 -- QJA/GR/CFID/CFID/30579/2024-25
update orders
set order_type = 'final_order',
    official_order_title = coalesce(official_order_title, 'Order in the matter of Binny Limited')
where id = '8a011f8b-aa7b-4f78-abfb-a607ea7eb39e'
  and order_number = 'QJA/GR/CFID/CFID/30579/2024-25';

-- Setubandhan Infrastructure Limited -- 06-05-2024 -- QJA/AA/CFID/CFID/30318/2024-25
update orders
set order_type = 'final_order',
    official_order_title = coalesce(official_order_title, 'Order in the matter of Setubandhan Infrastructure Limited')
where id = '3cbb2aea-bd2b-4fd8-8e80-5de38a1c21df'
  and order_number = 'QJA/AA/CFID/CFID/30318/2024-25';

-- Manpasand Beverages Limited -- 30-04-2024 -- WTM/ASB/CFID/CFID-SEC4/30313/2024-25
update orders
set order_type = 'final_order',
    official_order_title = coalesce(official_order_title, 'Order in the matter of Manpasand Beverages Limited')
where id = '326921bb-8bf5-4261-b874-ef1e0d132d8f'
  and order_number = 'WTM/ASB/CFID/CFID-SEC4/30313/2024-25';

-- Sharon Bio Medicine Limited (investigation matter, the FINAL order --
-- not the 02-06-2023 Corrigendum on the same matter_id, which stays
-- "other" and is untouched by this migration) -- 31-05-2023 -- WTM/ASB/CFID/CFID/26926/2023-24
update orders
set order_type = 'final_order',
    official_order_title = coalesce(official_order_title, 'Order in the matter of Sharon Bio Medicine Limited')
where id = '7e05cfdc-c1d0-4300-be9b-e9bc8323d510'
  and order_number = 'WTM/ASB/CFID/CFID/26926/2023-24';

-- Magnum Ventures Limited -- 31-05-2023 -- QJA/SP/CFID/CFID-SEC4/26875/2023-24
update orders
set order_type = 'final_order',
    official_order_title = coalesce(official_order_title, 'Order in the matter of Magnum Ventures Limited')
where id = '9a8d5b4f-a6f7-4ea9-8d7a-f7eb1a209e72'
  and order_number = 'QJA/SP/CFID/CFID-SEC4/26875/2023-24';

-- ---------------------------------------------------------------------
-- Group B: Par Drugs and Chemicals Limited -- 15-09-2025 --
-- WTM/KV/CFID/CFID-SEC4/31660/2025-26 -- official document is an
-- EX-PARTE INTERIM ORDER (https://www.sebi.gov.in/sebi_data/attachdocs/
-- sep-2025/interim_order_pdcl.pdf), previously misclassified as "other",
-- corrected to interim_order under rule 4. official_order_title is left
-- untouched here: this pass's own evidence confirms the document's TYPE
-- ("EX-PARTE INTERIM ORDER") but not its exact printed caption/title
-- text, and this migration populates a title only where the exact
-- wording is independently confirmed (see the final report) rather than
-- constructing one from the document type alone.
--
-- The separate 25-03-2026 Par Drugs Confirmatory Order
-- (WTM/KV/CFID/CFID-SEC4/32246/2025-26, id ce0b50a9-8052-4247-ac11-
-- 2f7914dea82d, same matter_id 0d84d491-0dff-4b34-8900-f8319f3edccf) is
-- already correctly classified confirmatory_order and is NOT touched by
-- this migration.
-- ---------------------------------------------------------------------
update orders
set order_type = 'interim_order'
where id = '39d66f9f-14b2-4441-9fa4-b76d9bcd75d9'
  and order_number = 'WTM/KV/CFID/CFID-SEC4/31660/2025-26';

-- ---------------------------------------------------------------------
-- Group C: Suzlon Energy Limited -- 29-05-2026 -- WTM/SP/CFID/CFID_4/
-- 32427/2026-27 -- previously classified adjudication_order, but its
-- official SEBI title identifies it as an Order under Section 15I(3) of
-- the SEBI Act and Section 23I(3) of the SCRA, not the ordinary
-- Adjudication Order in this matter -- corrected to "other" under this
-- broad taxonomy's rule 4 (an explicitly-named special order that isn't
-- one of the standard interim/confirmatory/final/adjudication/revocation
-- types). No separate genuine Adjudication Order for Suzlon Energy
-- Limited currently exists anywhere in this table (confirmed during this
-- pass's own read-only audit) -- none is added here; one may be
-- ingested later, only through the normal corpus-ingestion workflow with
-- its own official SEBI source and matter linkage.
-- ---------------------------------------------------------------------
update orders
set order_type = 'other',
    official_order_title = coalesce(official_order_title, 'Order under Section 15I(3) of the SEBI Act and Section 23I(3) of the SCRA in the matter of Suzlon Energy Limited')
where id = '3824c4b9-ae67-4e1b-9d59-dcfbe02120d9'
  and order_number = 'WTM/SP/CFID/CFID_4/32427/2026-27';

-- ---------------------------------------------------------------------
-- Safety check: assert every one of the 13 targeted rows actually exists
-- with the id+order_number pair this migration expects and now carries
-- the corrected order_type, so a silently-mismatched id (typo, prior
-- data change) is never masked as a quiet no-op.
-- ---------------------------------------------------------------------
do $$
declare
  expected_final_order_ids uuid[] := array[
    'fdf46fec-831a-411e-ba10-0f382cd51e40', '1ee13f3e-c32e-41b1-8d66-2194ef11dea8',
    'd7d6a9fb-8f89-467e-ac63-66186bd9c445', '8d684f48-5a41-45b9-9828-5e82ee6f0928',
    '5995ced6-1397-42e7-8dc0-9224be4c6375', '9a0cc27a-8974-452b-be1a-c357af484e3a',
    '8a011f8b-aa7b-4f78-abfb-a607ea7eb39e', '3cbb2aea-bd2b-4fd8-8e80-5de38a1c21df',
    '326921bb-8bf5-4261-b874-ef1e0d132d8f', '7e05cfdc-c1d0-4300-be9b-e9bc8323d510',
    '9a8d5b4f-a6f7-4ea9-8d7a-f7eb1a209e72'
  ]::uuid[];
  mismatched_count int;
begin
  select count(*) into mismatched_count
  from unnest(expected_final_order_ids) as expected_id
  left join orders o on o.id = expected_id
  where o.id is null or o.order_type <> 'final_order';
  if mismatched_count <> 0 then
    raise exception 'Group A final_order correction: % row(s) missing or not corrected as expected', mismatched_count;
  end if;

  if (select order_type from orders where id = '39d66f9f-14b2-4441-9fa4-b76d9bcd75d9') <> 'interim_order' then
    raise exception 'Par Drugs 15-09-2025 row not corrected to interim_order as expected';
  end if;

  if (select order_type from orders where id = '3824c4b9-ae67-4e1b-9d59-dcfbe02120d9') <> 'other' then
    raise exception 'Suzlon 29-05-2026 row not corrected to other as expected';
  end if;
end $$;
