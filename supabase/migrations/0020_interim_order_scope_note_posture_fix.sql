-- Officer-facing gist posture correction (officer walkthrough, Part 1 "order
-- gist requirement"): orders.scope_note is shown to officers as the short
-- gist of an order (Home "Recent Orders", Case Library, order detail page).
-- An audit of every populated scope_note on interim-stage orders
-- (order_type IN ('interim_order','interim_cum_show_cause_notice')) found
-- 15 of 19 stated the alleged conduct as flat, established fact -- e.g.
-- "ASERL and WOAL... booked large fictitious circular sales/purchases" --
-- with no "alleged"/"prima facie" framing, even though nothing has been
-- finally established at the interim stage. 4 of 19 (Rajesh Exports
-- Limited, Seacoast Shipping Services Limited's interim-cum-SCN, Gensol
-- Engineering Limited, Nirman Agri Genetics Limited) already correctly used
-- "Prima facie findings" / "alleging" framing and are left unchanged.
--
-- This migration is deliberately mechanical, not a rewrite of the
-- substantive case narrative: it PREPENDS one uniform, short posture
-- disclaimer to each of the 15 affected scope_note values, preserving
-- every word of the existing curated fact detail exactly as written. A
-- uniform mechanical prefix is safer than individually rewording 15
-- paragraphs of case-specific narrative (each of which would itself be a
-- fresh LLM-generated rewrite, the very risk the correcting-officer's own
-- instruction cautioned against ("do not automatically regenerate every
-- summary")), while directly fixing the one concrete defect identified:
-- final orders may state established/not-established outcomes; interim
-- orders may not be presented as though they already had.
--
-- Purely additive text change (prepend only, nothing removed or
-- overwritten) to 15 existing rows; no schema change; no finding-level
-- disposition data touched (scenario_findings.finding_status already
-- correctly records these as prima_facie/alleged where applicable and is
-- unaffected by this migration).
update orders
set scope_note = 'Interim order — the conduct below is alleged, prima facie, and not yet a final finding. ' || scope_note
where id in (
  '136ac9e4-d695-4a25-82e2-359fd84c9e87', -- Add-Shop E Retail Ltd
  '15280445-21a7-47bd-9b97-11d89d3e76f1', -- Bharat Global Developers Limited (interim)
  '4118937a-ea81-4939-a66f-97add699e9be', -- Brightcom Group Ltd. (interim, Aug 22 2023)
  'b57426cf-8487-4860-9883-a4951988ef91', -- Brightcom Group Ltd. (interim cum SCN, Apr 13 2023)
  '7da028a1-7c4e-4058-863f-485c597e8e3f', -- Eros International Media Limited
  '6c1ae8b3-5a6d-440e-baa1-1afff60e12cd', -- Royal Orchid Hotels Limited
  '05b64e57-9d64-4021-bd7b-0104b36995d2', -- Zee Entertainment (LoC / fixed-deposit scheme)
  'f03b9201-3ee2-4b74-99de-8868556235b3', -- Linde India Limited
  'b7ec81b9-60e9-4922-9a7d-d173461eda6d', -- LS Industries Ltd
  '7811f239-ed35-443c-a2b5-57e01d9eee7f', -- Mishtann Foods Limited
  '4ac3a2b2-b4a1-4ded-89d2-b61b504bd210', -- Onelife Capital Advisors Limited
  '736b33b0-d5e1-46e5-99e5-81a327bf8419', -- Pacheli Industrial Finance Ltd
  '6108a0e2-ed66-4240-9d86-146cda628fb3', -- Reliance Home Finance Limited
  '30e2150e-d93e-41ab-bfd6-2b7bba0ad438', -- Securekloud Technologies Limited
  '0c1409a7-d821-40de-8c4b-39b6a2270e58'  -- Sunedison Infrastructure Limited
)
and scope_note not ilike 'Interim order — the conduct below is alleged%';
