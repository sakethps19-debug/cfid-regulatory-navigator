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
      text: "Limb (i) has a selection for established injury, wrongful gain, or avoided loss. Per the verified text of Reliance v. SEBI para 175(i), where that injury is established, deceitful intent does not additionally need to be proved.",
    };
  }
  if (limb1PartialOnly) {
    return {
      tone: "borderline",
      text: "Only the dealing/inducement component of Limb (i) is selected. Per the verified text of para 175(i), the limb requires BOTH inducement to deal AND that it caused established injury, wrongful gain, or avoided loss -- dealing alone does not complete it. Mark the injury/gain/avoided-loss factor if it is separately established, or rely on Limb (ii) instead.",
    };
  }
  if (limb2Satisfied) {
    return {
      tone: limb2Count >= 2 ? "satisfied" : "borderline",
      text:
        limb2Count >= 2
          ? "Limb (ii), intent from attending circumstances, has multiple selections. Per Reliance v. SEBI para 175(ii), cogent circumstantial intent alone is enough; injury does not additionally need to be proved."
          : "Only one limb (ii) factor is selected. The Supreme Court treated intent as something to be inferred from the cumulative effect of several factors (Ketan Parekh para 20); a single factor alone may be a weak signal.",
    };
  }
  return {
    tone: "not-satisfied",
    text: "Neither limb has a supporting selection. Per Reliance v. SEBI, manipulation, cornering, or an accounting irregularity alone, without established injury/wrongful gain/avoided loss or cogent evidence of intent, does not by itself establish fraud under PFUTP Regulation 2(1)(c).",
  };
}
