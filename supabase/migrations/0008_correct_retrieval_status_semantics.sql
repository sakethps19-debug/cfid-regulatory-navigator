-- Correction: "retrieval_failed" was being applied to 86 orders based only
-- on a single, general environment connectivity test (sebi.gov.in
-- unreachable from this development sandbox) — never a genuine, individually
-- attempted-and-recorded retrieval for each of those 86 specific orders.
-- "retrieval_failed" implies a real, timestamped attempt occurred and
-- failed; that was never true for these rows, so this was an overclaim.
-- Corrected to awaiting_retrieval: indexed, CFID-tag confirmed, official
-- URL on file, but retrieval genuinely not yet attempted for this specific
-- order. cfid_verified / cfid_verification_basis / official_url are all
-- untouched — only the processing/retrieval state is corrected.
update orders
set processing_stage = 'awaiting_retrieval',
    retrieval_status = 'not_attempted',
    retrieval_failure_reason = null
where processing_stage = 'retrieval_failed';

update validation_issues
set issue_type = 'awaiting_retrieval',
    severity = 'info',
    description = 'Retrieval has not yet been attempted for this specific order. Bulk retrieval is currently on hold pending scope confirmation; separately, a general connectivity test confirmed sebi.gov.in is unreachable from this development environment, so retrieval could not be attempted here even if it were in scope. No per-order retrieval attempt has been made or logged for this order — this is not a recorded retrieval failure.'
where issue_type = 'retrieval_failed';

insert into processing_runs (run_type, finished_at, orders_processed, successes, failures, summary)
values (
  'processing_status_correction',
  now(),
  86,
  86,
  0,
  'Corrected 86 orders (and their matching validation_issues rows) from processing_stage=retrieval_failed to awaiting_retrieval. These orders were never individually retrieval-attempted — the prior status reflected only a single general network-reachability test against sebi.gov.in, not a per-order attempt with a recorded timestamp. retrieval_status reset to not_attempted and retrieval_failure_reason cleared for these rows. No order-identity, CFID-verification, or official_url field was changed by this correction.'
);
