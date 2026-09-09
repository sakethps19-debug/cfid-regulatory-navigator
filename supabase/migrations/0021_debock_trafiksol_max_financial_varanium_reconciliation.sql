-- Part A of the August-2026 SEBI order batch: integrates three new final
-- orders (Debock Industries Limited, Trafiksol ITS Technologies Limited,
-- Max Financial Services Limited) and reconciles one existing matter
-- (Varanium Cloud Limited) whose finding_provisions mapping was found, on
-- re-comparison against the actual final order text, to be INCOMPLETE (not
-- stale/interim -- the existing VCL-01/VCL-02 findings already correctly
-- reflect final-stage disposition -- but the order also establishes a
-- distinct IPO/offer-document disclosure violation, para 111(v)/111(ii),
-- that no existing finding captures).
--
-- Every case_name, order_number, order_date and order_type below was read
-- directly from the official SEBI order PDF (not the URL slug, and not
-- inferred): each order's own title page states "FINAL ORDER" in terms,
-- including Max Financial Services Limited's, whose URL slug ("order-in-
-- the-matter-of-...") does NOT say "final" -- the order's own first page
-- does. Max Financial Services Limited disposes of the proceedings against
-- all 12 Noticees WITHOUT any direction or penalty (para 185: "I ... dispose
-- of the proceedings ... without issuance of any direction or imposition of
-- any penalty"); every substantive allegation (fraudulent scheme under
-- Section 12A/PFUTP, non-disclosure) was found NOT established on the
-- merits (paras 67, 74, 100, 184). This is recorded as a single
-- not_upheld finding with zero finding_provisions rows (no substantive
-- provision was established) rather than omitted, consistent with "unknown/
-- null is preferable to an invented value" -- the absence of a
-- provisionIds entry here is itself the accurate record, not a gap.
--
-- New legal_provisions rows (four, all purely additive, same modelling
-- convention as migrations 0017/0018 -- official_source_url points to the
-- actual consolidated regulation text this was verified against, not the
-- order):
--   ICDR-24-1   -- Regulation 24(1), SEBI (ICDR) Regulations 2018 (main
--                  board / general issue segment): draft offer document
--                  and offer document must contain all material disclosures
--                  that are true and adequate for an informed investment
--                  decision. Verified against SEBI's ICDR consolidated text
--                  (last amended May 17, 2024) -- Part VI, "Disclosures in
--                  the draft offer document and offer document".
--   ICDR-245-1  -- Regulation 245(1), same instrument, same substantive
--                  text, but the DISTINCT regulation SEBI maintains for the
--                  SME/Innovators Growth Platform issue segment (the
--                  segment Trafiksol's IPO was made on). Textually near-
--                  identical to Regulation 24(1) but a different regulation
--                  number in a different Part of the ICDR Regulations --
--                  kept as its own canonical id rather than collapsed into
--                  ICDR-24-1, consistent with this corpus's exact-legal-
--                  identity rule (same rule that keeps LODR-4-1 distinct
--                  from PFUTP-4-1): a different regulation number is a
--                  different legal identity even where the operative text
--                  is nearly identical.
--   PFUTP-4-2-h -- Regulation 4(2)(h) of the PFUTP Regulations 2003: selling,
--                  dealing or pledging of stolen, counterfeit or
--                  fraudulently issued securities. Established against
--                  Debock (para 68) alongside 4(2)(c)/(f)/(k) -- added here
--                  for citation completeness/accuracy on that finding only.
--                  NOT added to any Part B master-scenario mapping: its own
--                  text (dealing in stolen/counterfeit/fraudulently-issued
--                  securities) is not independently satisfied by a bare
--                  "diversion of funds" or "fictitious financial statements"
--                  fact pattern, so under the strict provision-mapping rule
--                  it stays a Debock-specific citation, not a template.
--   PFUTP-4-2-s -- Regulation 4(2)(s) of the PFUTP Regulations 2003:
--                  "mis-selling of securities or services relating to
--                  securities market" (defined in the regulation's own
--                  Explanation as sale of securities/services by knowingly
--                  making a false or misleading statement, knowingly
--                  concealing material facts or associated risk, or failing
--                  to ensure suitability). Established against Trafiksol
--                  (para 97) for the IPO offer documents' false/misleading
--                  financial disclosures -- an IPO offer of shares IS a
--                  "sale of securities" and a materially false prospectus
--                  IS "knowingly making a false or misleading statement" in
--                  that sale, so this independently fits an IPO-disclosure
--                  fact pattern on its own terms, not merely because
--                  Trafiksol happened to cite it -- see the new
--                  ipo-prospectus-offer-document-disclosure-irregularities
--                  fixed scenario added in the companion TypeScript change.
-- Both PFUTP sub-clauses were verified against SEBI's PFUTP consolidated
-- text (last amended June 28, 2024), Regulation 4(2).
--
-- LODR-32 (Regulation 32/32(7A), issue-proceeds utilisation monitoring/
-- disclosure) already exists as a single canonical id in this corpus and is
-- reused as-is for the Varanium Statement-of-Deviation finding below -- no
-- new provision row needed; the order's own sub-clause citation
-- ("regulations 32(1), (4), (5)") is subsumed under that single existing
-- row, consistent with how this corpus already treats LODR-32 as
-- ungranulated (unlike LODR-4-1, which this corpus deliberately did split
-- into lettered sub-clause ids -- the two provisions were modelled
-- differently at the time each was first added, and this migration does
-- not retroactively change that).
--
-- Purely additive/corrective throughout: no existing row is deleted, no
-- canonical_id is renamed, no existing finding_provisions row is removed.
-- The two Varanium findings already in the corpus (VCL-01, VCL-02) are
-- untouched; VCL-03 is a new, third finding for the same matter/order.
do $$
declare
  icdr_instrument_id uuid;
  pfutp_instrument_id uuid;
  sebi_act_12a_a uuid; sebi_act_12a_b uuid; sebi_act_12a_c uuid;
  pfutp_3_a uuid; pfutp_3_b uuid; pfutp_3_c uuid; pfutp_3_d uuid;
  pfutp_4_1 uuid; pfutp_4_2_c uuid; pfutp_4_2_f uuid; pfutp_4_2_h uuid; pfutp_4_2_k uuid; pfutp_4_2_r uuid; pfutp_4_2_s uuid;
  icdr_24_1 uuid; icdr_245_1 uuid;
  lodr_32 uuid;
  debock_matter_id uuid;
  trafiksol_matter_id uuid;
  max_matter_id uuid;
  debock_order_id uuid;
  trafiksol_order_id uuid;
  max_order_id uuid;
  varanium_order_id uuid := '40f3d753-6233-4141-895d-9a13221b2d5e';
  dbk01_finding_id uuid;
  trf01_finding_id uuid;
  mfs01_finding_id uuid;
  vcl03_finding_id uuid;
