// Guards a specific architectural constraint: conductPeriod (and
// entityOrIssuer/amountInvolved) are descriptive/record-only fields and
// must never influence matching, scoring, or which provision version is
// presented as applicable, until provision-version data is independently
// verified enough to support genuine temporal applicability. See Part 8 of
// the correctness-review pass this guards against regressing.
import { describe, expect, it } from "vitest";
import { analyzeScenario } from "@/lib/matching/engine";
import { legalTests, provisions, scenarioFindings } from "./fixtures";

const FREE_TEXT = "Fictitious sales and assets disclosed through financial statements.";

describe("conductPeriod/entityOrIssuer/amountInvolved are descriptive-only, never scored", () => {
  it("an identical scenario produces identical provisionResults whether or not conductPeriod/entityOrIssuer/amountInvolved are supplied", () => {
    const withoutOptional = analyzeScenario({ freeText: FREE_TEXT }, scenarioFindings, provisions, legalTests);
    const withOptional = analyzeScenario(
      {
        freeText: FREE_TEXT,
        conductPeriod: "FY 2019-20 to FY 2021-22",
        entityOrIssuer: "Some Random Entity Ltd.",
        amountInvolved: "INR 500 crore",
      },
      scenarioFindings,
      provisions,
      legalTests
    );
    expect(withOptional.provisionResults.map((pr) => pr.provision.id)).toEqual(withoutOptional.provisionResults.map((pr) => pr.provision.id));
    expect(withOptional.provisionResults.map((pr) => pr.confidence)).toEqual(withoutOptional.provisionResults.map((pr) => pr.confidence));
    expect(withOptional.provisionResults.map((pr) => pr.applicableVersionNote)).toEqual(
      withoutOptional.provisionResults.map((pr) => pr.applicableVersionNote)
    );
  });

  it("the query's own conductPeriod/entityOrIssuer/amountInvolved are echoed back unchanged, never interpreted", () => {
    const result = analyzeScenario(
      { freeText: FREE_TEXT, conductPeriod: "FY 2019-20", entityOrIssuer: "XYZ Ltd.", amountInvolved: "INR 100 crore" },
      scenarioFindings,
      provisions,
      legalTests
    );
    expect(result.query.conductPeriod).toBe("FY 2019-20");
    expect(result.query.entityOrIssuer).toBe("XYZ Ltd.");
    expect(result.query.amountInvolved).toBe("INR 100 crore");
  });
});
