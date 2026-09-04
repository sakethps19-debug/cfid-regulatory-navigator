import { describe, expect, it } from "vitest";
import { legalTests, provisions, scenarioFindings } from "./fixtures";

// These run offline against the checked-in pilot fixtures (the source of
// truth for the 3 deep-analyzed orders / 34 scenario findings that seeded
// the live database) rather than the live DB, so they stay fast and
// deterministic in CI. The equivalent checks against the live 89-order
// database are scripts/db/verify-data-integrity.sql and
// scripts/db/verify-rls.sql, which require a Postgres connection and are
// run manually / by an admin, not by this test suite.

describe("Data integrity: duplicate detection", () => {
  it("no duplicate scenario finding record IDs", () => {
    const ids = scenarioFindings.map((f) => f.recordId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("no duplicate legal provision canonical IDs", () => {
    const ids = provisions.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("no duplicate legal test IDs", () => {
    const ids = legalTests.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("Data integrity: citation traceability", () => {
  it("every scenario finding has an official source URL", () => {
    for (const f of scenarioFindings) {
      expect(f.officialSourceUrl, `${f.recordId} is missing an official source URL`).toBeTruthy();
      expect(f.officialSourceUrl).toMatch(/^https:\/\/(www\.)?sebi\.gov\.in\//);
    }
  });

  it("every scenario finding has at least one paragraph reference (interim or final)", () => {
    for (const f of scenarioFindings) {
      const hasReference = Boolean(f.interimParagraphReferences || f.finalParagraphReferences);
      expect(hasReference, `${f.recordId} has neither an interim nor a final paragraph reference`).toBe(true);
    }
  });

  it("every scenario finding cites at least one recognized provision", () => {
    for (const f of scenarioFindings) {
      expect(f.provisionIds.length, `${f.recordId} resolved to zero provision ids from "${f.provisionsConsideredRaw}"`).toBeGreaterThan(0);
      for (const provisionId of f.provisionIds) {
        expect(provisions.some((p) => p.id === provisionId), `${f.recordId} cites unknown provision "${provisionId}"`).toBe(true);
      }
    }
  });

  it("every legal provision has a subject and a verification status", () => {
    for (const p of provisions) {
      expect(p.subject, `${p.id} is missing a subject`).toBeTruthy();
      expect(["Requires verification", "Order-cited text only", "Officially verified"]).toContain(p.currentTextVerificationStatus);
    }
  });
});

describe("Data integrity: the Seacoast negative precedent is preserved", () => {
  it("SSSL-03 is recorded as not upheld, not as upheld or omitted", () => {
    const finding = scenarioFindings.find((f) => f.recordId === "SSSL-03");
    expect(finding).toBeDefined();
    expect(finding?.findingStatus).toBe("Not upheld");
  });
});

describe("Data integrity: PFUTP 4(2)(e) vs LODR 4(2)(e)(i) are never merged into one provision", () => {
  it("both canonical ids exist as separate provisions", () => {
    const pfutp = provisions.find((p) => p.id === "PFUTP-4-2-e");
    const lodr = provisions.find((p) => p.id === "LODR-4-2-e-i");
    expect(pfutp).toBeDefined();
    expect(lodr).toBeDefined();
    expect(pfutp?.id).not.toBe(lodr?.id);
  });
});
