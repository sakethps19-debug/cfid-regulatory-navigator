-- Historical Treatment correction pass, round 2: promotes the 45
-- scenario_findings that were resolving matter identity via a runtime
-- case-name fallback into real, curated orders.matter_id linkage.
--
-- Grouping key: orders.normalized_matter_name, an ALREADY-CURATED,
-- order-level field (see 0006_matter_order_model.sql) -- never
-- ScenarioFinding.case_name text, and never fuzzy company-name matching.
-- Every group below is an EXACT match on that existing field.
--
-- Concrete defect this fixes: ADANI-AC-01 and ADANI-MR-01 carry different
-- finding-level case names ("... Adicorp Enterprises)" vs "... Milestone
-- Tradelinks / Rehvar Infrastructure)") but their linked orders
-- (87ebbbad-...-fca59 and a9e5194c-...-383f) already both carry the
-- identical curated normalized_matter_name "Investigation into Hindenburg
-- allegations wrt Rehvar and Milestone in the matter of Adani Group" --
-- i.e. the order data itself already recorded these as one investigation;
-- the case-name-only runtime fallback simply wasn't reading it. The same
-- two-order pattern holds for DHFL-01/DHFL-02 and the LS Industries Ltd
-- interim/final order pair (LSIL-01's own order_id/final_order_id).
--
-- The remaining 28 groups are single-order matters (one order underlies
-- one or more scenario_findings that already share that order's own case
-- name, so they already deduplicated correctly under the old fallback --
-- but a runtime fallback is weaker and less auditable than a real
-- matter_id even where it happens to produce the same grouping today).
--
-- No grouping here is invented or inferred from company-name similarity:
-- every one is keyed on an exact match of pre-existing curated data.
do $$
declare
  grp record;
  m_id uuid;
  ord_id uuid;
begin
  for grp in
    select * from (values
      ('In the matter of Dewan Housing Finance Corporation Limited', array['45717f60-24eb-4b4c-9281-b6e4ad45c0bf','9a0cc27a-8974-452b-be1a-c357af484e3a']::uuid[]),
      ('Investigation into Hindenburg allegations wrt Rehvar and Milestone in the matter of Adani Group', array['87ebbbad-608f-406b-9c8b-a2c1874fca59','a9e5194c-dcc7-4363-9f0d-708fa8ec383f']::uuid[]),
      ('LS Industries Ltd', array['b4d37780-0051-49f8-84d4-8771111bebf2','b7ec81b9-60e9-4922-9a7d-d173461eda6d']::uuid[]),
      ('Add-Shop E Retail Ltd', array['136ac9e4-d695-4a25-82e2-359fd84c9e87']::uuid[]),
      ('Arvind Remedies Limited', array['0581b6dc-ee5c-40d1-83c8-ddda323045a0']::uuid[]),
      ('Bajaj Hindusthan Sugar Limited', array['1ee13f3e-c32e-41b1-8d66-2194ef11dea8']::uuid[]),
      ('Binny Limited', array['8a011f8b-aa7b-4f78-abfb-a607ea7eb39e']::uuid[]),
      ('Cerebra Integrated Technologies Limited', array['08367d54-04cb-4452-b277-988b55822ea4']::uuid[]),
      ('Coffee Day Enterprises Limited', array['34b7a225-dfac-4cf6-b2fc-0170cf01b1a6']::uuid[]),
      ('DB Realty Limited', array['3f45f80e-8cd9-49b6-af73-71cbb44f0cd7']::uuid[]),
      ('Droneacharya Aerial Innovations Ltd', array['5995ced6-1397-42e7-8dc0-9224be4c6375']::uuid[]),
      ('Fedders  Electric and Engineering Limited', array['b7aeb683-900b-42c7-a15e-76001230c17c']::uuid[]),
      ('Golden Tobacco Limited', array['67bb3627-a6c5-432f-be69-2b3664318ad8']::uuid[]),
      ('Hexa Tradex Ltd', array['31ce4aa2-dfc6-409a-8c19-82c08f259529']::uuid[]),
      ('In the matter of Arcotech Limited', array['8d684f48-5a41-45b9-9828-5e82ee6f0928']::uuid[]),
      ('In the matter of Varanium Cloud Ltd', array['40f3d753-6233-4141-895d-9a13221b2d5e']::uuid[]),
      ('INVESTIGATION IN THE FINANCIAL STATEMENTS OF OMAXE LIMITED', array['e8f58ee2-f462-4ccb-8d5b-c1e3cbd657af']::uuid[]),
      ('Investigation in the matter of Nalwa Sons Investments Limited', array['4fae73e4-83af-41de-8fdf-708a445fa337']::uuid[]),
      ('Investigation in the matter of Suzlon Energy Limited', array['3824c4b9-ae67-4e1b-9d59-dcfbe02120d9']::uuid[]),
      ('Investigation into Misstatement / Misrepresentation in Financial Statements of Sanwaria Consumer Limited', array['385350b0-e144-407d-b9f7-e5a8fc6d91f9']::uuid[]),
      ('Investigation into Misstatement Misrepresentation in Financial Statements of   Mideast Integrated Steel Limited  MISL', array['a43096d6-aa6f-4ed2-a517-fdfc4c672e59']::uuid[]),
      ('Investigation into the unauthorized pledge of immovable property of Zee Entertainment Enterprises Limited', array['05b64e57-9d64-4021-bd7b-0104b36995d2']::uuid[]),
      ('Kwality Limited', array['362231b3-6bba-40a1-a1f4-75d9d5495b4d']::uuid[]),
      ('LEEL Electricals Limited', array['58637e40-bea6-408d-9df6-7d59b962c16b']::uuid[]),
      ('Magnum Ventures Limited', array['9a8d5b4f-a6f7-4ea9-8d7a-f7eb1a209e72']::uuid[]),
      ('Manpasand Beverages Limited', array['326921bb-8bf5-4261-b874-ef1e0d132d8f']::uuid[]),
      ('Mediaone Global Entertainment Limited', array['d7d6a9fb-8f89-467e-ac63-66186bd9c445']::uuid[]),
      ('Mishtann Foods Limited', array['7811f239-ed35-443c-a2b5-57e01d9eee7f']::uuid[]),
      ('Rana Sugars Limited', array['f17dfd08-ba4f-4e83-bb2f-97ebde479b39']::uuid[]),
      ('Shivom Investment and Consultancy Limited', array['72542da4-c7de-4cac-9ecc-6569cadf0e5b']::uuid[]),
      ('Tarapur Transformers Limited', array['fdf46fec-831a-411e-ba10-0f382cd51e40']::uuid[])
    ) as g(matter_name, order_ids)
  loop
    insert into matters (normalized_matter_name, description)
    values (
      grp.matter_name,
      'Historical Treatment matter-identity remediation: grouped from an exact match on the already-curated orders.normalized_matter_name field (never inferred from company-name similarity).'
    )
    on conflict (normalized_matter_name) do update set description = matters.description
    returning id into m_id;

    foreach ord_id in array grp.order_ids loop
      insert into data_change_log (table_name, record_ref, field_name, old_value, new_value, reason, changed_by)
      select 'orders', o.id::text, 'matter_id', o.matter_id::text, m_id::text,
             'Historical Treatment matter-identity remediation: promoted from runtime case-name fallback to canonical matter_id via exact match on orders.normalized_matter_name = ''' || grp.matter_name || '''.',
             'claude_code_historical_treatment_correction_pass_2'
      from orders o where o.id = ord_id and o.matter_id is distinct from m_id;

      update orders set matter_id = m_id where id = ord_id;
    end loop;
  end loop;
end $$;
