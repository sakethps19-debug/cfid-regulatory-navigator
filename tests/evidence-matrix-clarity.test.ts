// Guards the evidence matrix's kind-labelling: every non-"Your facts"
// column must be traceable to exactly one of upheld/supporting/contrary so
// a reader is never left guessing which kind of precedent a recorded
// evidence indicator belongs to. Also guards that the matrix draws only on
// each precedent's own curated evidenceTypes tags, never inferring
// anything not already on file.
import { describe, expect, it } from "vitest";
import { buildEvidenceMatrix } from "@/components/analyzer/ScenarioAnalyzerClient";
import { provisions, scenarioFindings } from "./fixtures";
import type { PrecedentRef, ProvisionResult } from "@/lib/matching/types";

function toRef(recordId: string): PrecedentRef {
  const finding = scenarioFindings.find((f) => f.recordId === recordId);
  if (!finding) throw new Error(`fixture missing: ${recordId}`);
  return { finding, score: 10, matchedFactualIngredients: [], matchedByCategory: { transactionTypes: [], actorRoles: [], allegedConduct: [], evidenceTypes: [] }, additionalPrecedentFactsNotMatched: [] };
}

function baseProvisionResult(overrides: Partial<ProvisionResult>): ProvisionResult {
  return {
    provision: provisions[0],
    whyRelevant: "",
    matchedFactualIngredients: [],
    matchedByCategory: { transactionTypes: [], actorRoles: [], allegedConduct: [], evidenceTypes: [] },
    supportingPrecedents: [],
    contraryPrecedents: [],
    upheldPrecedents: [],
    statusesSeen: [],
    confidence: "Low",
    confidenceReasons: [],
    missingFacts: [],
    provisionVersions: [],
    applicableVersionNote: "",
    ...overrides,
  };
}

describe("buildEvidenceMatrix: kind labelling", () => {
  it("labels a record present in upheldPrecedents as 'upheld', even if it also appears in supportingPrecedents", () => {
    const upheld = toRef("SSSL-01"); // Confirmed in Final Order in fixtures
    const supporting = toRef("REL-02");
    const pr = baseProvisionResult({ upheldPrecedents: [upheld], supportingPrecedents: [upheld, supporting] });
    const matrix = buildEvidenceMatrix(pr);
    expect(matrix).not.toBeNull();
    const sssl01 = matrix!.records.find((r) => r.recordId === "SSSL-01");
    expect(sssl01?.kind).toBe("upheld");
    const rel02 = matrix!.records.find((r) => r.recordId === "REL-02");
    expect(rel02?.kind).toBe("supporting");
  });

  it("labels a contrary-only record as 'contrary'", () => {
    const supporting = toRef("SSSL-02");
    const contrary = toRef("SSSL-03"); // Not Confirmed in Final Order in fixtures
    const pr = baseProvisionResult({ supportingPrecedents: [supporting], contraryPrecedents: [contrary] });
    const matrix = buildEvidenceMatrix(pr);
    expect(matrix).not.toBeNull();
    const sssl03 = matrix!.records.find((r) => r.recordId === "SSSL-03");
    expect(sssl03?.kind).toBe("contrary");
  });

  it("every presentByRecordId value is drawn only from that finding's own curated evidenceTypes, never inferred", () => {
    const a = toRef("SSSL-02");
    const b = toRef("SSSL-03");
    const pr = baseProvisionResult({ supportingPrecedents: [a], contraryPrecedents: [b] });
    const matrix = buildEvidenceMatrix(pr);
    expect(matrix).not.toBeNull();
    for (const row of matrix!.rows) {
      for (const ref of [a, b]) {
        expect(row.presentByRecordId[ref.finding.recordId]).toBe(ref.finding.evidenceTypes.includes(row.evidenceId));
      }
    }
  });

  it("returns null when fewer than 2 records are cited (nothing to compare)", () => {
    const pr = baseProvisionResult({ supportingPrecedents: [toRef("SSSL-01")] });
    expect(buildEvidenceMatrix(pr)).toBeNull();
  });
});
