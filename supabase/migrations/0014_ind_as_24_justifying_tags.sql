-- Reviewer-reported bug (DC/CGM): a bare "fictitious sale" / "fund diversion"
-- query surfaced Ind AS 24 (Related Party Disclosures), a provision that has
-- nothing to do with either unless the finding also alleges a related-party
-- angle. Same root cause and fix as LODR-6/LODR-18/LODR-17(8): none of the
-- 4 findings currently linked to IND-AS-24 (FRL-01, REL-02, REL-05, SSSL-05)
-- involve fictitious sales; REL-05 bundles fund_diversion together with
-- related_party_misrepresentation in one finding, so the flat link let ANY
-- of its tags (not just the related-party one) surface Ind AS 24.
update finding_provisions fp
set justifying_tags = array['related_party_transaction','related_party_misrepresentation']
from legal_provisions lp
where fp.provision_id = lp.id
  and lp.canonical_id = 'IND-AS-24';