begin
  select id into icdr_instrument_id from legal_instruments where name = 'SEBI (Issue of Capital and Disclosure Requirements) Regulations, 2018';
  select id into pfutp_instrument_id from legal_instruments where name = 'PFUTP Regulations, 2003';
  if icdr_instrument_id is null or pfutp_instrument_id is null then
    raise exception 'ICDR or PFUTP instrument not found';
  end if;

  -- New legal_provisions rows -----------------------------------------
  insert into legal_provisions (canonical_id, instrument_id, provision_number, subject, current_text_verification_status, official_source_url)
  values (
    'ICDR-24-1',
    icdr_instrument_id,
    'Regulation 24(1)',
    'The draft offer document and offer document (main-board/general issue segment) shall contain all material disclosures which are true and adequate to enable applicants to take an informed investment decision.',
    'officially_verified',
    'https://www.sebi.gov.in/legal/regulations/may-2024/securities-and-exchange-board-of-india-issue-of-capital-and-disclosure-requirements-regulations-2018-last-amended-on-may-17-2024-_80421.html'
  ) on conflict (canonical_id) do nothing;

  insert into legal_provisions (canonical_id, instrument_id, provision_number, subject, current_text_verification_status, official_source_url)
  values (
    'ICDR-245-1',
    icdr_instrument_id,
    'Regulation 245(1)',
    'The offer document (SME / Innovators Growth Platform issue segment) shall contain all material disclosures which are true and adequate to enable applicants to take an informed investment decision. Textually identical in substance to Regulation 24(1) but a distinct regulation number applicable to the SME/IGP issue segment rather than the main board.',
    'officially_verified',
    'https://www.sebi.gov.in/legal/regulations/may-2024/securities-and-exchange-board-of-india-issue-of-capital-and-disclosure-requirements-regulations-2018-last-amended-on-may-17-2024-_80421.html'
  ) on conflict (canonical_id) do nothing;

  insert into legal_provisions (canonical_id, instrument_id, provision_number, subject, current_text_verification_status, official_source_url)
  values (
    'PFUTP-4-2-h',
    pfutp_instrument_id,
    'Regulation 4(2)(h)',
    'Fraudulent/unfair trade practice: selling, dealing in, or pledging stolen, counterfeit or fraudulently issued securities, whether in physical or dematerialized form (subject to a proviso protecting a holder in due course or a bona fide on-market transaction).',
    'officially_verified',
    'https://www.sebi.gov.in/legal/regulations/jun-2024/sebi-prohibition-of-fraudulent-and-unfair-trade-practices-relating-to-securities-market-regulations-2003-last-amended-on-june-28-2024-_84781.html'
  ) on conflict (canonical_id) do nothing;

  insert into legal_provisions (canonical_id, instrument_id, provision_number, subject, current_text_verification_status, official_source_url)
  values (
    'PFUTP-4-2-s',
    pfutp_instrument_id,
    'Regulation 4(2)(s)',
    'Fraudulent/unfair trade practice: mis-selling of securities or services relating to the securities market -- defined as sale of securities/services by (i) knowingly making a false or misleading statement, (ii) knowingly concealing or omitting material facts, (iii) knowingly concealing associated risk, or (iv) not taking reasonable care to ensure suitability of the securities/service to the buyer.',
    'officially_verified',
    'https://www.sebi.gov.in/legal/regulations/jun-2024/sebi-prohibition-of-fraudulent-and-unfair-trade-practices-relating-to-securities-market-regulations-2003-last-amended-on-june-28-2024-_84781.html'
  ) on conflict (canonical_id) do nothing;

  -- Matters --------------------------------------------------------------
  insert into matters (normalized_matter_name, description)
  values ('In the matter of Debock Industries Limited', 'Final Order, Aug 28, 2026 (WTM/AS/CFID/CFID-SEC4/32684/2026-27): diversion of Rs.49 crore rights-issue proceeds by the company and its MD, financed through an integrated fraudulent scheme involving fictitious sales/purchases in the company''s books.')
  on conflict (normalized_matter_name) do nothing
  returning id into debock_matter_id;
  if debock_matter_id is null then
    select id into debock_matter_id from matters where normalized_matter_name = 'In the matter of Debock Industries Limited';
  end if;

  insert into matters (normalized_matter_name, description)
  values ('In the matter of Initial Public Offer of Trafiksol ITS Technologies Ltd.', 'Final Order, Aug 28, 2026 (WTM/AS/CFID/CFID-SEC1/32687/2026-27): IPO offer documents overstated pre-issue revenue via circular related-party billing and misrepresented customer/supplier concentration; conflict-of-interest financial relationship with the sole Merchant Banker''s controlling shareholder''s father not disclosed in the DRHP.')
  on conflict (normalized_matter_name) do nothing
  returning id into trafiksol_matter_id;
  if trafiksol_matter_id is null then
    select id into trafiksol_matter_id from matters where normalized_matter_name = 'In the matter of Initial Public Offer of Trafiksol ITS Technologies Ltd.';
  end if;

  insert into matters (normalized_matter_name, description)
  values ('In the matter of Max Financial Services Limited', 'Final Order, Aug 24, 2026 (WTM/AS/CFID/CFID-CORD/32677/2026-27): SCN alleging a fraudulent scheme in MFSL''s sale of its Max Life Insurance stake to Axis Bank/Axis Capital/Axis Securities and related non-disclosure; on full inquiry, every substantive allegation found NOT established -- proceedings against all 12 Noticees disposed of without direction or penalty.')
  on conflict (normalized_matter_name) do nothing
  returning id into max_matter_id;
  if max_matter_id is null then
    select id into max_matter_id from matters where normalized_matter_name = 'In the matter of Max Financial Services Limited';
  end if;

  -- Orders -----------------------------------------------------------
  insert into orders (
    case_name, listed_entity, order_type, order_type_source, order_date, order_number, passing_authority,
    official_url, cfid_verified, cfid_verification_source, cfid_verification_basis,
    scope_note, matter_id, official_order_title, normalized_matter_name, processing_stage
  ) values (
    'In the matter of Debock Industries Limited',
    'Debock Industries Limited',
    'final_order',
    'document_confirmed',
    '2026-08-28',
    'WTM/AS/CFID/CFID-SEC4/32684/2026-27',
    'Amarjeet Singh, Whole Time Member, SEBI',
    'https://www.sebi.gov.in/enforcement/orders/aug-2026/final-order-in-the-matter-of-debock-industries-limited_104110.html',
    true,
    'document_confirmed',
    'cfid_tag_in_order_number',
    'Final order: Rs.49 crore of rights-issue proceeds diverted by the company/MD via an integrated fraudulent scheme (fictitious sales/purchases used to camouflage the diversion); Debock and its MD debarred 7 years, other noticees 2-5 years, disgorgement of Rs.59.3 crore of unlawful trading gains and monetary penalties imposed; proceedings against 18 noticees disposed of without direction or penalty.',
    debock_matter_id,
    'Final Order in the matter of Debock Industries Limited',
    'In the matter of Debock Industries Limited',
    'legally_reviewed'
  )
  on conflict (official_url) do nothing
  returning id into debock_order_id;
  if debock_order_id is null then
    select id into debock_order_id from orders where official_url = 'https://www.sebi.gov.in/enforcement/orders/aug-2026/final-order-in-the-matter-of-debock-industries-limited_104110.html';
  end if;

  insert into orders (
    case_name, listed_entity, order_type, order_type_source, order_date, order_number, passing_authority,
    official_url, cfid_verified, cfid_verification_source, cfid_verification_basis,
    scope_note, matter_id, official_order_title, normalized_matter_name, processing_stage
  ) values (
    'In the matter of Initial Public Offer of Trafiksol ITS Technologies Ltd.',
    'Trafiksol ITS Technologies Limited',
    'final_order',
    'document_confirmed',
    '2026-08-28',
    'WTM/AS/CFID/CFID-SEC1/32687/2026-27',
    'Amarjeet Singh, Whole Time Member, SEBI',
    'https://www.sebi.gov.in/enforcement/orders/aug-2026/final-order-in-the-matter-of-ipo-of-trafiksol-its-technologies-limited_104109.html',
    true,
    'document_confirmed',
    'cfid_tag_in_order_number',
    'Final order: TITL''s SME-platform IPO offer documents overstated pre-issue revenue via circular related-party billing with two counterparties and misrepresented customer/supplier concentration, inducing 345.65x oversubscription; an undisclosed financial relationship with the sole Merchant Banker''s controlling shareholder''s father was also found non-disclosed in the DRHP. Noticees restrained from the securities market for 1 year and penalised; the specific allegation of illegal gratification/planting false news was NOT established.',
    trafiksol_matter_id,
    'Final Order in the matter of IPO of Trafiksol ITS Technologies Ltd.',
    'In the matter of Initial Public Offer of Trafiksol ITS Technologies Ltd.',
    'legally_reviewed'
  )
  on conflict (official_url) do nothing
  returning id into trafiksol_order_id;
  if trafiksol_order_id is null then
    select id into trafiksol_order_id from orders where official_url = 'https://www.sebi.gov.in/enforcement/orders/aug-2026/final-order-in-the-matter-of-ipo-of-trafiksol-its-technologies-limited_104109.html';
  end if;

  insert into orders (
    case_name, listed_entity, order_type, order_type_source, order_date, order_number, passing_authority,
    official_url, cfid_verified, cfid_verification_source, cfid_verification_basis,
    scope_note, matter_id, official_order_title, normalized_matter_name, processing_stage
  ) values (
    'In the matter of Max Financial Services Limited',
    'Max Financial Services Limited',
    'final_order',
    'document_confirmed',
    '2026-08-24',
    'WTM/AS/CFID/CFID-CORD/32677/2026-27',
    'Amarjeet Singh, Whole Time Member, SEBI',
    'https://www.sebi.gov.in/enforcement/orders/aug-2026/order-in-the-matter-of-max-financial-services-limited_103935.html',
    true,
    'document_confirmed',
    'cfid_tag_in_order_number',
    'Final order disposing of the proceedings against all 12 Noticees WITHOUT any direction or imposition of penalty: the SCN''s allegation of a fraudulent scheme (Section 12A/PFUTP) in MFSL''s sale of its Max Life Insurance stake to Axis Bank/Axis Capital/Axis Securities, and related non-disclosure allegations, were found NOT established on the merits. Order type is confirmed from the order''s own first-page title ("FINAL ORDER"), not the official URL slug, which omits the word "final".',
    max_matter_id,
    'Order in the matter of Max Financial Services Limited',
    'In the matter of Max Financial Services Limited',
    'legally_reviewed'
  )
  on conflict (official_url) do nothing
  returning id into max_order_id;
  if max_order_id is null then
    select id into max_order_id from orders where official_url = 'https://www.sebi.gov.in/enforcement/orders/aug-2026/order-in-the-matter-of-max-financial-services-limited_103935.html';
  end if;

  -- Resolve provision ids used below --------------------------------
  select id into sebi_act_12a_a from legal_provisions where canonical_id = 'SEBI-ACT-12A-a';
  select id into sebi_act_12a_b from legal_provisions where canonical_id = 'SEBI-ACT-12A-b';
  select id into sebi_act_12a_c from legal_provisions where canonical_id = 'SEBI-ACT-12A-c';
  select id into pfutp_3_a from legal_provisions where canonical_id = 'PFUTP-3-a';
  select id into pfutp_3_b from legal_provisions where canonical_id = 'PFUTP-3-b';
  select id into pfutp_3_c from legal_provisions where canonical_id = 'PFUTP-3-c';
  select id into pfutp_3_d from legal_provisions where canonical_id = 'PFUTP-3-d';
  select id into pfutp_4_1 from legal_provisions where canonical_id = 'PFUTP-4-1';
  select id into pfutp_4_2_c from legal_provisions where canonical_id = 'PFUTP-4-2-c';
  select id into pfutp_4_2_f from legal_provisions where canonical_id = 'PFUTP-4-2-f';
  select id into pfutp_4_2_h from legal_provisions where canonical_id = 'PFUTP-4-2-h';
  select id into pfutp_4_2_k from legal_provisions where canonical_id = 'PFUTP-4-2-k';
  select id into pfutp_4_2_r from legal_provisions where canonical_id = 'PFUTP-4-2-r';
  select id into pfutp_4_2_s from legal_provisions where canonical_id = 'PFUTP-4-2-s';
  select id into icdr_24_1 from legal_provisions where canonical_id = 'ICDR-24-1';
  select id into icdr_245_1 from legal_provisions where canonical_id = 'ICDR-245-1';
  select id into lodr_32 from legal_provisions where canonical_id = 'LODR-32';

  -- DBK-01: Debock's core established fraudulent scheme / diversion finding
  insert into scenario_findings (
    record_id, order_id, case_name, category, scenario_title, factual_pattern,
    noticee_actor_names, finding_status, final_paragraph_references, official_source_url,
    transaction_types, actor_roles, evidence_types, alleged_conduct,
    source_document_verified, paragraph_citation_verified, finding_status_verified, provision_mapping_verified, noticee_mapping_verified
  ) values (
    'DBK-01',
    debock_order_id,
    'In the matter of Debock Industries Limited',
    'Diversion of funds',
    'Rights-issue proceeds (Rs.49 crore) diverted by the company/MD via an integrated fraudulent scheme financed through fictitious sales and purchases in the company''s books',
    'Debock Industries Limited raised funds through a rights issue; Rs.49 crore of the proceeds was diverted out of the company''s account (traced to July 24, 2023). The Managing Director and associated noticees inflated the company''s sales and purchases through fictitious transactions to create a misleading financial picture that induced investors and facilitated the exit of promoters at the expense of public shareholders. Applying the Hon''ble Supreme Court''s two-limb PFUTP fraud test, the order finds the conduct was not an isolated regulatory lapse but a deliberately conceived and executed fraudulent scheme.',
    ARRAY['Debock Industries Limited','Mr. Mukesh Manveer Singh'],
    'upheld',
    'Paras 67-69, 187-190 (Final Order dated Aug 28, 2026)',
    'https://www.sebi.gov.in/enforcement/orders/aug-2026/final-order-in-the-matter-of-debock-industries-limited_104110.html',
    ARRAY['rights_issue','fund_transfer_personal_account'],
    ARRAY['company','promoter','managing_director'],
    ARRAY[]::text[],
    ARRAY['fund_diversion','fictitious_sales_or_revenue'],
    true, true, true, true, true
  )
  on conflict (record_id) do nothing
  returning id into dbk01_finding_id;

  if dbk01_finding_id is not null then
    insert into finding_provisions (finding_id, provision_id, relationship, justifying_tags)
    select dbk01_finding_id, pid, 'alleged', ARRAY[]::text[]
    from unnest(ARRAY[sebi_act_12a_a, sebi_act_12a_b, sebi_act_12a_c, pfutp_3_a, pfutp_3_b, pfutp_3_c, pfutp_3_d, pfutp_4_1, pfutp_4_2_c, pfutp_4_2_f, pfutp_4_2_h, pfutp_4_2_k]) as pid
    where pid is not null;
  end if;

  -- TRF-01: Trafiksol's core established IPO offer-document finding
  insert into scenario_findings (
    record_id, order_id, case_name, category, scenario_title, factual_pattern,
    noticee_actor_names, finding_status, final_paragraph_references, official_source_url,
    transaction_types, actor_roles, evidence_types, alleged_conduct, ingredients_not_established,
    source_document_verified, paragraph_citation_verified, finding_status_verified, provision_mapping_verified, noticee_mapping_verified
  ) values (
    'TRF-01',
    trafiksol_order_id,
    'In the matter of Initial Public Offer of Trafiksol ITS Technologies Ltd.',
    'Corporate disclosure',
    'IPO offer documents overstated pre-issue revenue via circular related-party billing and misrepresented customer/supplier concentration and objects-of-issue software valuation, inducing 345.65x oversubscription; a financial relationship with the sole Merchant Banker''s controlling shareholder''s father, creating a potential conflict of interest, was not disclosed in the DRHP',
    'TITL''s DRHP/RHP/Prospectus overstated FY2023-24 revenue and misrepresented the concentration/genuineness of its top customers and suppliers, creating a more favourable financial picture ahead of a 345.65x-oversubscribed SME-platform IPO that raised Rs.44.87 crore. Separately, TITL paid Rs.67 lakh to the father of the person who effectively controlled the sole Merchant Banker (Ekadrisht Capital) on the same date it paid Ekadrisht''s Rs.50 lakh merchant-banking fee; that financial exposure remained outstanding as of the DRHP filing date and was not disclosed. The order expressly declines to find the Section 4(2)(r) "planting of false news" allegation established, distinguishing false/misleading offer-document disclosure from news-planting, and separately declines to find the merchant-banker payment was illegal gratification.',
    ARRAY['Trafiksol ITS Technologies Limited'],
    'upheld',
    'Paras 93-98, 105 (Final Order dated Aug 28, 2026)',
    'https://www.sebi.gov.in/enforcement/orders/aug-2026/final-order-in-the-matter-of-ipo-of-trafiksol-its-technologies-limited_104109.html',
    ARRAY['revenue_recognition'],
    ARRAY['company'],
    ARRAY[]::text[],
    ARRAY['non_disclosure_of_information','false_business_or_corporate_announcement'],
    ARRAY['Regulation 4(2)(r) of the PFUTP Regulations (knowingly planting false/misleading news) was alleged but expressly found NOT established (para 98): the order distinguishes false/misleading disclosure IN the offer document from planting of news, which is a materially different act under the Regulation''s own text.'],
    true, true, true, true, true
  )
  on conflict (record_id) do nothing
  returning id into trf01_finding_id;

  if trf01_finding_id is not null then
    insert into finding_provisions (finding_id, provision_id, relationship, justifying_tags)
    select trf01_finding_id, pid, 'alleged', ARRAY[]::text[]
    from unnest(ARRAY[sebi_act_12a_a, sebi_act_12a_b, sebi_act_12a_c, pfutp_3_b, pfutp_3_c, pfutp_3_d, pfutp_4_1, pfutp_4_2_f, pfutp_4_2_k, pfutp_4_2_s, icdr_245_1]) as pid
    where pid is not null;
  end if;

  -- MFS-01: Max Financial Services -- every substantive allegation found
  -- NOT established; disposed of without direction or penalty. Zero
  -- finding_provisions rows is deliberate (no substantive provision was
  -- established), not an omission.
  insert into scenario_findings (
    record_id, order_id, case_name, category, scenario_title, factual_pattern,
    noticee_actor_names, finding_status, final_paragraph_references, official_source_url,
    transaction_types, actor_roles, evidence_types, alleged_conduct, ingredients_not_established, precedent_outcome_note,
    source_document_verified, paragraph_citation_verified, finding_status_verified, provision_mapping_verified, noticee_mapping_verified
  ) values (
    'MFS-01',
    max_order_id,
    'In the matter of Max Financial Services Limited',
    null,
    'SCN alleging a fraudulent scheme in MFSL''s sale of its Max Life Insurance stake to Axis Bank/Axis Capital/Axis Securities, and related non-disclosure, found NOT established on the merits; proceedings against all 12 Noticees disposed of without direction or penalty',
    'The SCN alleged that MFSL''s 2021 sale of equity stakes in Max Life Insurance Company to Axis Bank, Axis Capital and Axis Securities (structured, the SCN alleged, to circumvent IRDAI corporate-agency limits and cause MFSL a loss of Rs.3,911.95 crore for Axis Group''s benefit) was part of a fraudulent scheme, and that related Board discussions were not adequately disclosed to stock exchanges. On full inquiry the order finds the SCN did not establish injury from a wrongful act or blatant misconduct/attending circumstances cogently establishing wrongful intent (the Supreme Court''s PFUTP "fraud" test), and that the disclosure-related and other allegations were similarly not made out against MFSL, MLIC, the Axis entities, or the individual KMP noticees.',
    ARRAY['Max Financial Services Limited','Max Life Insurance Company Limited','Axis Bank Ltd','Axis Capital Ltd','Axis Securities Ltd'],
    'not_upheld',
    'Paras 183-187 (Final Order dated Aug 24, 2026)',
    'https://www.sebi.gov.in/enforcement/orders/aug-2026/order-in-the-matter-of-max-financial-services-limited_103935.html',
    ARRAY[]::text[],
    ARRAY['company'],
    ARRAY[]::text[],
    ARRAY[]::text[],
    ARRAY['Sections 12A(a),(b),(c) of the SEBI Act and Regulations 3(a)-(d), 4(1), 4(2)(c),(f),(h),(k) of the PFUTP Regulations were alleged against MFSL/MLIC/the Axis entities but found NOT established -- no injury from a wrongful act and no blatant misconduct/attending circumstances cogently establishing wrongful intent (paras 183-184).', 'Non-disclosure allegations concerning the Board''s discussion of the transactions were also found not established on the material on record.'],
    'Final order: proceedings against all 12 Noticees disposed of without issuance of any direction or imposition of any penalty (para 185) -- a full exoneration on the merits, not a settlement or a procedural closure.',
    true, true, true, true, true
  )
  on conflict (record_id) do nothing
  returning id into mfs01_finding_id;

  -- VCL-03: Varanium reconciliation -- the existing VCL-01/VCL-02 findings
  -- already correctly reflect final-stage disposition (finding_status =
  -- 'upheld', linked to the final order, not the earlier interim/
  -- confirmatory stage), so no correction is made to them. But the final
  -- order ALSO establishes a distinct IPO/Rights-Issue offer-document
  -- disclosure violation (para 111(v): misleading Objects-of-Issue
  -- quotation and non-disclosure of pending litigation in the Prospectus
  -- and Letter of Offer, violating ICDR Regulation 24(1)) and an incorrect
  -- Statement of Deviation regarding utilisation of IPO proceeds (para
  -- 111(ii), LODR Regulation 32(1),(4),(5)) that neither existing finding's
  -- factual_pattern covers (VCL-01 is scoped to the diversion/manufactured-
  -- revenue/trading-gains conduct; VCL-02 to investigation non-cooperation).
  -- This is an additive completeness correction, not a duplicate: it does
  -- not restate VCL-01's diversion facts or provisions.
  insert into scenario_findings (
    record_id, order_id, case_name, category, scenario_title, factual_pattern,
    noticee_actor_names, finding_status, final_paragraph_references, official_source_url,
    transaction_types, actor_roles, evidence_types, alleged_conduct,
    source_document_verified, paragraph_citation_verified, finding_status_verified, provision_mapping_verified, noticee_mapping_verified
  ) values (
    'VCL-03',
    varanium_order_id,
    'In the matter of Varanium Cloud Ltd',
    'Corporate disclosure',
    'Objects-of-Issue quotation in the Prospectus/Letter of Offer was misleading and pending litigation was not disclosed; a Statement of Deviation on utilisation of IPO proceeds was incorrectly filed',
    'Separately from the diversion of IPO/Rights Issue proceeds addressed in VCL-01, VCL''s Prospectus and Letter of Offer disclosed a misleading quotation under Objects of Issue and did not disclose pending litigation, and VCL filed an incorrect Statement of Deviation regarding utilisation of its IPO proceeds.',
    ARRAY['Varanium Cloud Ltd'],
    'upheld',
    'Para 111(ii), 111(v) (Final Order dated Aug 25, 2026)',
    'https://www.sebi.gov.in/enforcement/orders/aug-2026/final-order-in-respect-of-varanium-cloud-limited_104019.html',
    ARRAY['rights_issue'],
    ARRAY['company'],
    ARRAY[]::text[],
    ARRAY['non_disclosure_of_information','false_business_or_corporate_announcement'],
    true, true, true, true, true
  )
  on conflict (record_id) do nothing
  returning id into vcl03_finding_id;

  if vcl03_finding_id is not null then
    insert into finding_provisions (finding_id, provision_id, relationship, justifying_tags)
    select vcl03_finding_id, pid, 'alleged', ARRAY[]::text[]
    from unnest(ARRAY[icdr_24_1, lodr_32]) as pid
    where pid is not null;
  end if;
end $$;
