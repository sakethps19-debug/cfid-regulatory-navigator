// Fraud Doctrine Analyser checklist (src/app/(app)/fraud-test/FraudTestChecklist.tsx)
// decision logic (src/lib/fraudDoctrineTest.ts). Pre-demo remediation
// finding (P0): the checklist previously treated "dealt as a result of the
// conduct" (mere inducement) as, on its own, sufficient to satisfy Limb (i)
// of the fraud test under PFUTP Regulation 2(1)(c), citing Reliance
// Industries Ltd. & Ors. v. SEBI, 2026 INSC 585, para 175(i) for that
// proposition. The verified text of para 175(i) (quoted in full on
// src/app/(app)/fraud-test/page.tsx) states the test conjunctively:
// "inducement to deal in securities has caused the other person to be
// adversely affected and allowed the party accused of fraud to gain
// unlawful profits or avert ordinary losses" -- dealing alone, without
// established injury/wrongful gain/avoided loss, does not complete the
// limb. These tests cover every combination of the checklist's states to
// prove the corrected logic never lets bare dealing/inducement read as a
// satisfied Limb (i).
import { describe, expect, it } from "vitest";
import {
  attentionCount,
  evaluateFraudDoctrineTest,
  LIMB_1_FACTOR_IDS,
  LIMB_2_FACTOR_IDS,
  type FactorState,
} from "@/lib/fraudDoctrineTest";

function states(entries: [string, FactorState][]): Map<string, FactorState> {
  return new Map(entries);
}

describe("evaluateFraudDoctrineTest: Limb (i) is never satisfied by mere dealing/inducement alone", () => {
  it("l1-dealt alone ('dealt as a result of the conduct') never reads as satisfied -- the specific defect this pass corrects", () => {
    const result = evaluateFraudDoctrineTest(states([[LIMB_1_FACTOR_IDS.dealt, "present"]]));
    expect(result.tone).not.toBe("satisfied");
    expect(result.tone).toBe("borderline");
    expect(result.text).not.toMatch(/that alone is enough/i);
    expect(result.text).toMatch(/BOTH inducement to deal AND/);
  });

  it("l1-manipulation-established alone (Rakhi Trading presumed-inducement route) never reads as satisfied either -- it too supplies only the inducement half", () => {
    const result = evaluateFraudDoctrineTest(states([[LIMB_1_FACTOR_IDS.manipulationEstablished, "present"]]));
    expect(result.tone).toBe("borderline");
  });

  it("l1-dealt AND l1-manipulation-established together (both inducement-only routes) still never reach satisfied without injury/gain", () => {
    const result = evaluateFraudDoctrineTest(
      states([
        [LIMB_1_FACTOR_IDS.dealt, "present"],
        [LIMB_1_FACTOR_IDS.manipulationEstablished, "present"],
      ])
    );
    expect(result.tone).toBe("borderline");
  });

  it("l1-injury alone (established injury/wrongful gain/avoided loss) DOES satisfy Limb (i) on its own, correctly citing para 175(i)", () => {
    const result = evaluateFraudDoctrineTest(states([[LIMB_1_FACTOR_IDS.injury, "present"]]));
    expect(result.tone).toBe("satisfied");
    expect(result.text).toMatch(/para 175\(i\)/);
  });

  it("l1-dealt + l1-injury together reads as satisfied (the full conjunctive test is met)", () => {
    const result = evaluateFraudDoctrineTest(
      states([
        [LIMB_1_FACTOR_IDS.dealt, "present"],
        [LIMB_1_FACTOR_IDS.injury, "present"],
      ])
    );
    expect(result.tone).toBe("satisfied");
  });

  it("no factors selected at all reads as not-satisfied, never as satisfied or borderline", () => {
    const result = evaluateFraudDoctrineTest(new Map());
    expect(result.tone).toBe("not-satisfied");
  });
});

