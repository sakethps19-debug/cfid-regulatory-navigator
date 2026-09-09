// Actor/noticee-applicability layer (deterministic-engine completion pass).
//
// SEBI Act Section 27's own retrieval rule (provision-retrieval-rules.ts)
// already gates on PERSON_IN_CHARGE_OF_COMPANY as part of its FACTUAL
// prerequisite (a substantive violation connected, in the same sentence, to
// a stated actor in such a role) — that mechanism is precise enough that it
// is left as-is here, not duplicated. This file extends the same underlying
// idea — a provision's own text runs to a specific kind of actor, not to
// whoever happens to be named anywhere in the matter — to the other
// provisions where actor identity plainly matters and an incompatible
// attribution would otherwise be possible: the Compliance Officer family,
// CEO/CFO certification, Audit Committee composition/role/chair duties, the
// independent-director eligibility definition, and the three Companies Act
// auditor-eligibility provisions added in this same pass.
//
// This is explicitly NOT a liability-determination engine (see the pass's
// own mandate): it never decides who IS liable, only whether the CANDIDATE
// itself should be presented as applicable, flagged as unverified, or
// withheld because the only actor(s) the scenario names are ones this
// provision's own text cannot run against. Where the scenario names no
// actor at all, the provision is still shown (never invented liability, but
// never silently hidden either) with a "requires verification" note — see
// checkActorApplicability in engine.ts.

import type { ConceptKind } from "./concept-tags";

export interface ActorApplicabilityRule {
  provisionId: string;
  /** Concept-tag ids of kind "actor" this provision's own obligation can
   * logically run against. */
  applicableActorTags: string[];
  /** Plain-language description of who this provision applies to, used in
   * both the "requires verification" and "incompatible" notes shown to the
   * officer — this is a retrieval-layer applicability check, never a final
   * liability determination. */
  actorDescription: string;
}

// "company" (the listed entity itself) is deliberately included on most
// entries below: nearly every one of these obligations can also run
// against the company as an entity (e.g. a failure to ensure a Compliance
// Officer is appointed is ultimately the company's own failure), so a
// scenario that names only "the company" as its actor should not be
// treated as incompatible.
export const PROVISION_ACTOR_RULES: ActorApplicabilityRule[] = [
  // ----- LODR Regulation 6 (Compliance Officer) -----
  {
    provisionId: "LODR-6-1",
    applicableActorTags: ["compliance_officer", "company"],
    actorDescription: "the Compliance Officer role itself (or the listed company's own duty to appoint one)",
  },
  {
    provisionId: "LODR-6-2-a",
    applicableActorTags: ["compliance_officer", "company"],
    actorDescription: "the Compliance Officer role itself (or the listed company's own duty)",
  },
  {
    provisionId: "LODR-6-2-b",
    applicableActorTags: ["compliance_officer", "company"],
    actorDescription: "the Compliance Officer role itself (or the listed company's own duty)",
  },
  {
    provisionId: "LODR-6-2-c",
    applicableActorTags: ["compliance_officer", "company"],
    actorDescription: "the Compliance Officer role itself (or the listed company's own duty)",
  },
  {
    provisionId: "LODR-6-2-gen",
    applicableActorTags: ["compliance_officer", "company"],
    actorDescription: "the Compliance Officer role itself (or the listed company's own duty)",
  },
  {
    provisionId: "LODR-6-gen",
    applicableActorTags: ["compliance_officer", "company"],
    actorDescription: "the Compliance Officer role itself (or the listed company's own duty to appoint one) — not a promoter, director or other officer merely because they are named elsewhere in the matter",
  },

  // ----- LODR Regulation 17(8) (CEO/CFO certification) -----
  // Regulation 17(8)'s own text requires certification by "the Chief
  // Executive Officer OR the Managing Director, AND the Chief Financial
  // Officer" — managing_director is deliberately included alongside ceo,
  // not merely "close enough": it is one of the two roles the provision's
  // own text names.
  {
    provisionId: "LODR-17-8",
    applicableActorTags: ["ceo", "managing_director", "cfo", "company"],
    actorDescription: "the CEO/Managing Director and CFO who sign the compliance certificate (or the listed company's own duty to obtain one) — not an allottee, related-party counterparty or a director who holds none of those roles",
  },

  // ----- LODR Regulation 18 (Audit Committee composition/role/chair) -----
  // "chairman" (the generic Chairman tag, not audit_committee_chairman
  // specifically) is deliberately included on all three Regulation 18
  // entries below: this corpus's vocabulary cannot reliably distinguish a
  // bare "chairman" mention that means the company's own Chairman from one
  // that means the Audit Committee's chairman in context (e.g. "its
  // chairman was not an independent director" said of the Audit
  // Committee) — a genuine, disclosed ambiguity; treating it as compatible
  // rather than incompatible is the more conservative choice, since an
  // incorrect "incompatible" block would silently withhold a genuinely
  // applicable Audit Committee candidate.
  {
    provisionId: "LODR-18-1-b",
    applicableActorTags: ["audit_committee_member", "audit_committee_chairman", "independent_director", "chairman", "company"],
    actorDescription: "Audit Committee membership/composition (an independent director sitting on, or eligible for, the Audit Committee) — not every director generally",
  },
  {
    provisionId: "LODR-18-1-d",
    applicableActorTags: ["audit_committee_chairman", "chairman", "independent_director", "company"],
    actorDescription: "the Audit Committee Chairperson specifically — not every Audit Committee member, and not a director who is not on the Audit Committee at all",
  },
  {
    provisionId: "LODR-18-3-schedule-II",
    applicableActorTags: ["audit_committee_member", "audit_committee_chairman", "independent_director", "chairman", "company"],
    actorDescription: "an Audit Committee member (or the committee/company collectively) — this obligation does not automatically attach to every director merely because they sit on the board",
  },

  // ----- LODR Regulation 16(1)(b) (independent-director eligibility) -----
  {
    provisionId: "LODR-16-1-b",
    applicableActorTags: ["independent_director", "company"],
    actorDescription: "the specific director whose independent-director status is in question (or the company's own duty to classify directors correctly)",
  },

  // ----- Companies Act auditor-eligibility provisions (this pass) -----
  {
    provisionId: "COMPANIES-ACT-139",
    applicableActorTags: ["statutory_auditor"],
    actorDescription: "the statutory auditor's own tenure — this is a personal eligibility requirement of the auditor, not of management or the board",
  },
  {
    provisionId: "COMPANIES-ACT-141-3-d",
    applicableActorTags: ["statutory_auditor"],
    actorDescription: "the statutory auditor's own financial position — a personal disqualification ground, not attributable to management",
  },
  {
    provisionId: "COMPANIES-ACT-141-3-e",
    applicableActorTags: ["statutory_auditor"],
    actorDescription: "the statutory auditor's own business relationships — a personal disqualification ground, not attributable to management",
  },
];

const ACTOR_RULES_BY_PROVISION_ID = new Map(PROVISION_ACTOR_RULES.map((r) => [r.provisionId, r]));

export function actorRuleForProvision(provisionId: string): ActorApplicabilityRule | undefined {
  return ACTOR_RULES_BY_PROVISION_ID.get(provisionId);
}

/** Concept kind used to detect which actor(s) a scenario names — kept here
 * so engine.ts filters on a single, obviously-named constant rather than a
 * bare string literal in two places. */
export const ACTOR_CONCEPT_KIND: ConceptKind = "actor";
