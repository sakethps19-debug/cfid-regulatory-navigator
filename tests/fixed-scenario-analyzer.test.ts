import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { FIXED_SCENARIOS } from "@/data/curated/fixed-scenarios";
import { legalFunctionForProvision, type LegalFunctionCategory } from "@/data/curated/legal-function-classification";
import { isEligibleForFixedScenarioOutput, resolveAllFixedScenarios, resolveFixedScenario } from "@/lib/fixedScenarioResolver";
import type { LegalProvision } from "@/types/domain";

// A LegalProvision[] fixture shaped like the live `legal_provisions` table
// (instrument/provisionNumber/subject text confirmed against a live query
// of the production Supabase corpus during this redesign's verification
// pass), covering every id referenced by FIXED_SCENARIOS plus the named
// mandatory-excluded provisions (SEBI-ACT-27/15HA/15HB), which are NOT
// referenced by any curated scenario but are included here so the
// defensive resolver-level filter itself is exercised, not merely proven
// vacuously true by their absence from the curated data.
function provision(id: string, instrument: string, provisionNumber: string, subject: string): LegalProvision {
  return {
    id,
    instrument,
    provisionNumber,
    subject,
    currentTextVerificationStatus: "Officially verified",
    officialSource: "https://www.sebi.gov.in/",
    ordersConsidered: [],
    treatmentInPilotOrders: "",
    lawLibraryNote: null,
  };
}

