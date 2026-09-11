// Independent-audit correction pass: regression coverage for the remaining
// P1-4 (global narrative width/justification) and P2-1 (Home/Source
// overclaim sweep) items this pass found still outstanding after the
// previous checkpoint's report incorrectly claimed both were complete.
import { readFileSync } from "fs";
import { describe, expect, it } from "vitest";

function read(relPath: string): string {
  return readFileSync(new URL(`../${relPath}`, import.meta.url), "utf8");
}

describe("P1-4: Provision Detail's remaining narrative paragraphs are justified, not left plain/left-aligned", () => {
  const src = read("src/app/(app)/provisions/[id]/page.tsx");

  it("the finding-level-only-linkage caveat inside Historical treatment uses the shared justify class", () => {
    expect(src).toMatch(/\$\{NARRATIVE_JUSTIFY_ONLY\}[\s\S]{0,80}Finding-level provision linkage:/);
  });

  it("the 'Broad CFID scenarios' explanatory paragraph uses the shared justify class, not a bare text-sm paragraph", () => {
    const broadScenariosBlock = src.slice(src.indexOf("Broad CFID scenarios"), src.indexOf("Broad CFID scenarios") + 600);
    expect(broadScenariosBlock).toMatch(/NARRATIVE_JUSTIFY_ONLY/);
  });

  // Post-freeze correction pass (Section H): the statutory-text blockquote
  // was previously confined to max-w-prose (65ch, ~600px) regardless of
  // how wide its card actually was -- read as a narrow floating column
  // with dead space beside it, when the statutory text is the whole
  // reason an officer opens this page. Widened to a graduated, still
  // bounded measure so it visually dominates the card without ever
  // reaching edge-to-edge on the widest displays.
  it("the statutory-text blockquote is widened (max-w-3xl sm:max-w-4xl xl:max-w-5xl), no longer the old flat max-w-prose cap", () => {
    expect(src).toMatch(/<blockquote className="max-w-3xl whitespace-pre-wrap[^"]*sm:max-w-4xl xl:max-w-5xl"/);
    expect(src).not.toMatch(/<blockquote className="max-w-prose/);
  });
});

describe("P1-4: Source Library's remaining narrative paragraphs are justified", () => {
  const src = read("src/app/(app)/library/page.tsx");

  it("imports the shared justify-only class", () => {
    expect(src).toMatch(/import\s*\{\s*NARRATIVE_JUSTIFY_ONLY\s*\}\s*from\s*"@\/lib\/proseClasses"/);
  });

  it("the intro paragraph, the incompleteness caveat, and the provenance-counts paragraph all apply it", () => {
    const matches = [...src.matchAll(/\$\{NARRATIVE_JUSTIFY_ONLY\}/g)];
    expect(matches.length).toBeGreaterThanOrEqual(3);
  });
});

describe("P2-1: Home no longer claims this tool itself 'applies' the Supreme Court's fraud test", () => {
  const src = read("src/app/(app)/dashboard/page.tsx");

  it("does not use the overclaiming phrase 'apply the Supreme Court's ... test to a fact pattern' (the tool never computes this -- the officer applies it)", () => {
    expect(src).not.toMatch(/apply the Supreme Court.s PFUTP Regulation 2\(1\)\(c\)/);
  });

  it("instead frames Fraud Doctrine as a reference aid the officer applies themselves, consistent with the fraud-test page's own restrained framing", () => {
    expect(src).toMatch(/a reference aid, not an automated determination/);
  });
});

describe("P1-7: Admin's coverage-gap queue discloses that it cannot distinguish missing analysis from a deliberate zero-finding order", () => {
  const src = read("src/app/(app)/admin/page.tsx");

  it("carries an explicit caveat that not every listed row is necessarily missing analysis", () => {
    expect(src).toMatch(/Not every row below is necessarily missing analysis/);
  });

  it("explains why: order_type cannot reliably predict the distinction", () => {
    expect(src).toMatch(/order_type does not predict it/);
  });

  it("getStructuredFindingCoverageGaps itself still never filters/excludes rows by order.caseName text -- the checkpoint explicitly ruled out inferring the distinction from case-name string matching", () => {
    const dataSrc = read("src/lib/data.ts");
    const fnStart = dataSrc.indexOf("export async function getStructuredFindingCoverageGaps");
    const fnBody = dataSrc.slice(fnStart, fnStart + 2000);
    expect(fnBody).not.toMatch(/caseName\.(includes|match|toLowerCase\(\)\.includes)/);
  });
});

describe("P2-1: Home's 'About this tool' card no longer certifies corpus completeness it cannot support", () => {
  const src = read("src/app/(app)/dashboard/page.tsx");

  it("no longer makes the blanket claim that every result is 'deterministic and traceable ... never generated or inferred by AI' with no completeness caveat", () => {
    expect(src).not.toMatch(/Every result is deterministic and traceable to an official SEBI\/MCA source or an indexed CFID order —\s*\n\s*never generated or inferred by AI\./);
  });

  it("still truthfully states results are never AI-generated/inferred, while now also disclosing that citations/text/titles carry their own documented caveats", () => {
    expect(src).toMatch(/never generated or inferred by AI/);
    expect(src).toMatch(/does not mean the underlying corpus is complete/);
  });
});
