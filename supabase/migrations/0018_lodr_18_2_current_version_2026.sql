-- Follow-up verification pass on migration 0017: the LODR consolidated
-- text used there ("last amended on July 10, 2024") is no longer SEBI's
-- current publication -- SEBI now publishes "last amended on July 14,
-- 2026" (sebi.gov.in/legal/regulations/jul-2026/...). Both LODR-18-2 and
-- LODR-6-1A were re-verified directly against that current PDF.
--
-- CORRECTION TO 0017's COMMENTS (no data was wrong, only a citation in
-- 0017's SQL comment block): 0017 said Regulation 6(1A) was "inserted by
-- the SEBI (LODR) (Second Amendment) Regulations, 2021, w.e.f. 5.5.2021".
-- That citation was misread from a neighbouring footnote (the one
-- attached to the "his[/her]" gender-neutral wording inserted in
-- Regulation 6's own heading, not to sub-regulation (1A)). Both the July
-- 2024 and July 2026 consolidated texts consistently show (1A)'s own
-- insertion footnote reading "Inserted by the Securities and Exchange
-- Board of India (Listing Obligations and Disclosure Requirements)
-- (Second Amendment) Regulations, 2023 w.e.f. 15.7.2023" -- i.e. w.e.f.
-- 15 July 2023, not 5 May 2021. This migration does not change any row
-- data for that reason (the row's `subject` text never asserted the
-- amendment year), it is recorded here only so the correct citation is
-- on file. Regulation 6(1A)'s operative text itself (the three-month
-- vacancy-filling requirement and the interim-appointment proviso) is
-- WORD-FOR-WORD IDENTICAL between the July 2024 and July 2026 editions --
-- no textual change, so no new provision_versions row is needed for it,
-- only the official_source_url bump below.
--
-- Regulation 18(2) DID change: the July 2026 text inserts two words into
-- sub-clause (a) -- "financial" (before "year") and "consecutive" (before
-- "meetings") -- via the SEBI (LODR) (Third Amendment) Regulations, 2024,
-- w.e.f. 13.12.2024 (i.e. after the July 10, 2024 consolidation this
-- corpus originally verified against, which still carried the
-- pre-amendment wording). The substantive requirement is unchanged in
-- effect (at least 4 meetings/year, no more than 120 days between two
-- meetings) -- "financial year" and "consecutive" are clarifying, not
-- expansive or contractive, amendments -- but the exact text differs, and
-- the amendment postdates the Seacoast Shipping Services Limited final
-- order's investigation period (FY2020-21 through Dec 31, 2023) that this
-- provision was verified against. To preserve temporal applicability for
-- that (and any other) older conduct without erasing the current text,
-- this migration adds TWO provision_versions rows for LODR-18-2 (pre- and
-- post-13.12.2024), rather than silently overwriting the row's `subject`
-- text with only the current wording. legal_provisions.subject itself is
-- left describing the substance of both sub-clause (a) (which has not
-- changed in requirement, only in the two qualifying words) and (b)/(c)
-- (unchanged), consistent with how this corpus already treats
-- legal_provisions.subject as a plain-English description rather than a
-- verbatim-text field -- verbatim text with its date range lives in
-- provision_versions.
--
-- Purely additive: no legal_provisions row is deleted; canonical_ids are
-- unchanged; only official_source_url is updated on the two existing
-- rows (to the current official source) and two new provision_versions
-- rows are inserted. No application code changes are required (Part A's
-- resolveFixedScenario reads only legal_provisions, not
-- provision_versions; Part B already has version-aware temporal display
-- via getProvisionVersionsByProvisionId).
do $$
declare
  lodr_18_2_id uuid;
  lodr_6_1a_id uuid;
  current_source text := 'https://www.sebi.gov.in/legal/regulations/jul-2026/securities-and-exchange-board-of-india-listing-obligations-and-disclosure-requirements-regulations-2015-last-amended-on-july-14-2026-_102974.html';
begin
  select id into lodr_18_2_id from legal_provisions where canonical_id = 'LODR-18-2';
  select id into lodr_6_1a_id from legal_provisions where canonical_id = 'LODR-6-1A';

  if lodr_18_2_id is null or lodr_6_1a_id is null then
    raise exception 'LODR-18-2 or LODR-6-1A not found -- expected migration 0017 to have run first';
  end if;

  update legal_provisions set official_source_url = current_source where id in (lodr_18_2_id, lodr_6_1a_id);

  insert into provision_versions (provision_id, version_label, effective_from, effective_to, exact_text, status, source_url, date_last_verified)
  values (
    lodr_18_2_id,
    'Text applicable before the SEBI (LODR) (Third Amendment) Regulations, 2024 (w.e.f. 13.12.2024) -- the version in force during the Seacoast Shipping Services Limited investigation period',
    null,
    '2024-12-12',
    '(2) The listed entity shall conduct the meetings of the audit committee in the following manner:
(a) The audit committee shall meet at least four times in a year and not more than one hundred and twenty days shall elapse between two meetings.
(b) The quorum for audit committee meeting shall either be two members or one third of the members of the audit committee, whichever is greater, with at least two independent directors.
(c) The audit committee shall have powers to investigate any activity within its terms of reference, seek information from any employee, obtain outside legal or other professional advice and secure attendance of outsiders with relevant expertise, if it considers necessary.',
    'officially_verified',
    'https://www.sebi.gov.in/legal/regulations/jul-2024/securities-and-exchange-board-of-india-listing-obligations-and-disclosure-requirements-regulations-2015-last-amended-on-july-10-2024-_84817.html',
    current_date
  )
  on conflict do nothing;

  insert into provision_versions (provision_id, version_label, effective_from, effective_to, exact_text, status, source_url, date_last_verified)
  values (
    lodr_18_2_id,
    'Current text (verified against official SEBI consolidated LODR Regulations, last amended July 14, 2026) -- sub-clause (a) now reads "financial year" / "consecutive meetings"',
    '2024-12-13',
    null,
    '(2) The listed entity shall conduct the meetings of the audit committee in the following manner:
(a) The audit committee shall meet at least four times in a financial year and not more than one hundred and twenty days shall elapse between two consecutive meetings.
(b) The quorum for audit committee meeting shall either be two members or one third of the members of the audit committee, whichever is greater, with at least two independent directors.
(c) The audit committee shall have powers to investigate any activity within its terms of reference, seek information from any employee, obtain outside legal or other professional advice and secure attendance of outsiders with relevant expertise, if it considers necessary.',
    'officially_verified',
    current_source,
    current_date
  )
  on conflict do nothing;
end $$;