const TEST_PROVISIONS: LegalProvision[] = [
  provision("SEBI-ACT-12A-a", "SEBI Act, 1992", "Section 12A(a)", "Prohibits use of manipulative or deceptive devices in connection with securities."),
  provision("SEBI-ACT-12A-b", "SEBI Act, 1992", "Section 12A(b)", "Prohibits employing any device, scheme or artifice to defraud."),
  provision("SEBI-ACT-12A-c", "SEBI Act, 1992", "Section 12A(c)", "Prohibits acts operating as fraud or deceit."),
  provision("SEBI-ACT-27", "SEBI Act, 1992", "Section 27", "Liability where contravention is committed by a company."),
  provision("SEBI-ACT-15HA", "SEBI Act, 1992", "Section 15HA", "Penalty for fraudulent and unfair trade practices."),
  provision("SEBI-ACT-15HB", "SEBI Act, 1992", "Section 15HB", "Residual penalty provision."),
  provision("PFUTP-3-a", "PFUTP Regulations, 2003", "Regulation 3(a)", "Prohibits fraudulent dealing in securities."),
  provision("PFUTP-3-b", "PFUTP Regulations, 2003", "Regulation 3(b)", "Prohibits manipulative or deceptive devices."),
  provision("PFUTP-3-c", "PFUTP Regulations, 2003", "Regulation 3(c)", "Prohibits any device, scheme or artifice to defraud."),
  provision("PFUTP-3-d", "PFUTP Regulations, 2003", "Regulation 3(d)", "Prohibits acts operating as fraud or deceit."),
  provision("PFUTP-4-1", "PFUTP Regulations, 2003", "Regulation 4(1)", "Manipulative, fraudulent or unfair trade practice."),
  provision("PFUTP-4-2-e", "PFUTP Regulations, 2003", "Regulation 4(2)(e)", "Act/omission amounting to manipulation of security price."),
  provision("PFUTP-4-2-f", "PFUTP Regulations, 2003", "Regulation 4(2)(f)", "Publishing/reporting untrue securities-related information."),
  provision("PFUTP-4-2-k", "PFUTP Regulations, 2003", "Regulation 4(2)(k)", "Disseminating false/misleading information likely to influence investors."),
  provision("PFUTP-4-2-r", "PFUTP Regulations, 2003", "Regulation 4(2)(r)", "Knowingly planting false/misleading information inducing trades."),
  provision("LODR-4-1-a", "LODR Regulations, 2015", "Regulation 4(1)(a)", "Information prepared and disclosed per applicable accounting/disclosure standards."),
  provision("LODR-4-1-b", "LODR Regulations, 2015", "Regulation 4(1)(b)", "Accounting standards implemented in letter and spirit."),
  provision("LODR-4-1-c", "LODR Regulations, 2015", "Regulation 4(1)(c)", "Refrain from misrepresentation; information not misleading."),
  provision("LODR-4-1-e", "LODR Regulations, 2015", "Regulation 4(1)(e)", "Timely and accurate disclosure of all material matters."),
  provision("LODR-4-1-g", "LODR Regulations, 2015", "Regulation 4(1)(g)", "Abide by all provisions of applicable law."),
  provision("LODR-4-1-h", "LODR Regulations, 2015", "Regulation 4(1)(h)", "Follow disclosure obligations in letter and spirit."),
  provision("LODR-4-1-j", "LODR Regulations, 2015", "Regulation 4(1)(j)", "Periodic filings enable investors to track performance."),
  provision("LODR-4-2-e-i", "LODR Regulations, 2015", "Regulation 4(2)(e)(i)", "Financial statements: true and fair view / applicable standards."),
  provision("LODR-33-1-a", "LODR Regulations, 2015", "Regulation 33(1)(a)", "Financial results prepared on accrual basis, uniform practices."),
  provision("LODR-33-1-c", "LODR Regulations, 2015", "Regulation 33(1)(c)", "Manner of preparing/presenting financial results."),
  provision("LODR-33-3-d", "LODR Regulations, 2015", "Regulation 33(3)(d)", "Submission of audited standalone financial results within 60 days."),
  provision("LODR-34-2-a", "LODR Regulations, 2015", "Regulation 34(2)(a)", "Annual report shall contain audited standalone financial statements."),
  provision("LODR-34-3", "LODR Regulations, 2015", "Regulation 34(3)", "Annual report disclosures per Companies Act/Schedule V."),
  provision("LODR-48", "LODR Regulations, 2015", "Regulation 48", "Compliance with applicable accounting standards."),
  provision("LODR-16-1-b", "LODR Regulations, 2015", "Regulation 16(1)(b)", "Definition of independent director."),
  provision("LODR-17-8", "LODR Regulations, 2015", "Regulation 17(8)", "CEO/CFO compliance certification."),
  provision("LODR-18-1-d", "LODR Regulations, 2015", "Regulation 18(1)(d)", "Audit Committee chairperson to be an independent director."),
  provision("LODR-18-2", "LODR Regulations, 2015", "Regulation 18(2)", "Audit Committee meeting-conduct requirements, including (a) meeting at least four times a year with no more than 120 days between meetings."),
  provision("LODR-18-3-schedule-II", "LODR Regulations, 2015", "Regulation 18(3) read with Part C of Schedule II", "Role and responsibilities of the Audit Committee."),
  provision("LODR-4-2-f", "LODR Regulations, 2015", "Regulation 4(2)(f)", "Responsibilities of the board of directors as part of disclosure/governance principles."),
  provision("LODR-23-2", "LODR Regulations, 2015", "Regulation 23(2)", "Prior Audit Committee approval of related party transactions."),
  provision("LODR-SCHEDULE-V-A-1", "LODR Regulations, 2015", "Schedule V, Part A, Clause 1", "Disclosure of related-party transactions in the annual report."),
  provision("LODR-6-1", "LODR Regulations, 2015", "Regulation 6(1)", "Compliance Officer to be whole-time KMP."),
  provision("LODR-6-1A", "LODR Regulations, 2015", "Regulation 6(1A)", "Any vacancy in the office of the Compliance Officer shall be filled at the earliest, not later than three months from the date of the vacancy."),
  provision("LODR-6-2-a", "LODR Regulations, 2015", "Regulation 6(2)(a)", "Compliance Officer duty (a)."),
  provision("LODR-6-2-c", "LODR Regulations, 2015", "Regulation 6(2)(c)", "Compliance Officer duty (c)."),
  provision("IND-AS-24", "Indian Accounting Standards", "Ind AS 24", "Related Party Disclosures."),
  provision("ICDR-24-1", "SEBI (Issue of Capital and Disclosure Requirements) Regulations, 2018", "Regulation 24(1)", "Draft offer document and offer document (main-board/general issue segment) must contain all material disclosures true and adequate for an informed investment decision."),
  provision("ICDR-245-1", "SEBI (Issue of Capital and Disclosure Requirements) Regulations, 2018", "Regulation 245(1)", "Offer document (SME/IGP issue segment) must contain all material disclosures true and adequate for an informed investment decision."),
  provision("LODR-32", "LODR Regulations, 2015", "Regulation 32 / 32(7A)", "Monitoring/disclosure of issue-proceeds utilisation."),
  provision("PFUTP-4-2-s", "PFUTP Regulations, 2003", "Regulation 4(2)(s)", "Mis-selling of securities or services relating to the securities market."),
];

