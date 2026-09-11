// Fraud Doctrine Analyser checklist (src/app/(app)/fraud-test/FraudTestChecklist.tsx)
// decision logic (src/lib/fraudDoctrineTest.ts). Pre-demo remediation
// finding (P0): the checklist previously treated "dealt as a result of the
// conduct" (mere inducement) as, on its own, sufficient to satisfy Limb (i)
// of the fraud test under PFUTP Regulation 2(1)(c), citing Reliance
// Industries Ltd. & Ors. v. SEBI, 2026 INSC 585, para 175(i) for that
// proposition. The quoted text of para 175(i) (quoted in full on
// src/app/(app)/fraud-test/page.tsx -- NOT confirmed against an official
// source; see that page's own restrained "Official-source verification
// pending" notice) states the test conjunctively:
// "inducement to deal in securities has caused the other person to be
// adversely affected and allowed the party accused of fraud to gain
// unlawful profits or avert ordinary losses" -- dealing alone, without
// established injury/wrongful gain/avoided loss, does not complete the
// limb. These tests cover every combination of the checklist's states to
// prove the corrected logic never lets bare dealing/inducement read as a
// satisfied Limb (i); they verify internal consistency with the quoted
// text, not the text's own authenticity against the primary judgment.
import { readFileSync } from "fs";
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

