-- Correction pass on migration 0021 (Debock/Trafiksol/Max Financial
-- Services/Varanium). Three independent fixes, all additive/corrective,
-- none destructive:
--
-- 1. ICDR RE-VERIFICATION: ICDR-24-1 and ICDR-245-1 were verified against
--    SEBI's May-17-2024 consolidated ICDR text. SEBI has since published a
--    later consolidated text (last amended March 21, 2026). Re-verified
--    directly against that PDF: Regulation 24(1)'s and Regulation 245(1)'s
--    OWN operative sub-regulation-(1) text is WORD-FOR-WORD IDENTICAL
--    between the two consolidations ("The draft offer document and offer
--    document shall contain all material disclosures which are true and
--    adequate to enable the applicants to take an informed investment
--    decision." / "The offer document shall contain all material
--    disclosures which are true and adequate so as to enable the
--    applicants to take an informed investment decision."). The only diff
--    anywhere nearby is a footnote-marker/punctuation change in
--    245(2)(a) ("and" -> omitted, per a March-2025 amendment) -- a
--    sub-regulation this corpus does not cite. No new provision_versions
--    row is needed (no substantive text change to what is cited), matching
--    the migration-0018 precedent for LODR-6-1A (unchanged text: only
--    official_source_url updated). Both rows' official_source_url are
--    updated to the current official page so this corpus never rests on a
--    source merely because it was checked once.
--
-- 2. LODR REGULATION 32 GRANULARITY: migration 0021 mapped VCL-03 to the
--    bare umbrella id LODR-32, even though the Varanium final order (and
--    every one of its 5 separate noticee-liability passages, paras 89, 155,
--    241, 291, 4334-4336, 5162-5163, 5251-5252, 5360-5361) consistently
--    cites exactly "regulations 32(1), (4), (5)" together -- never bare
--    Regulation 32 alone (para 165, discussing Noticee 5's role, confirms
--    this: "regulation 32 of the LODR Regulations deals with Statement of
--    Deviation" is descriptive scene-setting, not an independent bare-32
--    citation). This violates the exact-provision-identity rule (instrument
--    + exact regulation + exact sub-clause = one legal identity). Adds
--    three new canonical rows -- LODR-32-1, LODR-32-4, LODR-32-5 -- each
--    verified against SEBI's current LODR consolidated text (last amended
--    July 14, 2026, already this corpus's source-of-record for LODR since
--    migration 0018): (1) the quarterly Statement of Deviation itself,
--    (4) the directors'-report variation explanation, (5) the annual
--    auditor-certified funds-utilisation statement. The legacy LODR-32 id
--    is left untouched (two pre-existing legacy findings, SSSL-04 and
--    SIL-01, still reference it -- changing or removing it would be
--    destructive to their citations) but is no longer used for this new
--    exact mapping. VCL-03's finding_provisions is corrected: its LODR-32
--    link is removed and replaced with LODR-32-1/32-4/32-5.
--
-- 3. MAX FINANCIAL SERVICES NEGATIVE PRECEDENT: migration 0021 recorded
--    MFS-01 with zero finding_provisions rows, reasoning that no provision
--    was POSITIVELY established. On reflection this collapses two distinct
--    facts into one: "provision considered and not upheld" is different
--    historical information from "no provision was ever at issue", and the
--    former must remain queryable so an officer researching e.g. PFUTP
--    Regulation 4(2)(r) can find Max Financial Services as a precedent
--    where that provision was examined on facts resembling theirs and
--    rejected. Adds finding_provisions rows with relationship='not_upheld'
--    (an existing, already-used value in this corpus's
--    finding_provisions.relationship check constraint alongside 'alleged'/
--    'applied'/'upheld' -- not a new value) for the SIX provisions the
--    order's own extended fraud-test analysis (paras 60-74, 100, 183-184)
--    substantively adjudicates and finds not established: SEBI-ACT-12A-b,
--    SEBI-ACT-12A-c, PFUTP-3-c, PFUTP-3-d, PFUTP-4-2-k, PFUTP-4-2-r (the
--    SCN's own core citation, para 8.6), plus LODR-30 (para 71: Tranche
--    III examined "under Regulation 30 read with Schedule III of the LODR
--    Regulations" and found the 2%-threshold not crossed). NOT recorded:
--    the erstwhile Listing Agreement clauses (22(d), 36(1)/(7), 41(IV)(k)/
--    (m)) cited in the SCN's pleading (para 8.6) -- a distinct, superseded
--    instrument this corpus does not model at all -- and the several
--    granular LODR 4(1)/(2)/33(1)(e)/18(3) sub-clauses the SCN's pleading
--    paragraph lists but which the order's own paragraph-by-paragraph
--    analysis (organised by TRANSACTION/TRANCHE, paras 60-74) never
--    individually re-cites with a clause-specific disposition. Recording
--    those would require inventing a precision the order itself does not
--    give at that granularity -- "unknown/null is preferable to an
--    invented value" -- and is flagged as an unresolved item for human
--    review rather than silently done partially. No relationship value on
--    these six/seven rows is 'applied' or 'upheld': the finding-provisions
--    join therefore can never surface MFS-01 as positive template support
--    for any provision, while it remains fully queryable as a negative
--    precedent (a provision genuinely alleged and examined, then rejected).
--
-- Purely additive/corrective: no existing row is deleted; no canonical_id
-- is renamed; no RLS/auth touched; SSSL-04/SIL-01's LODR-32 citations are
-- untouched; DBK-01/TRF-01/VCL-01/VCL-02's finding_provisions are untouched.
do $$
declare
  lodr_instrument_id uuid;
  icdr_24_1_id uuid;
  icdr_245_1_id uuid;
  lodr_32_1_id uuid;
  lodr_32_4_id uuid;
  lodr_32_5_id uuid;
  lodr_30_id uuid;
  vcl03_finding_id uuid;
  mfs01_finding_id uuid;
  sebi_act_12a_b uuid; sebi_act_12a_c uuid;
  pfutp_3_c uuid; pfutp_3_d uuid;
  pfutp_4_2_k uuid; pfutp_4_2_r uuid;
  current_icdr_source text := 'https://www.sebi.gov.in/legal/regulations/mar-2026/securities-and-exchange-board-of-india-issue-of-capital-and-disclosure-requirements-regulations-2018-last-amended-on-march-21-2026-_100581.html';
  current_lodr_source text := 'https://www.sebi.gov.in/legal/regulations/jul-2026/securities-and-exchange-board-of-india-listing-obligations-and-disclosure-requirements-regulations-2015-last-amended-on-july-14-2026-_102974.html';
begin
  -- 1. ICDR re-verification: text unchanged, only official_source_url bumped.
  update legal_provisions set official_source_url = current_icdr_source
  where canonical_id in ('ICDR-24-1', 'ICDR-245-1');

  -- 2. LODR Regulation 32 granularity.
  select id into lodr_instrument_id from legal_instruments where name = 'LODR Regulations, 2015';
  if lodr_instrument_id is null then
    raise exception 'LODR Regulations, 2015 instrument not found';
  end if;

  insert into legal_provisions (canonical_id, instrument_id, provision_number, subject, current_text_verification_status, official_source_url)
  values (
    'LODR-32-1',
    lodr_instrument_id,
    'Regulation 32(1)',
    'The listed entity shall submit to the stock exchange, on a quarterly basis for a public issue, rights issue, preferential issue etc., a statement (a) indicating deviations, if any, in the use of proceeds from the objects stated in the offer document or explanatory statement, and (b) indicating category-wise variation between projected and actual utilisation of funds.',
    'officially_verified',
    current_lodr_source
  ) on conflict (canonical_id) do nothing;

  insert into legal_provisions (canonical_id, instrument_id, provision_number, subject, current_text_verification_status, official_source_url)
  values (
    'LODR-32-4',
    lodr_instrument_id,
    'Regulation 32(4)',
    'The listed entity shall furnish an explanation for the variation specified in sub-regulation (1) in the directors'' report in the Annual Report.',
    'officially_verified',
    current_lodr_source
  ) on conflict (canonical_id) do nothing;

  insert into legal_provisions (canonical_id, instrument_id, provision_number, subject, current_text_verification_status, official_source_url)
  values (
    'LODR-32-5',
    lodr_instrument_id,
    'Regulation 32(5)',
    'The listed entity shall prepare an annual statement, certified by its statutory auditors, of funds utilised for purposes other than those stated in the offer document/prospectus/notice, and place it before the audit committee until the money raised through the issue has been fully utilised.',
    'officially_verified',
    current_lodr_source
  ) on conflict (canonical_id) do nothing;

  select id into icdr_24_1_id from legal_provisions where canonical_id = 'ICDR-24-1';
  select id into icdr_245_1_id from legal_provisions where canonical_id = 'ICDR-245-1';
  select id into lodr_32_1_id from legal_provisions where canonical_id = 'LODR-32-1';
  select id into lodr_32_4_id from legal_provisions where canonical_id = 'LODR-32-4';
  select id into lodr_32_5_id from legal_provisions where canonical_id = 'LODR-32-5';
  select id into lodr_30_id from legal_provisions where canonical_id = 'LODR-30';

  select id into vcl03_finding_id from scenario_findings where record_id = 'VCL-03';
  if vcl03_finding_id is null then
    raise exception 'VCL-03 not found -- expected migration 0021 to have run first';
  end if;

  delete from finding_provisions
  where finding_id = vcl03_finding_id
    and provision_id = (select id from legal_provisions where canonical_id = 'LODR-32');

  insert into finding_provisions (finding_id, provision_id, relationship, justifying_tags)
  select vcl03_finding_id, pid, 'alleged', ARRAY[]::text[]
  from unnest(ARRAY[icdr_24_1_id, lodr_32_1_id, lodr_32_4_id, lodr_32_5_id]) as pid
  where pid is not null
  on conflict do nothing;

  -- 3. Max Financial Services negative precedent.
  select id into mfs01_finding_id from scenario_findings where record_id = 'MFS-01';
  if mfs01_finding_id is null then
    raise exception 'MFS-01 not found -- expected migration 0021 to have run first';
  end if;

  select id into sebi_act_12a_b from legal_provisions where canonical_id = 'SEBI-ACT-12A-b';
  select id into sebi_act_12a_c from legal_provisions where canonical_id = 'SEBI-ACT-12A-c';
  select id into pfutp_3_c from legal_provisions where canonical_id = 'PFUTP-3-c';
  select id into pfutp_3_d from legal_provisions where canonical_id = 'PFUTP-3-d';
  select id into pfutp_4_2_k from legal_provisions where canonical_id = 'PFUTP-4-2-k';
  select id into pfutp_4_2_r from legal_provisions where canonical_id = 'PFUTP-4-2-r';

  insert into finding_provisions (finding_id, provision_id, relationship, justifying_tags)
  select mfs01_finding_id, pid, 'not_upheld', ARRAY[]::text[]
  from unnest(ARRAY[sebi_act_12a_b, sebi_act_12a_c, pfutp_3_c, pfutp_3_d, pfutp_4_2_k, pfutp_4_2_r, lodr_30_id]) as pid
  where pid is not null
  on conflict do nothing;
end $$;