const MANDATORY_EXCLUDED_IDS = [
  "SEBI-ACT-11-1",
  "SEBI-ACT-11-4",
  "SEBI-ACT-11-4A",
  "SEBI-ACT-11B-1",
  "SEBI-ACT-11B-2",
  "SEBI-ACT-15HA",
  "SEBI-ACT-15HB",
  "SEBI-ACT-27",
];

const EXCLUDED_LEGAL_FUNCTIONS: LegalFunctionCategory[] = ["penalty_provision", "sebi_power_remedial_provision", "liability_attribution_provision"];

function scenarioById(id: string) {
  const s = FIXED_SCENARIOS.find((x) => x.id === id);
  if (!s) throw new Error(`fixture gap: no scenario with id ${id}`);
  return s;
}

describe("Fixed Scenario Analysis — curated data integrity", () => {
  it("has exactly 9 scenarios", () => {
    expect(FIXED_SCENARIOS).toHaveLength(9);
  });

  it("every scenario has a non-empty name and explanation", () => {
    for (const s of FIXED_SCENARIOS) {
      expect(s.name.trim().length).toBeGreaterThan(0);
      expect(s.explanation.trim().length).toBeGreaterThan(0);
    }
  });

  it("every scenario id is unique", () => {
    const ids = FIXED_SCENARIOS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("no scenario lists a duplicate provision id", () => {
    for (const s of FIXED_SCENARIOS) {
      expect(new Set(s.provisionIds).size).toBe(s.provisionIds.length);
    }
  });

  it("every curated provision id resolves against the live-corpus-shaped fixture (no typos)", () => {
    const resolved = resolveAllFixedScenarios(TEST_PROVISIONS);
    for (const r of resolved) {
      expect(r.unresolvedProvisionIds).toEqual([]);
    }
  });
});

describe("Fixed Scenario Analysis — mandatory exclusion of enforcement/direction/penalty/attribution provisions", () => {
  it("no curated scenario lists any of the named excluded provisions", () => {
    for (const s of FIXED_SCENARIOS) {
      for (const excludedId of MANDATORY_EXCLUDED_IDS) {
        expect(s.provisionIds).not.toContain(excludedId);
      }
    }
  });

  it("no curated provision id belongs to a mandatory-excluded legal-function category", () => {
    for (const s of FIXED_SCENARIOS) {
      for (const id of s.provisionIds) {
        const fn = legalFunctionForProvision(id);
        expect(EXCLUDED_LEGAL_FUNCTIONS).not.toContain(fn);
      }
    }
  });

  it("isEligibleForFixedScenarioOutput rejects Section 27, 15HA and 15HB by name", () => {
    expect(isEligibleForFixedScenarioOutput("SEBI-ACT-27")).toBe(false);
    expect(isEligibleForFixedScenarioOutput("SEBI-ACT-15HA")).toBe(false);
    expect(isEligibleForFixedScenarioOutput("SEBI-ACT-15HB")).toBe(false);
  });

  it("isEligibleForFixedScenarioOutput accepts an ordinary substantive prohibition", () => {
    expect(isEligibleForFixedScenarioOutput("PFUTP-3-a")).toBe(true);
    expect(isEligibleForFixedScenarioOutput("SEBI-ACT-12A-a")).toBe(true);
  });

  it("the resolver itself defensively drops an excluded provision even if a scenario mistakenly cited it", () => {
    const tainted = { id: "test-tainted", name: "Test", explanation: "Test", provisionIds: ["PFUTP-3-a", "SEBI-ACT-27", "SEBI-ACT-15HA"], keyConceptIds: [] };
    const resolved = resolveFixedScenario(tainted, TEST_PROVISIONS);
    const allIds = resolved.provisionGroups.flatMap((g) => g.items.map((p) => p.id));
    expect(allIds).toContain("PFUTP-3-a");
    expect(allIds).not.toContain("SEBI-ACT-27");
    expect(allIds).not.toContain("SEBI-ACT-15HA");
  });
});

describe("Fixed Scenario Analysis — resolved output shape (no Part B metadata)", () => {
  it("groups provisions correctly by instrument, in provision-number order within each group", () => {
    const resolved = resolveFixedScenario(scenarioById("financial-statement-misrepresentation"), TEST_PROVISIONS);
    const instruments = resolved.provisionGroups.map((g) => g.instrument);
    expect(instruments).toEqual(expect.arrayContaining(["SEBI Act, 1992", "PFUTP Regulations, 2003", "LODR Regulations, 2015"]));
    expect(new Set(instruments).size).toBe(instruments.length); // each instrument appears once

    const lodrGroup = resolved.provisionGroups.find((g) => g.instrument === "LODR Regulations, 2015")!;
    const numbers = lodrGroup.items.map((p) => p.provisionNumber);
    expect(numbers.indexOf("Regulation 4(1)(a)")).toBeLessThan(numbers.indexOf("Regulation 33(1)(a)"));
    expect(numbers.indexOf("Regulation 33(1)(a)")).toBeLessThan(numbers.indexOf("Regulation 48"));
  });

  it("resolved output carries only scenario/explanation/provision fields — no case, order or historical-treatment metadata", () => {
    const resolved = resolveFixedScenario(scenarioById("audit-committee-governance-irregularities"), TEST_PROVISIONS);
    expect(Object.keys(resolved).sort()).toEqual(["explanation", "id", "name", "provisionGroups", "unresolvedProvisionIds"].sort());
    for (const group of resolved.provisionGroups) {
      expect(Object.keys(group).sort()).toEqual(["instrument", "items"].sort());
      for (const item of group.items) {
        const keys = Object.keys(item);
        for (const forbidden of ["caseName", "orderId", "findingStatus", "upheld", "similarityScore", "confidence", "precedent", "evidence"]) {
          expect(keys).not.toContain(forbidden);
        }
      }
    }
  });

  it("does not duplicate a provision across groups for a single scenario", () => {
    for (const s of FIXED_SCENARIOS) {
      const resolved = resolveFixedScenario(s, TEST_PROVISIONS);
      const allIds = resolved.provisionGroups.flatMap((g) => g.items.map((p) => p.id));
      expect(new Set(allIds).size).toBe(allIds.length);
    }
  });
});

describe("Fixed Scenario Analysis — negative controls", () => {
  it("RPT Irregularities does not automatically pull in PFUTP merely because a related party is involved", () => {
    const rpt = scenarioById("related-party-transaction-irregularities");
    expect(rpt.provisionIds.some((id) => id.startsWith("PFUTP-"))).toBe(false);
    expect(rpt.provisionIds.some((id) => id.startsWith("SEBI-ACT-12A"))).toBe(false);
  });

  it("Diversion/Siphoning does not automatically pull in RPT-specific provisions merely because funds moved to a related entity", () => {
    const diversion = scenarioById("diversion-siphoning-misutilisation");
    for (const rptOnlyId of ["IND-AS-24", "LODR-23-2", "LODR-34-3", "LODR-SCHEDULE-V-A-1"]) {
      expect(diversion.provisionIds).not.toContain(rptOnlyId);
    }
  });

  it("Fraudulent/Fictitious Allotment explanation disclaims treating an ordinary preferential allotment as fraud", () => {
    const allotment = scenarioById("fraudulent-fictitious-allotment");
    expect(allotment.explanation.toLowerCase()).toContain("not fraud merely because");
  });

  it("Financial Statement Misrepresentation explanation disclaims treating an ordinary accounting error as established fraud", () => {
    const financials = scenarioById("financial-statement-misrepresentation");
    expect(financials.explanation.toLowerCase()).toContain("not an assertion that every financial-statement error automatically attracts fraud");
  });

  it("uses 'potentially relevant' language, never 'violations committed' / 'provisions violated', in every explanation", () => {
    for (const s of FIXED_SCENARIOS) {
      expect(s.explanation.toLowerCase()).not.toContain("violations committed");
      expect(s.explanation.toLowerCase()).not.toContain("provisions violated");
    }
  });
});

describe("Fixed Scenario Analysis — corpus-completeness correction (post-ae8e33c review)", () => {
  it("Compliance Officer Irregularities includes Regulation 6(1A) (vacancy not filled within prescribed period)", () => {
    const co = scenarioById("compliance-officer-irregularities");
    expect(co.provisionIds).toContain("LODR-6-1A");
    const resolved = resolveFixedScenario(co, TEST_PROVISIONS);
    const allIds = resolved.provisionGroups.flatMap((g) => g.items.map((p) => p.id));
    expect(allIds).toContain("LODR-6-1A");
    expect(resolved.unresolvedProvisionIds).not.toContain("LODR-6-1A");
  });

  it("Audit Committee / Corporate Governance Irregularities includes the correctly modelled Regulation 18(2) requirement", () => {
    const ac = scenarioById("audit-committee-governance-irregularities");
    expect(ac.provisionIds).toContain("LODR-18-2");
    const resolved = resolveFixedScenario(ac, TEST_PROVISIONS);
    const item = resolved.provisionGroups.flatMap((g) => g.items).find((p) => p.id === "LODR-18-2");
    expect(item).toBeDefined();
    expect(item!.provisionNumber).toBe("Regulation 18(2)");
    // A basic AC-meeting lapse must not silently pull in PFUTP fraud provisions for this scenario.
    expect(ac.provisionIds.some((id) => id.startsWith("PFUTP-"))).toBe(false);
  });

  it("6(1A) and 18(2) are both live-corpus-shaped resolvable and correctly classified (not excluded categories)", () => {
    for (const id of ["LODR-6-1A", "LODR-18-2"]) {
      expect(TEST_PROVISIONS.some((p) => p.id === id)).toBe(true);
      expect(EXCLUDED_LEGAL_FUNCTIONS).not.toContain(legalFunctionForProvision(id));
    }
  });

  it("missing database coverage cannot silently drop a curated provision without a visible signal", () => {
    // Simulate the exact defect this correction fixes: a curated id the
    // scenario legally requires, but that is absent from the resolved
    // corpus fixture. resolveFixedScenario must record it in
    // unresolvedProvisionIds rather than just omitting it with no trace —
    // FixedScenarioAnalyzer.tsx renders a visible warning whenever this is
    // non-empty (asserted structurally below via source inspection, since
    // this is a plain data-layer test with no DOM renderer available).
    const incompleteFixture = TEST_PROVISIONS.filter((p) => p.id !== "LODR-6-1A");
    const resolved = resolveFixedScenario(scenarioById("compliance-officer-irregularities"), incompleteFixture);
    expect(resolved.unresolvedProvisionIds).toContain("LODR-6-1A");
    const visibleIds = resolved.provisionGroups.flatMap((g) => g.items.map((p) => p.id));
    expect(visibleIds).not.toContain("LODR-6-1A");

    const componentSource = fs.readFileSync(path.join(process.cwd(), "src/components/analyzer/FixedScenarioAnalyzer.tsx"), "utf8");
    expect(componentSource).toMatch(/unresolvedProvisionIds/);
    expect(componentSource).toMatch(/not currently on file/i);
  });

  it("every provisionId across all eight fixed scenarios resolves to an actual canonical legal-provision record (production-shaped fixture)", () => {
    const resolved = resolveAllFixedScenarios(TEST_PROVISIONS);
    for (const r of resolved) {
      expect(r.unresolvedProvisionIds).toEqual([]);
    }
  });
});

describe("Fixed Scenario Analysis — no Evidence Indicator in the UI component", () => {
  it("FixedScenarioAnalyzer.tsx never references an evidence-selection concept", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "src/components/analyzer/FixedScenarioAnalyzer.tsx"), "utf8");
    expect(source).not.toMatch(/evidenceSignal/i);
    expect(source).not.toMatch(/evidence indicator/i);
    expect(source).not.toMatch(/EVIDENCE_OPTIONS/);
  });

  it("FixedScenarioAnalyzer.tsx never shows actor/role dropdowns before the curated mapping", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "src/components/analyzer/FixedScenarioAnalyzer.tsx"), "utf8");
    expect(source).not.toMatch(/actorSignal/i);
    expect(source).not.toMatch(/ACTOR_OPTIONS/);
  });
});
