-- Corpus-completeness correction (Scenario Analyzer redesign, post-merge
-- review of ae8e33c): adds two LODR Regulations, 2015 provisions that the
-- Seacoast Shipping Services Limited final order's Table 52 conclusion
-- table (paras 238-239) expressly relies on but which had no canonical
-- legal_provisions row -- a corpus completeness defect, not a reason to
-- omit a legally applicable provision from the Fixed Scenario Analysis
-- taxonomy.
--
-- Table 52 row 10 ("Failure to convene the AC meetings", upheld against
-- Noticee Nos. 1, 2 and 3): "...Regulation 4(1)(c), 18(2) and 23(2) of the
-- LODR Regulations read with section 27 of the SEBI Act." -- Regulation
-- 18(2) of the LODR Regulations, 2015 (official consolidated text,
-- amended-on-July-10-2024 edition, verified directly against SEBI's PDF at
-- the officialSourceUrl below) is itself an umbrella clause ("The listed
-- entity shall conduct the meetings of the audit committee in the
-- following manner:") with three lettered sub-clauses; the substantive
-- duty a "failure to convene meetings" finding actually invokes is
-- sub-clause (a) (meet at least four times a year, no more than 120 days
-- between meetings). Consistent with how this corpus already models
-- LODR-18-3-schedule-II (Regulation 18(3), itself also a bare
-- cross-reference to Schedule II, modelled as one id whose subject
-- documents the real operative content rather than the empty umbrella
-- text) -- this migration adds ONE row, id LODR-18-2, whose
-- provision_number preserves the order's own exact citation ("Regulation
-- 18(2)") for source fidelity, while its subject documents the sub-clause
-- (a)/(b)/(c) structure and identifies which sub-clause the bare citation
-- actually invokes for a meeting-frequency violation. This is a
-- deliberate single-id modelling choice, not an omission of the
-- sub-clause distinction and not a duplicate "18(2)(a)" id alongside it.
--
-- Table 52 row 11 ("Failure to fill the vacancy of compliance officer in
-- due time and improperly appointed non-Company Secretary as compliance
-- officer", upheld against Noticee Nos. 1, 2 and 3): "Regulation 6(1),
-- 6(1A) ... of the LODR Regulations read with section 27 of the SEBI
-- Act." Regulation 6(1A) (inserted by the SEBI (LODR) (Second Amendment)
-- Regulations, 2021, w.e.f. 5.5.2021, and unchanged through the
-- amended-on-July-10-2024 consolidated text) is a self-contained
-- sub-regulation with no internal lettered structure, so it is added
-- directly as its own row, LODR-6-1A.
--
-- Both rows use current_text_verification_status = 'officially_verified'
-- because the exact regulation text was read directly from SEBI's own
-- consolidated LODR Regulations PDF (not merely order-cited text), with
-- official_source_url pointing to that same official page. Purely
-- additive: no existing row is modified, renamed or removed; no
-- application code changes are required by this migration (the
-- application resolves fixed-scenario provisions by canonical_id lookup
-- against whatever is live in legal_provisions).
do $$
declare
  lodr_instrument_id uuid;
begin
  select id into lodr_instrument_id from legal_instruments where name = 'LODR Regulations, 2015';

  if lodr_instrument_id is null then
    raise exception 'LODR Regulations, 2015 instrument not found -- cannot add Regulation 18(2)/6(1A) provisions';
  end if;

  insert into legal_provisions (canonical_id, instrument_id, provision_number, subject, current_text_verification_status, official_source_url)
  values (
    'LODR-18-2',
    lodr_instrument_id,
    'Regulation 18(2)',
    'The Audit Committee shall conduct its meetings as follows: (a) it shall meet at least four times a year, with not more than one hundred and twenty days elapsing between two meetings; (b) the quorum shall be two members or one-third of the Committee''s members, whichever is greater, including at least two independent directors; (c) the Committee has power to investigate any activity within its terms of reference, seek information, and obtain outside professional advice. A "failure to convene Audit Committee meetings" finding citing bare Regulation 18(2) (as in the Seacoast Shipping Services Limited final order, Table 52 row 10) invokes the meeting-frequency requirement in sub-clause (a).',
    'officially_verified',
    'https://www.sebi.gov.in/legal/regulations/jul-2024/securities-and-exchange-board-of-india-listing-obligations-and-disclosure-requirements-regulations-2015-last-amended-on-july-10-2024-_84817.html'
  )
  on conflict (canonical_id) do nothing;

  insert into legal_provisions (canonical_id, instrument_id, provision_number, subject, current_text_verification_status, official_source_url)
  values (
    'LODR-6-1A',
    lodr_instrument_id,
    'Regulation 6(1A)',
    'Any vacancy in the office of the Compliance Officer shall be filled by the listed entity at the earliest, and in any case not later than three months from the date of such vacancy. The listed entity shall not fill such vacancy by appointing a person in an interim capacity unless that appointment is made in accordance with the laws applicable to a fresh appointment to that office, with the obligations under such laws made applicable to that person.',
    'officially_verified',
    'https://www.sebi.gov.in/legal/regulations/jul-2024/securities-and-exchange-board-of-india-listing-obligations-and-disclosure-requirements-regulations-2015-last-amended-on-july-10-2024-_84817.html'
  )
  on conflict (canonical_id) do nothing;
end $$;
