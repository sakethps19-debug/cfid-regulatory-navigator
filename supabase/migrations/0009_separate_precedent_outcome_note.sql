-- Correction: evidentiary_gaps was being used to hold two different kinds
-- of information — genuine outstanding evidence for a scenario, AND (for
-- findings whose allegation was itself fully upheld/resolved) a note
-- describing that precedent's own historical outcome ("None outstanding —
-- this allegation was resolved in the final order."). When the Scenario
-- Analyzer aggregates evidentiary_gaps across multiple findings sharing a
-- provision, this produced a mixed list where a precedent's resolution note
-- sat alongside another finding's genuine outstanding gap — conflating "the
-- cited precedent's own history" with "missing evidence for the user's
-- present scenario".
--
-- Fix: add a dedicated precedent_outcome_note column for the historical-
-- outcome note, and move the affected rows' text there, clearing
-- evidentiary_gaps for them to an empty array (they have no actual
-- outstanding gap). No text is invented — the exact existing sentence is
-- relocated to a correctly-scoped field, and every other row's genuine
-- evidentiary_gaps is left untouched.
alter table scenario_findings add column precedent_outcome_note text;

update scenario_findings
set precedent_outcome_note = 'None outstanding — this allegation was resolved in the final order.',
    evidentiary_gaps = '{}'
where evidentiary_gaps @> array['None outstanding — this allegation was resolved in the final order.'];
