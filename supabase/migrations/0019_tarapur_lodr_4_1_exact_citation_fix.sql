-- Legal data-integrity correction (officer walkthrough, exact-provision-citation
-- audit): finding_provisions row c4de2585.../23ba3f3e-9fce-436e-ab7e-11a7e6ecd34b
-- linked TTL-01 (Tarapur Transformers Limited) to bare canonical_id "LODR-4-1"
-- (Regulation 4(1) of the LODR Regulations, 2015, with no sub-clause), causing
-- TTL-01 to appear in the case list for the PARENT provision's Law Library page
-- even though the order never cites bare Regulation 4(1) of the LODR
-- Regulations.
--
-- Evidence: TTL-01's own curated allegation_text already said "LODR Regulations,
-- 2015 governance/disclosure provisions (Regulation 4(1) sub-clauses, ...)" --
-- i.e. the finding's own record flagged that only sub-clauses were cited, not
-- the bare regulation, but the finding_provisions link was never corrected to
-- match. Verified directly against the official order (SEBI, Order in the
-- matter of Tarapur Transformers Limited, Aug 2026,
-- https://www.sebi.gov.in/enforcement/orders/aug-2026/order-in-the-matter-of-tarapur-transformers-limited-_104152.html):
-- every citation of LODR Regulation 4(1) in the order text names specific
-- lettered sub-clauses -- (a), (b), (c), (e), (g), (h), (j) -- and bare
-- "Regulation 4(1)" never appears as an LODR citation anywhere in the order
-- (the only bare "Regulation 4(1)" references in the order are to PFUTP
-- Regulation 4(1), a different instrument, in a general legal-principles
-- discussion, not a citation of the LODR Regulations).
--
-- Root cause: a single mis-scoped data-entry link (this order's own workbook
-- transcription recorded the parent regulation number rather than the actual
-- lettered sub-clauses the order cites) -- not a defect in the Law Library
-- query logic itself (confirmed separately: the provision page's case-count
-- query is an exact finding_provisions.provision_id FK join, with no
-- prefix/hierarchy inference anywhere), and not a systemic pattern (a
-- corpus-wide audit for any OTHER finding carrying both a parent LODR/PFUTP
-- provision and one of its own lettered children found none).
--
-- Affected records: exactly 1 finding_provisions row is corrected in place to
-- point to LODR-4-1-a (preserving its original row id/relationship/
-- justifying_tags), and 6 new finding_provisions rows are added for the
-- remaining sub-clauses TTL-01's own allegation actually cites --
-- LODR-4-1-b, LODR-4-1-c, LODR-4-1-e, LODR-4-1-g, LODR-4-1-h, LODR-4-1-j --
-- each carrying the same relationship ("alleged") and justifying_tags ([])
-- as the row being corrected, since this is a citation-identity correction,
-- not a re-classification of the underlying finding.
--
-- A separate, deeper citation-granularity question was noticed during this
-- audit but is NOT corrected here, for lack of equally clear-cut evidence:
-- the same order also cites LODR Regulation 4(2)(f)(i)(2), 4(2)(f)(ii)(2),
-- 4(2)(f)(ii)(6), 4(2)(f)(ii)(7), 4(2)(f)(iii)(6) and 4(2)(f)(iii)(7) --
-- fourth-level sub-clauses, in a table entry attributing liability to a named
-- director "read with Section 27" -- one level deeper than this corpus
-- currently models (LODR-4-2-f-i/ii/iii exist; their own numbered
-- sub-sub-clauses do not). TTL-01's finding_provisions currently links only
-- the bare LODR-4-2-f id, unchanged by this migration. Whether that bare
-- link is itself accurate for TTL's own (as opposed to the individual
-- director's Section-27-attributed) obligations requires further reading of
-- the order beyond this pass's scope, and is flagged for separate review
-- rather than guessed at here.
update finding_provisions
set provision_id = (select id from legal_provisions where canonical_id = 'LODR-4-1-a')
where id = '23ba3f3e-9fce-436e-ab7e-11a7e6ecd34b';

insert into finding_provisions (finding_id, provision_id, relationship, justifying_tags)
select 'dcfcbdc8-9dcc-4f14-867c-f0862ddf4e45', lp.id, 'alleged', '{}'::text[]
from legal_provisions lp
where lp.canonical_id in ('LODR-4-1-b', 'LODR-4-1-c', 'LODR-4-1-e', 'LODR-4-1-g', 'LODR-4-1-h', 'LODR-4-1-j')
on conflict do nothing;
