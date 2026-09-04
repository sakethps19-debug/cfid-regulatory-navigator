-- Expand processing_stage with the honest intermediate stages the officer
-- asked for, so "no retrieval attempt made" is never conflated with
-- "retrieval attempted and failed". Purely additive — no existing value is
-- removed or renamed here (see 0008 for the data correction that actually
-- reclassifies the 86 orders currently mislabeled retrieval_failed).
alter type processing_stage add value if not exists 'awaiting_retrieval';
alter type processing_stage add value if not exists 'retrieval_attempted';
alter type processing_stage add value if not exists 'citations_checked';
