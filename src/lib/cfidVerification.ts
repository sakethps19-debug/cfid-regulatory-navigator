// Display text for CFID verification status, driven by cfidVerificationBasis
// — never by cfidVerified alone. cfidVerified only ever records one narrow
// fact (does the order's own identifier/number contain a "CFID" tag); an
// order can be genuinely CFID-verified through other means entirely (the
// official order's own contents, a verified CFID parent matter, or
// confirmation by an authorised CFID officer) even when that tag is absent.
// Equating "verified" with "tag present" would misrepresent exactly the
// adjudication-order case this field exists to handle.
import type { CfidVerificationBasis } from "@/types/domain";

export const CFID_VERIFICATION_DISPLAY_TEXT: Record<CfidVerificationBasis, string> = {
  cfid_tag_in_order_number: 'Verified — CFID identifier appears in the order number',
  cfid_origin_established_from_official_order: "Verified — CFID origin established from the official order",
  related_to_verified_cfid_parent_matter: "Verified — linked to a verified CFID parent matter",
  confirmed_by_authorised_cfid_officer: "Verified — confirmed by an authorised CFID officer",
  needs_manual_verification: "CFID status requires manual verification",
  not_cfid: "Confirmed as not pertaining to CFID",
};

export function cfidVerificationDisplayText(basis: CfidVerificationBasis): string {
  return CFID_VERIFICATION_DISPLAY_TEXT[basis];
}
