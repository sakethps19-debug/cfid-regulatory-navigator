import { describe, expect, it } from "vitest";
import { analyzeScenario } from "@/lib/matching/engine";
import { legalTests, provisions, scenarioFindings } from "./fixtures";
import type { AnalysisResult } from "@/lib/matching/types";

const FORBIDDEN_PHRASES = [
  "is guilty",
  "has definitely violated",
  "definitely violated",
  "will take action",
  "the company is guilty",
  "sebi will take action",
];

function run(freeText: string, actorFilter?: string, transactionTypeFilter?: string): AnalysisResult {
  return analyzeScenario({ freeText, actorFilter, transactionTypeFilter }, scenarioFindings, provisions, legalTests);
}

function allRecordIds(result: AnalysisResult): string[] {
  const ids: string[] = [];
  for (const pr of result.provisionResults) {
    ids.push(...pr.supportingPrecedents.map((p) => p.finding.recordId));
    ids.push(...pr.contraryPrecedents.map((p) => p.finding.recordId));
  }
  ids.push(...result.globalContraryPrecedents.map((p) => p.finding.recordId));
  return ids;
}

function allGeneratedText(result: AnalysisResult): string {
  return [
    ...result.provisionResults.map((pr) => pr.whyRelevant),
    ...result.provisionResults.flatMap((pr) => pr.confidenceReasons),
    ...result.applicableGuardrails.map((g) => g.workingPrinciple),
  ].join(" \n ");
}

describe("Mandatory scenario 1: fictitious sales and assets", () => {
  it("retrieves the misrepresented-financial-statements precedents", () => {
    const result = run("Fictitious sales and assets disclosed through financial statements.");
    expect(result.hasResults).toBe(true);
    const ids = allRecordIds(result);
    expect(ids).toContain("SSSL-01");
  });
});

describe("Mandatory scenario 2: promoter's personal derivative transactions as revenue", () => {
  it("retrieves the REL-04 precedent", () => {
    const result = run("Promoter's personal derivative transactions recorded as company revenue.");
    expect(result.hasResults).toBe(true);
    expect(allRecordIds(result)).toContain("REL-04");
  });
});

describe("Mandatory scenario 3: rights-issue proceeds routed through entities against unsupported purchases", () => {
  it("retrieves the SSSL-04 precedent", () => {
    const result = run("Rights-issue proceeds routed through entities against unsupported purchases.");
    expect(result.hasResults).toBe(true);
    expect(allRecordIds(result)).toContain("SSSL-04");
  });
});

describe("Mandatory scenario 4: preferential allotment financed through circular transactions (negative precedent)", () => {
  const scenarioText =
    "Preferential allotment allegedly financed through circular transactions, but loans are recorded in audited accounts, third parties were not examined and sale proceeds remain with the allottees.";

  it("retrieves the Seacoast SSSL-03 'Not upheld' finding", () => {
    const result = run(scenarioText);
    expect(result.hasResults).toBe(true);
    expect(allRecordIds(result)).toContain("SSSL-03");
    const found =
      result.provisionResults.flatMap((pr) => pr.contraryPrecedents).find((p) => p.finding.recordId === "SSSL-03") ??
      result.globalContraryPrecedents.find((p) => p.finding.recordId === "SSSL-03");
    expect(found).toBeDefined();
    expect(found?.finding.findingStatus).toBe("Not upheld");
  });

  it("does not produce a definitive violation conclusion anywhere in the generated text", () => {
    const result = run(scenarioText);
    const text = allGeneratedText(result).toLowerCase();
    for (const phrase of FORBIDDEN_PHRASES) {
      expect(text).not.toContain(phrase);
    }
  });

  it("surfaces the circular fund-flow guardrail checklist", () => {
    const result = run(scenarioText);
    const titles = result.applicableGuardrails.map((g) => g.provisionOrIssue);
    expect(titles).toContain("Circular fund-flow allegation");
  });
});

describe("Mandatory scenario 5: company funds routed through a promoter's personal bank account", () => {
  it("retrieves the REL-10 precedent, labelled Prima facie", () => {
    const result = run("Company funds routed through a promoter's personal bank account.");
    expect(result.hasResults).toBe(true);
    const rel10 = result.provisionResults.flatMap((pr) => pr.supportingPrecedents).find((p) => p.finding.recordId === "REL-10");
    expect(rel10).toBeDefined();
    expect(rel10?.finding.findingStatus).toBe("Prima facie");
  });
});

describe("Mandatory scenario 6: Audit Committee not properly constituted / meetings not conducted", () => {
  it("retrieves SSSL-09 and/or SSSL-10", () => {
    const result = run("Audit Committee not properly constituted or meetings not conducted.");
    expect(result.hasResults).toBe(true);
    const ids = allRecordIds(result);
    expect(ids.some((id) => ["SSSL-09", "SSSL-10"].includes(id))).toBe(true);
  });
});

describe("Mandatory scenario 7: vacancy or improper appointment of the Compliance Officer", () => {
  it("retrieves the SSSL-11 precedent", () => {
    const result = run("Vacancy or improper appointment of the Compliance Officer.");
    expect(result.hasResults).toBe(true);
    expect(allRecordIds(result)).toContain("SSSL-11");
  });
});

