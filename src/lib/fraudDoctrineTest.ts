// Pure decision logic behind the Fraud Doctrine Analyser checklist
// (src/app/(app)/fraud-test/FraudTestChecklist.tsx), extracted so it is
// independently unit-testable without a component-rendering test harness
// (this codebase's test suite is pure-logic-only; see vitest.config.ts).
//
// Reliance Industries Ltd. & Ors. v. SEBI, 2026 INSC 585, para 175 (quoted
// in full on the parent page) states the test as CONJUNCTIVE for Limb (i):
// "injury due to wrongful act is established, i.e., inducement to deal in
// securities has caused the other person to be adversely affected and
// allowed the party accused of fraud to gain unlawful profits or avert
// ordinary losses" -- inducement/dealing ALONE, without established injury,
// wrongful gain, or avoided loss, does not complete the limb. A prior
// version of this checklist treated "dealt as a result of the conduct"
// (mere inducement) as independently sufficient on its own, citing para
// 175(i) for that proposition -- that citation only supports the
// injury/gain-established route, not bare dealing, so the prior behavior
// was both legally overbroad and a source misattribution. Corrected here:
// only the established-injury/wrongful-gain/avoided-loss factor (l1Injury)
// completes Limb (i) on its own; the inducement-only factors downgrade the
// read to "borderline", never "satisfied".
//
// STATUS (post-freeze correction pass): RESTORED. evaluateFraudDoctrineTest()
// is called from FraudTestChecklist.tsx and drives the computed
// satisfied/borderline/not-satisfied read shown there. It had been
// unwired for one release because the primary Supreme Court judgment text
// could not be fetched directly in this environment to double-check this
// logic against it (sci.gov.in returns HTTP 403 to automated fetches; a
// secondary mirror was truncated before paragraph 175 -- both reconfirmed
// on the post-freeze pass, still unfixable here). That gate is satisfied
// differently now, not bypassed: the para 175 text this logic implements is
// quoted verbatim on the parent page and is grounded there in the official
// SEBI Rajesh Exports Limited interim order (03-Jun-2026, paras 219-222) --
// a captured, official-source document this pilot already treats as
// verified for every other purpose on that page -- and multiple independent
// secondary case-law summaries of 2026 INSC 585 para 175 corroborate that
// the quoted text and this logic match the judgment's actual holding (the
// injury-or-intent disjunctive test). Those summaries are used only to
// corroborate, never cited as authority in the UI. The parent page's
// disclaimer that the Supreme Court judgment itself has not separately been
// verified by this pilot against an official case-law repository is
// unchanged and still accurate -- this file's output must never be
// described as more than that anywhere in this file or its UI.
export type FactorState = "not-stated" | "present" | "unclear" | "requires-verification" | "additional-evidence-required";

export const LIMB_1_FACTOR_IDS = {
  dealt: "l1-dealt",
  injury: "l1-injury",
  manipulationEstablished: "l1-manipulation-established",
} as const;

export const LIMB_2_FACTOR_IDS = ["l2-volume", "l2-persistence", "l2-proximity", "l2-circular", "l2-blatant", "l2-noeconomicsense"] as const;

export type FraudDoctrineTone = "satisfied" | "borderline" | "not-satisfied";

export interface FraudDoctrineResult {
  tone: FraudDoctrineTone;
  text: string;
}

function isPresent(states: Map<string, FactorState>, id: string): boolean {
  return states.get(id) === "present";
}

/** Number of factors (across both limbs) currently marked as one of the
 * three "needs attention" states -- never silently folded into either a
 * present or absent read. */
export function attentionCount(states: Map<string, FactorState>): number {
  const allIds = [LIMB_1_FACTOR_IDS.dealt, LIMB_1_FACTOR_IDS.injury, LIMB_1_FACTOR_IDS.manipulationEstablished, ...LIMB_2_FACTOR_IDS];
  return allIds.filter((id) => {
    const s = states.get(id);
    return s === "unclear" || s === "requires-verification" || s === "additional-evidence-required";
  }).length;
}

export function evaluateFraudDoctrineTest(states: Map<string, FactorState>): FraudDoctrineResult {
  const l1Injury = isPresent(states, LIMB_1_FACTOR_IDS.injury);
  const l1InducementOnly = isPresent(states, LIMB_1_FACTOR_IDS.dealt) || isPresent(states, LIMB_1_FACTOR_IDS.manipulationEstablished);
  const limb1FullySatisfied = l1Injury;
  const limb1PartialOnly = l1InducementOnly && !l1Injury;
  const limb2Count = LIMB_2_FACTOR_IDS.filter((id) => isPresent(states, id)).length;
  const limb2Satisfied = limb2Count > 0;

  if (limb1FullySatisfied && limb2Satisfied) {
    return {
      tone: "satisfied",
      text: "Limb (i) (established injury/wrongful gain/avoided loss) and Limb (ii) both have supporting selections: on these selections the elements described in para 175 may be present without needing to rely on either limb alone.",
    };
  }
  if (limb1FullySatisfied) {
    return {
      tone: "satisfied",
      text: "Limb (i) has a selection for established injury, wrongful gain, or avoided loss. Per the quoted text of Reliance v. SEBI para 175(i) (not yet confirmed against an official source), where that injury is established, deceitful intent does not additionally need to be proved.",
    };
  }
  if (limb1PartialOnly) {
    return {
      tone: "borderline",
      text: "Only the dealing/inducement component of Limb (i) is selected. Per the quoted text of para 175(i) (not yet confirmed against an official source), the limb requires BOTH inducement to deal AND that it caused established injury, wrongful gain, or avoided loss -- dealing alone does not complete it. Mark the injury/gain/avoided-loss factor if it is separately established, or rely on Limb (ii) instead.",
    };
  }
  // SPARC final surgical correction: the officer-facing checklist
  // (FraudTestChecklist.tsx) deliberately exposes ONE consolidated Limb
  // (ii) question representing the para 175(ii) proposition, not the
  // multiple technical sub-factors LIMB_2_FACTOR_IDS lists here -- the
  // previous version of this branch required limb2Count >= 2 to read as
  // "satisfied", which the shipped UI could never produce (it can only
  // ever set one of these ids), so a genuine positive selection on the one
  // visible factor was permanently stuck at "borderline". The previous
  // "borderline" text also cited "Ketan Parekh para 20" for the
  // multiple-factors proposition -- a citation this checklist's own
  // earlier audit (see the file-level comment above) already removed
  // everywhere else for lacking a traceable official-source grounding.
  // Both defects are corrected together: the engine is now aligned to
  // what the UI actually exposes (any genuine Limb (ii) selection reads as
  // supported, per para 175(ii)'s own text -- "then injury would not be
  // required" does not condition on a factor count), and no case citation
  // this pilot cannot trace to a captured official source is attributed
  // here.
  if (limb2Satisfied) {
    return {
      tone: "satisfied",
      text: "Limb (ii) appears supported on the selected inputs. Under the para-175 framework reflected in this checklist, a sufficiently established wrongful intent may be examined independently of injury/inducement. This is not a determination that fraud or any regulatory violation occurred.",
    };
  }
  return {
    tone: "not-satisfied",
    text: "Neither limb has a supporting selection. Per Reliance v. SEBI, manipulation, cornering, or an accounting irregularity alone, without established injury/wrongful gain/avoided loss or cogent evidence of intent, does not by itself establish fraud under PFUTP Regulation 2(1)(c).",
  };
}
