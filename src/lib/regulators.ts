// Groups legal_instruments.issuing_authority values into the two
// regulator families the Law Library browses by. "MCA (notified)" (Ind AS,
// notified by MCA under the Companies Act) groups under MCA — the notifying
// authority, not a third category — while still showing its own more
// specific label at the instrument level.
export type RegulatorSlug = "sebi" | "mca";

export const REGULATOR_LABELS: Record<RegulatorSlug, string> = {
  sebi: "SEBI",
  mca: "Ministry of Corporate Affairs (MCA)",
};

export function regulatorSlugForAuthority(issuingAuthority: string): RegulatorSlug {
  return issuingAuthority.startsWith("SEBI") ? "sebi" : "mca";
}

export function isRegulatorSlug(value: string): value is RegulatorSlug {
  return value === "sebi" || value === "mca";
}