describe("Safeguard: PFUTP 4(2)(e) vs LODR 4(2)(e)(i) must remain distinct", () => {
  it("keeps the two provisions as separate ids in the provision index", () => {
    const pfutp = provisions.find((p) => p.id === "PFUTP-4-2-e");
    const lodr = provisions.find((p) => p.id === "LODR-4-2-e-i");
    expect(pfutp).toBeDefined();
    expect(lodr).toBeDefined();
    expect(pfutp?.instrument).toMatch(/PFUTP/i);
    expect(lodr?.instrument).toMatch(/LODR/i);
    expect(pfutp?.subject?.toLowerCase()).toContain("manipulation");
    expect(lodr?.subject?.toLowerCase()).toContain("true and fair");
  });

  it("never matches PFUTP 4(2)(e) text against a finding that only cites LODR 4(2)(e)(i)", () => {
    // A finding whose provisionsConsideredRaw contains only the LODR
    // instrument segment must not be tagged with the PFUTP id, and vice
    // versa, even though both share the literal substring "4(2)(e)".
    for (const f of scenarioFindings) {
      const hasPfutpSegment = /PFUTP[^;]*4\(2\)\(e\)(?!\(i\))/i.test(f.provisionsConsideredRaw ?? "");
      const hasLodrSegment = /LODR[^;]*4\(2\)\(e\)\(i\)/i.test(f.provisionsConsideredRaw ?? "");
      expect(f.provisionIds.includes("PFUTP-4-2-e")).toBe(hasPfutpSegment);
      expect(f.provisionIds.includes("LODR-4-2-e-i")).toBe(hasLodrSegment);
    }
  });
});

describe("Safeguard: interim findings are labelled prima facie", () => {
  it("every Rajesh Exports finding (interim-only) is Prima facie, never Upheld", () => {
    const relFindings = scenarioFindings.filter((f) => f.caseName === "Rajesh Exports Limited");
    expect(relFindings.length).toBeGreaterThan(0);
    for (const f of relFindings) {
      expect(f.findingStatus).toBe("Prima facie");
      expect(f.finalParagraphReferences).toBeNull();
    }
  });
});

describe("Safeguard: final findings override inconsistent interim findings", () => {
  it("SSSL-03 is stored as 'Not upheld' (the final outcome), not the interim prima facie inference", () => {
    const finding = scenarioFindings.find((f) => f.recordId === "SSSL-03");
    expect(finding).toBeDefined();
    expect(finding?.findingStatus).toBe("Not upheld");
    expect(finding?.interimParagraphReferences).not.toBeNull();
    expect(finding?.finalParagraphReferences).not.toBeNull();
  });

  it("SSSL-12 correctly excludes the SSSL-03 allegation despite an otherwise upheld composite finding", () => {
    const finding = scenarioFindings.find((f) => f.recordId === "SSSL-12");
    expect(finding).toBeDefined();
    expect(finding?.findingStatus).toBe("Partly upheld");
    expect(finding?.evidentiaryGaps.join(" ")).toMatch(/SSSL-03/);
  });
});

describe("Safeguard: every displayed precedent has a source URL and paragraph reference", () => {
  it("holds for all 34 scenario findings", () => {
    for (const f of scenarioFindings) {
      expect(f.officialSourceUrl).toMatch(/^https:\/\/www\.sebi\.gov\.in\//);
      expect(f.interimParagraphReferences ?? f.finalParagraphReferences).toBeTruthy();
    }
  });

  it("holds for every precedent surfaced by a representative set of scenario queries", () => {
    const queries = [
      "Fictitious sales and assets disclosed through financial statements.",
      "Promoter's personal derivative transactions recorded as company revenue.",
      "Rights-issue proceeds routed through entities against unsupported purchases.",
      "Preferential allotment allegedly financed through circular transactions, but loans are recorded in audited accounts, third parties were not examined and sale proceeds remain with the allottees.",
      "Company funds routed through a promoter's personal bank account.",
      "Audit Committee not properly constituted or meetings not conducted.",
      "Vacancy or improper appointment of the Compliance Officer.",
    ];
    for (const q of queries) {
      const result = run(q);
      for (const pr of result.provisionResults) {
        for (const ref of [...pr.supportingPrecedents, ...pr.contraryPrecedents]) {
          expect(ref.finding.officialSourceUrl).toMatch(/^https:\/\//);
          expect(ref.finding.interimParagraphReferences ?? ref.finding.finalParagraphReferences).toBeTruthy();
        }
      }
    }
  });
});

describe("Safeguard: unsupported provisions are not suggested", () => {
  it("an unrelated, generic scenario yields no results rather than a fabricated match", () => {
    const result = run("The office canteen menu changed for next week.");
    expect(result.hasResults).toBe(false);
    expect(result.provisionResults.length).toBe(0);
  });

  it("every suggested provision has at least one supporting finding whose own tags matched the query", () => {
    const result = run(
      "Company funds routed through a promoter's personal bank account without board approval or disclosure."
    );
    for (const pr of result.provisionResults) {
      expect(pr.supportingPrecedents.length).toBeGreaterThan(0);
      expect(pr.matchedFactualIngredients.length).toBeGreaterThan(0);
    }
  });
});

describe("Safeguard: careful, hedged language only", () => {
  it("never uses definitive violation language across a broad set of queries", () => {
    const queries = [
      "Fictitious sales and assets disclosed through financial statements.",
      "Preferential allotment allegedly financed through circular transactions, but loans are recorded in audited accounts, third parties were not examined and sale proceeds remain with the allottees.",
      "Audit Committee not properly constituted or meetings not conducted.",
    ];
    for (const q of queries) {
      const result = run(q);
      const text = allGeneratedText(result).toLowerCase();
      for (const phrase of FORBIDDEN_PHRASES) {
        expect(text).not.toContain(phrase);
      }
      for (const pr of result.provisionResults) {
        expect(pr.whyRelevant.toLowerCase()).toMatch(/potentially relevant|prima facie similarity/);
      }
    }
  });
});