describe("evaluateFraudDoctrineTest: Limb (ii) cumulative-inference behavior is preserved", () => {
  it("a single Limb (ii) factor alone reads as borderline, never satisfied -- intent is a cumulative inference", () => {
    const result = evaluateFraudDoctrineTest(states([[LIMB_2_FACTOR_IDS[0], "present"]]));
    expect(result.tone).toBe("borderline");
  });

  it("two or more Limb (ii) factors together read as satisfied", () => {
    const result = evaluateFraudDoctrineTest(
      states([
        [LIMB_2_FACTOR_IDS[0], "present"],
        [LIMB_2_FACTOR_IDS[1], "present"],
      ])
    );
    expect(result.tone).toBe("satisfied");
  });

  it("all six Limb (ii) factors present reads as satisfied", () => {
    const result = evaluateFraudDoctrineTest(states(LIMB_2_FACTOR_IDS.map((id): [string, FactorState] => [id, "present"])));
    expect(result.tone).toBe("satisfied");
  });
});

describe("evaluateFraudDoctrineTest: Limb (i) satisfied + Limb (ii) satisfied together", () => {
  it("both limbs independently satisfied reads as satisfied, describing both, never double-counting as a stronger conclusion", () => {
    const result = evaluateFraudDoctrineTest(
      states([
        [LIMB_1_FACTOR_IDS.injury, "present"],
        [LIMB_2_FACTOR_IDS[0], "present"],
        [LIMB_2_FACTOR_IDS[1], "present"],
      ])
    );
    expect(result.tone).toBe("satisfied");
    expect(result.text).toMatch(/both have supporting selections/);
  });

  it("Limb (i) fully satisfied takes priority display over an unrelated single Limb (ii) factor (which alone would only be borderline)", () => {
    const result = evaluateFraudDoctrineTest(
      states([
        [LIMB_1_FACTOR_IDS.injury, "present"],
        [LIMB_2_FACTOR_IDS[0], "present"],
      ])
    );
    expect(result.tone).toBe("satisfied");
  });
});

describe("evaluateFraudDoctrineTest: Unclear / Requires verification / Additional evidence required never count as Present", () => {
  const nonPresentStates: FactorState[] = ["unclear", "requires-verification", "additional-evidence-required", "not-stated"];

  it.each(nonPresentStates)("l1-injury marked '%s' does not satisfy Limb (i)", (state) => {
    const result = evaluateFraudDoctrineTest(states([[LIMB_1_FACTOR_IDS.injury, state]]));
    expect(result.tone).not.toBe("satisfied");
  });

  it.each(nonPresentStates)("a Limb (ii) factor marked '%s' does not count toward Limb (ii) satisfaction", (state) => {
    const result = evaluateFraudDoctrineTest(
      states([
        [LIMB_2_FACTOR_IDS[0], state],
        [LIMB_2_FACTOR_IDS[1], "present"],
      ])
    );
    // Only one factor is genuinely "present" -- must read as borderline, not satisfied.
    expect(result.tone).toBe("borderline");
  });

  it("factors marked unclear/requires-verification/additional-evidence-required are counted by attentionCount, never silently dropped", () => {
    const count = attentionCount(
      states([
        [LIMB_1_FACTOR_IDS.dealt, "unclear"],
        [LIMB_1_FACTOR_IDS.injury, "requires-verification"],
        [LIMB_2_FACTOR_IDS[0], "additional-evidence-required"],
        [LIMB_2_FACTOR_IDS[1], "present"],
        [LIMB_2_FACTOR_IDS[2], "not-stated"],
      ])
    );
    expect(count).toBe(3);
  });

  it("attentionCount is zero when nothing is flagged", () => {
    expect(attentionCount(new Map())).toBe(0);
    expect(attentionCount(states([[LIMB_1_FACTOR_IDS.injury, "present"]]))).toBe(0);
  });
});

describe("evaluateFraudDoctrineTest: output never issues a bare legal conclusion", () => {
  it("every tone's text describes selections/elements, never states a violation or fraud finding", () => {
    const allCombinations: Map<string, FactorState>[] = [
      new Map(),
      states([[LIMB_1_FACTOR_IDS.dealt, "present"]]),
      states([[LIMB_1_FACTOR_IDS.injury, "present"]]),
      states([[LIMB_2_FACTOR_IDS[0], "present"]]),
      states([
        [LIMB_2_FACTOR_IDS[0], "present"],
        [LIMB_2_FACTOR_IDS[1], "present"],
      ]),
    ];
    for (const s of allCombinations) {
      const result = evaluateFraudDoctrineTest(s);
      expect(result.text.toLowerCase()).not.toMatch(/fraud (is|was) established/);
      expect(result.text.toLowerCase()).not.toMatch(/violation established/);
    }
  });
});