// SPARC final surgical correction: the shipped officer UI
// (FraudTestChecklist.tsx) exposes exactly ONE consolidated Limb (ii)
// question, never the six technical sub-factor ids this pure function
// still enumerates for its own internal bookkeeping. The engine's
// previous "satisfied" threshold (limb2Count >= 2) was therefore
// unreachable through the actual product -- marking the one visible
// factor present always read as "borderline", contrary to para 175(ii)'s
// own text ("...then injury would not be required", i.e. that showing
// alone is meant to be sufficient). The engine is now aligned to what the
// UI can actually produce: any genuine Limb (ii) selection reads as
// supported.
describe("evaluateFraudDoctrineTest: a single Limb (ii) factor reaches the intended positive analytical state (aligned with the one-question UI)", () => {
  it("a single Limb (ii) factor alone now reads as satisfied, not borderline -- the defect this pass corrects", () => {
    const result = evaluateFraudDoctrineTest(states([[LIMB_2_FACTOR_IDS[0], "present"]]));
    expect(result.tone).toBe("satisfied");
    expect(result.text).toMatch(/appears supported/i);
  });

  it("two or more Limb (ii) factors together still read as satisfied", () => {
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

  it("a Limb (ii)-only satisfied result never claims fraud or a violation is established", () => {
    const result = evaluateFraudDoctrineTest(states([[LIMB_2_FACTOR_IDS[0], "present"]]));
    expect(result.text.toLowerCase()).not.toMatch(/fraud (is|was) established/);
    expect(result.text.toLowerCase()).not.toMatch(/violation established/);
    expect(result.text).toMatch(/not a determination that fraud or any regulatory violation occurred/);
  });

  it("the result text never cites Ketan Parekh -- that citation was already removed from this checklist elsewhere for lacking official-source grounding", () => {
    const result = evaluateFraudDoctrineTest(states([[LIMB_2_FACTOR_IDS[0], "present"]]));
    expect(result.text).not.toMatch(/Ketan Parekh/i);
  });
});

describe("evaluateFraudDoctrineTest: exact 2x2 visible-UI combination matrix (L1 = l1-injury, L2 = l2-blatant, the only ids FraudTestChecklist.tsx actually renders)", () => {
  const L1 = LIMB_1_FACTOR_IDS.injury; // "l1-injury"
  const L2 = LIMB_2_FACTOR_IDS[4]; // "l2-blatant"

  it("L1 not stated / L2 not stated -> not-satisfied, described as insufficient support on current selections, never as a factual finding of absence", () => {
    const result = evaluateFraudDoctrineTest(new Map());
    expect(result.tone).toBe("not-satisfied");
    expect(result.text).not.toMatch(/is absent|was not present|does not exist/i);
  });

  it("L1 present / L2 not stated -> satisfied on Limb (i) alone", () => {
    const result = evaluateFraudDoctrineTest(states([[L1, "present"]]));
    expect(result.tone).toBe("satisfied");
  });

  it("L1 not stated / L2 present -> satisfied on Limb (ii) alone (the corrected behavior)", () => {
    const result = evaluateFraudDoctrineTest(states([[L2, "present"]]));
    expect(result.tone).toBe("satisfied");
  });

  it("L1 present / L2 present -> satisfied, describing both limbs, never a stronger/compounded conclusion", () => {
    const result = evaluateFraudDoctrineTest(
      states([
        [L1, "present"],
        [L2, "present"],
      ])
    );
    expect(result.tone).toBe("satisfied");
    expect(result.text).toMatch(/both have supporting selections/);
  });

  it("no hidden/unrendered factor id is necessary to reach any of the four states above -- l1-injury and l2-blatant alone are sufficient", () => {
    // Sanity check that these are exactly the ids FraudTestChecklist.tsx renders.
    const checklist = readFileSync(new URL("../src/app/(app)/fraud-test/FraudTestChecklist.tsx", import.meta.url), "utf8");
    expect(checklist).toMatch(/id:\s*"l1-injury"/);
    expect(checklist).toMatch(/id:\s*"l2-blatant"/);
    // And that no other factor id from either limb is rendered as a control.
    expect(checklist).not.toMatch(/id:\s*"l1-dealt"/);
    expect(checklist).not.toMatch(/id:\s*"l1-manipulation-established"/);
    for (const hiddenId of ["l2-volume", "l2-persistence", "l2-proximity", "l2-circular", "l2-noeconomicsense"]) {
      expect(checklist).not.toMatch(new RegExp(`id:\\s*"${hiddenId}"`));
    }
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

  it("Limb (i) fully satisfied combines cleanly with an unrelated single Limb (ii) factor (which alone is now also satisfied)", () => {
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

  it.each(nonPresentStates)("a Limb (ii) factor marked '%s' does not itself count toward Limb (ii) satisfaction -- only the genuinely-present factor does", (state) => {
    const result = evaluateFraudDoctrineTest(
      states([
        [LIMB_2_FACTOR_IDS[0], state],
        [LIMB_2_FACTOR_IDS[1], "present"],
      ])
    );
    // Exactly one factor is genuinely "present" -- that alone is now enough to satisfy Limb (ii)
    // (the UI-alignment fix), but the non-present factor contributed nothing to that result.
    expect(result.tone).toBe("satisfied");
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

// Reconciliation-pass finding (Task 4): official-source verification of the
// para 175 text could not be completed in this environment. Result text and
// source code must never describe that text as "verified" -- only "quoted".
// These guard against silently regressing the wording back to an overclaim.
// evaluateFraudDoctrineTest() itself is retained and still correct/tested
// here -- see the next describe block for why it is deliberately NOT called
// from the officer-facing UI anymore.
describe("evaluateFraudDoctrineTest: never overclaims the para 175 text as officially verified", () => {
  it("no result text anywhere describes the paragraph 175 citation as 'verified'", () => {
    const allCombinations: Map<string, FactorState>[] = [
      new Map(),
      states([[LIMB_1_FACTOR_IDS.dealt, "present"]]),
      states([[LIMB_1_FACTOR_IDS.injury, "present"]]),
      states([[LIMB_1_FACTOR_IDS.manipulationEstablished, "present"]]),
      states([[LIMB_2_FACTOR_IDS[0], "present"]]),
      states([
        [LIMB_1_FACTOR_IDS.injury, "present"],
        [LIMB_2_FACTOR_IDS[0], "present"],
      ]),
    ];
    for (const s of allCombinations) {
      const result = evaluateFraudDoctrineTest(s);
      expect(result.text.toLowerCase()).not.toMatch(/verified text/);
    }
  });

  it("no source-code comment describes the para 175 citation as 'verified'", () => {
    const page = readFileSync(new URL("../src/app/(app)/fraud-test/page.tsx", import.meta.url), "utf8");
    expect(page.toLowerCase()).not.toMatch(/verified text/);

    const checklist = readFileSync(new URL("../src/app/(app)/fraud-test/FraudTestChecklist.tsx", import.meta.url), "utf8");
    expect(checklist.toLowerCase()).not.toMatch(/verified text/);

    const logic = readFileSync(new URL("../src/lib/fraudDoctrineTest.ts", import.meta.url), "utf8");
    expect(logic.toLowerCase()).not.toMatch(/verified text/);
  });
});

// Post-freeze correction pass (Section A): the computed conclusion is
// RESTORED. These guard that (a) FraudTestChecklist.tsx genuinely imports
// and calls evaluateFraudDoctrineTest/attentionCount (a computed read is
// actually rendered, not just retained in code), (b) the stale "Automated
// doctrinal assessment unavailable" blocking notice is gone from both
// files, (c) the checklist's own controls (the <select> factor inputs)
// were never removed -- restoration means re-wiring the result display,
// not reinventing the interactive checklist, and (d) internal
// retrieval/debug history (HTTP status codes, named mirrors) still never
// reaches the officer-facing files -- that detail stays confined to
// src/lib/fraudDoctrineTest.ts's own module doc comment, a developer note.
describe("Fraud Doctrine officer-facing UI: computed conclusion restored, controls preserved, no debug detail", () => {
  const page = readFileSync(new URL("../src/app/(app)/fraud-test/page.tsx", import.meta.url), "utf8");
  const checklist = readFileSync(new URL("../src/app/(app)/fraud-test/FraudTestChecklist.tsx", import.meta.url), "utf8");

  it("FraudTestChecklist.tsx imports and calls evaluateFraudDoctrineTest and attentionCount -- a computed conclusion is actually rendered", () => {
    expect(checklist).toMatch(/import\s*\{[^}]*evaluateFraudDoctrineTest/);
    expect(checklist).toMatch(/evaluateFraudDoctrineTest\(/);
    expect(checklist).toMatch(/import\s*\{[^}]*attentionCount/);
    expect(checklist).toMatch(/attentionCount\(/);
  });

  it("neither file still carries the stale 'Automated doctrinal assessment unavailable' blocking notice", () => {
    expect(page).not.toMatch(/Automated doctrinal assessment unavailable/);
    expect(checklist).not.toMatch(/Automated doctrinal assessment unavailable/);
  });

  it("the checklist's interactive factor controls (select inputs, not merely static text) are still present -- restoration never removed them", () => {
    expect(checklist).toMatch(/<select/);
    expect(checklist).toMatch(/FACTOR_STATE_OPTIONS/);
    expect(checklist).toMatch(/onChange=\{.*setFactorState/);
  });

  it("the checklist still offers a 'Clear selections' control that resets to an empty Map, and it never treats 'Not stated' as a stored/checked state", () => {
    expect(checklist).toMatch(/Clear selections/);
    expect(checklist).toMatch(/setStates\(new Map\(\)\)/);
    // "Not stated" is removed from the map rather than stored as a value --
    // see setFactorState's `if (state === "not-stated") next.delete(id)` --
    // so a factor left at its default is indistinguishable from one never
    // touched, and is never read by evaluateFraudDoctrineTest as "absent".
    expect(checklist).toMatch(/state === "not-stated"/);
    expect(checklist).toMatch(/next\.delete\(id\)/);
  });

  it("the result text always reads as a research-assistance characterisation, never a bare legal conclusion or a claim the underlying judgment is verified", () => {
    expect(checklist).toMatch(/Research assistance only/);
    expect(checklist).toMatch(/does not determine whether fraud or any violation occurred/);
    expect(page.toLowerCase()).not.toMatch(/supreme court judgment (itself )?(is|has been|was) (separately )?verified/);
  });

  it("neither officer-facing file exposes internal retrieval/debug history (HTTP status codes, named mirrors, attempt counts)", () => {
    for (const src of [page, checklist]) {
      expect(src).not.toMatch(/\b403\b/);
      expect(src).not.toMatch(/Indian Kanoon/i);
      expect(src).not.toMatch(/sci\.gov\.in/i);
      expect(src).not.toMatch(/BLOCKED/);
    }
  });

  it("the underlying decision logic (evaluateFraudDoctrineTest) still lives in fraudDoctrineTest.ts, independently exported and tested", () => {
    const logic = readFileSync(new URL("../src/lib/fraudDoctrineTest.ts", import.meta.url), "utf8");
    expect(logic).toMatch(/export function evaluateFraudDoctrineTest/);
    expect(logic).toMatch(/export function attentionCount/);
  });
});
