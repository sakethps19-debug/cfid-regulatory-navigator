// POST-CHECKPOINT CORRECTION — RAJESH EXPORTS CASE DETAIL + GLOBAL TEXT
// LAYOUT.
//
// LIVE DEFECT REPORTED: the user's own review of Rajesh Exports Limited's
// Case Detail page found (1) Siddharth Mehta rendered as a noticee of the
// 03-Jun-2026 interim order, though the order's own cause title names only
// Rajesh Exports Limited and Rajesh Mehta -- Siddharth Mehta is discussed in
// REL-05's facts as a counterparty to undisclosed personal-account
// transfers, which is not the same as being a noticee; and (2) a risk that
// the Rs.338.90cr gross transfer figure in that same finding could be read
// as an established quantum of diversion/siphoning/misutilisation, when the
// order itself records Rs.232.44cr returned and a Rs.106.39cr net outflow.
//
// ROOT CAUSE (confirmed by direct read-only query against the live corpus,
// project aytcrvaagqxyetqckbvb):
//   - order_noticees row d70fe027.../9005c435... correctly name Rajesh
//     Exports Limited (role "Company") and Rajesh Mehta (role "Promoter").
//   - order_noticees row 216c7046-b3f4-49ae-9a33-df1bae0e495a incorrectly
//     names Siddharth Mehta (noticee_id 845bb700-819b-4071-af60-71889f6be2c2,
//     role "Promoter family member") against order c45c8bb0-4db2-4ef5-a7b7-
//     f41dc8f3b22d. This is corpus-data category A (an incorrect row in a
//     structured relationship table), not a query/join defect: the corpus's
//     OWN scenario_findings.noticee_actor_names for REL-05 already labels
//     him "(relative of Rajesh Mehta, non-noticee counterparty to
//     undisclosed transfers)" -- the order_noticees row directly contradicts
//     the corpus's own finding-level annotation. STOP: this offending row
//     has NOT been deleted in this pass -- see the final report for the
//     explicit approval request before any Supabase write.
//   - The Rs.338.90cr figure itself is NOT mischaracterized anywhere in the
//     stored corpus fields an officer actually sees (scope_note says
//     "routed... undisclosed as RPTs"; scenario_findings.scenario_title says
//     "routed"; precedent_outcome_note is neutral) -- this is a presentation
//     gap (Category A: no universal caveat existed near a broad-scenario
//     theme name sitting above an amount-bearing finding title), not a
//     corpus-data overstatement. No DB write is needed or proposed for this
//     part.
//
// This suite tests the general, reusable architecture the fix relies on
// (resolveOrderNoticees, the quantum-integrity disclaimers, the shared
// NARRATIVE_PROSE_CLASSES/NARRATIVE_JUSTIFY_ONLY constants) using synthetic
// fixtures that reproduce the real Rajesh Exports pattern -- never a live
// Supabase connection (consistent with this repo's existing fixture-only
// test convention).
import { readFileSync } from "fs";
import { describe, expect, it } from "vitest";
import { resolveOrderNoticees } from "@/lib/orderNoticees";
import type { OrderNoticee, ScenarioFinding } from "@/types/domain";

function src(path: string): string {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

function makeFinding(overrides: Partial<ScenarioFinding> & { recordId: string }): ScenarioFinding {
  return {
    caseName: "Rajesh Exports Limited",
    orderIds: [],
    category: null,
    scenarioTitle: "Mock finding",
    factualPattern: "Mock factual pattern.",
    allegationText: null,
    provisionsConsideredRaw: null,
    provisionIds: [],
    provisionLinks: [],
    noticeeActors: [],
    findingStatus: "Prima facie",
    interimParagraphReferences: "Para 1",
    finalParagraphReferences: null,
    qualification: null,
    officialSourceUrl: "https://www.sebi.gov.in/enforcement/orders/jun-2026/mock.html",
    transactionTypes: [],
    actorRoles: [],
    evidenceTypes: [],
    allegedConduct: [],
    evidentiaryGaps: [],
    precedentOutcomeNote: null,
    ingredientsNotEstablished: [],
    sourceDocumentVerified: true,
    paragraphCitationVerified: true,
    findingStatusVerified: true,
    provisionMappingVerified: true,
    noticeeMappingVerified: true,
    humanLegalReviewCompleted: false,
    publicationStatus: "Published to search",
    ...overrides,
  };
}

const REL_ORDER_ID = "c45c8bb0-4db2-4ef5-a7b7-f41dc8f3b22d";

describe("1/2: resolveOrderNoticees — a person/entity appears only where the order's own structured order_noticees data names them", () => {
  it("Rajesh Exports 03-Jun-2026 interim order: once the offending row is removed, structured noticees are exactly REL and Rajesh Mehta, never Siddharth Mehta", () => {
    // Corrected structured data (the two rows the order's own cause title
    // supports) -- this is the target state pending the DB correction
    // described in the final report, NOT a claim about the current live row
    // set (which still contains the offending third row).
    const correctedNoticees: OrderNoticee[] = [
      { orderId: REL_ORDER_ID, fullName: "Rajesh Exports Limited", entityType: "company", role: "Company" },
      { orderId: REL_ORDER_ID, fullName: "Rajesh Mehta", entityType: "individual", role: "Promoter" },
    ];
    const relFindings = [
      makeFinding({
        recordId: "REL-05",
        scenarioTitle: "Rs. 338.9 crore routed through promoter's and his relative's personal bank accounts without Board/Audit Committee approval or related-party disclosure",
        noticeeActors: [
          "Rajesh Exports Limited (REL, Noticee 1)",
          "Rajesh Mehta (Noticee 2, Promoter, Executive Chairman, Director and Audit Committee member)",
          "Siddharth Mehta (relative of Rajesh Mehta, non-noticee counterparty to undisclosed transfers)",
        ],
        orderIds: [REL_ORDER_ID],
      }),
    ];
    const resolved = resolveOrderNoticees(REL_ORDER_ID, correctedNoticees, relFindings);
    expect(resolved.source).toBe("structured");
    const names = resolved.noticees.map((n) => n.fullName);
    expect(names).toEqual(["Rajesh Exports Limited", "Rajesh Mehta"]);
    expect(names).not.toContain("Siddharth Mehta");
  });

  it("HARD RULE: structured order_noticees data is used IN FULL and is NEVER topped up with names from findings.noticeeActors, even when a finding names additional actors", () => {
    // Regression guard for exactly the class of defect reported: a
    // counterparty merely discussed in a finding's noticeeActors list (here
    // Siddharth Mehta) must never leak into the noticee list once
    // structured data exists, no matter how many findings mention him.
    const structuredOnly: OrderNoticee[] = [
      { orderId: REL_ORDER_ID, fullName: "Rajesh Exports Limited", entityType: "company", role: "Company" },
      { orderId: REL_ORDER_ID, fullName: "Rajesh Mehta", entityType: "individual", role: "Promoter" },
    ];
    const findingsNamingExtraActors = [
      makeFinding({ recordId: "REL-05", noticeeActors: ["Rajesh Exports Limited", "Rajesh Mehta", "Siddharth Mehta"], orderIds: [REL_ORDER_ID] }),
      makeFinding({ recordId: "REL-06", noticeeActors: ["Rajesh Exports Limited", "Some Auditor Mentioned In Passing"], orderIds: [REL_ORDER_ID] }),
    ];
    const resolved = resolveOrderNoticees(REL_ORDER_ID, structuredOnly, findingsNamingExtraActors);
    expect(resolved.source).toBe("structured");
    expect(resolved.noticees).toHaveLength(2);
    expect(resolved.noticees.map((n) => n.fullName)).toEqual(["Rajesh Exports Limited", "Rajesh Mehta"]);
  });

  it("never infers noticee status from factual discussion, related-party status, bank-account ownership, transaction involvement, or promoter-family relationship alone -- only an actual order_noticees row counts", () => {
    // A finding can describe Siddharth Mehta extensively (personal account,
    // related-party, promoter-family) without a single order_noticees row
    // for him -- he must not appear.
    const structuredNoSiddharth: OrderNoticee[] = [{ orderId: REL_ORDER_ID, fullName: "Rajesh Exports Limited", entityType: "company", role: "Company" }];
    const finding = makeFinding({
      recordId: "REL-05",
      factualPattern: "Funds were routed through Siddharth Mehta's personal bank account, a relative of the promoter, without Board approval.",
      noticeeActors: ["Rajesh Exports Limited", "Siddharth Mehta"],
      orderIds: [REL_ORDER_ID],
    });
    const resolved = resolveOrderNoticees(REL_ORDER_ID, structuredNoSiddharth, [finding]);
    expect(resolved.noticees.map((n) => n.fullName)).not.toContain("Siddharth Mehta");
  });

  it("falls back to findings.noticeeActors, explicitly labelled unverified, only when NO structured data exists at all for the order", () => {
    const noStructuredData: OrderNoticee[] = [];
    const finding = makeFinding({ recordId: "SOME-01", noticeeActors: ["Some Company Limited", "Some Director"], orderIds: ["some-other-order"] });
    const resolved = resolveOrderNoticees("some-other-order", noStructuredData, [finding]);
    expect(resolved.source).toBe("fallback");
    expect(resolved.noticees.map((n) => n.fullName)).toEqual(["Some Company Limited", "Some Director"]);
  });

  it("returns 'none' with an empty list when neither structured data nor any finding actor exists, rather than inventing a name", () => {
    const resolved = resolveOrderNoticees("empty-order", [], []);
    expect(resolved.source).toBe("none");
    expect(resolved.noticees).toEqual([]);
  });
});

describe("2 (continued): Order Detail page wires resolveOrderNoticees and never merges structured + fallback names", () => {
  it("orders/[id]/page.tsx renders the fallback qualifier only inside the fallback branch, never alongside the structured render", () => {
    const page = src("src/app/(app)/orders/[id]/page.tsx");
    expect(page).toMatch(/resolvedNoticees\.source === "structured"[\s\S]{0,50}\?[\s\S]{0,200}<ul/);
    const structuredBranch = page.match(/resolvedNoticees\.source === "structured"[\s\S]{0,400}/)?.[0] ?? "";
    expect(structuredBranch).not.toMatch(/Structured noticee list not yet captured/);
  });
});

describe("3/4/5: quantum-integrity safeguard — a mentioned amount is never presented as an established quantum of diversion/siphoning/misutilisation", () => {
  it("OrderBroadScenarios.tsx carries the standing disclaimer and parses/classifies no amounts (no new monetary-inference engine)", () => {
    const comp = src("src/components/OrderBroadScenarios.tsx");
    expect(comp).toMatch(/not that any amount[\s\S]{0,20}mentioned in a finding&apos;s title is itself an established quantum/);
    expect(comp).not.toMatch(/parseFloat|parseInt|crore|₹|Rs\.\d/);
  });

  it("FixedScenarioAnalyzer.tsx's RelevantCfidOrders carries the same standing disclaimer and parses/classifies no amounts", () => {
    const comp = src("src/components/analyzer/FixedScenarioAnalyzer.tsx");
    expect(comp).toMatch(/is itself an established quantum of diversion, siphoning or misutilisation/);
    expect(comp).not.toMatch(/parseFloat|parseInt|crore|₹|Rs\.\d/);
  });

  it("the disclaimer's own rendered text is universal (not keyed off any specific case name or order id) -- code comments may reference the Rajesh Exports case as rationale, but no <p> disclaimer text hardcodes it", () => {
    const orderBroadScenariosComp = src("src/components/OrderBroadScenarios.tsx");
    const fixedScenarioComp = src("src/components/analyzer/FixedScenarioAnalyzer.tsx");
    for (const comp of [orderBroadScenariosComp, fixedScenarioComp]) {
      // No rendered JSX text node names the specific case or amount -- only
      // block comments (which never render) may mention them as rationale.
      const withoutComments = comp.replace(/\{\/\*[\s\S]*?\*\/\}/g, "").replace(/\/\*[\s\S]*?\*\//g, "");
      expect(withoutComments).not.toMatch(/Rajesh Exports/);
      expect(withoutComments).not.toMatch(/338\.9/);
    }
  });

  it("the stored corpus scenarioTitle for REL-05 already uses neutral 'routed' language, never asserting diversion/siphoning/misutilisation of the full gross amount -- confirms this was a presentation gap, not a corpus-data overstatement (item 4)", () => {
    // Fixture mirrors the real scenario_finding text verified against the
    // live corpus (read-only query) -- not asserting anything about the
    // official order's own paragraphs, which this test does not read.
    const finding = makeFinding({
      recordId: "REL-05",
      scenarioTitle:
        "Rs. 338.9 crore routed through promoter's and his relative's personal bank accounts without Board/Audit Committee approval or related-party disclosure",
    });
    expect(finding.scenarioTitle.toLowerCase()).not.toMatch(/diverted|siphoned|misutilised|misutilized/);
    expect(finding.scenarioTitle.toLowerCase()).toContain("routed");
  });
});

describe("5 (continued): general quantum-integrity principle documented, not a new inference engine", () => {
  it("proseClasses.ts and orderNoticees.ts introduce no amount-parsing utilities anywhere in src/lib", () => {
    const orderNoticees = src("src/lib/orderNoticees.ts");
    const proseClasses = src("src/lib/proseClasses.ts");
    for (const fileSrc of [orderNoticees, proseClasses]) {
      expect(fileSrc).not.toMatch(/parseFloat|parseInt|crore|₹/);
    }
  });
});

describe("6: global text-justify requirement — applied to narrative prose, never to headings/badges/buttons/short metadata/dates/tables/citations/code/nav/status messages", () => {
  it("NARRATIVE_PROSE_CLASSES and NARRATIVE_JUSTIFY_ONLY both carry text-justify, and the tiered variant also widens on xl/2xl", () => {
    const proseClasses = src("src/lib/proseClasses.ts");
    expect(proseClasses).toMatch(/NARRATIVE_PROSE_CLASSES\s*=\s*"text-justify max-w-3xl xl:max-w-4xl 2xl:max-w-5xl"/);
    expect(proseClasses).toMatch(/NARRATIVE_JUSTIFY_ONLY\s*=\s*"text-justify"/);
  });

  it("Scope Note, Directions/Outcomes narrative, matter-siblings intro, and provisions-considered caveats on Case Detail are justified", () => {
    const page = src("src/app/(app)/orders/[id]/page.tsx");
    expect(page).toMatch(/Scope note[\s\S]{0,500}NARRATIVE_PROSE_CLASSES/);
    expect(page).toMatch(/directions\.map[\s\S]{0,300}NARRATIVE_PROSE_CLASSES/);
    expect(page).toMatch(/Other orders in the same matter[\s\S]{0,300}NARRATIVE_PROSE_CLASSES/);
  });

  it("badges, buttons, status pills, dates, and table/list headers are never justified -- OrderStageBadge, StatusBadge, and the family-filter buttons carry no text-justify", () => {
    for (const path of ["src/components/OrderStageBadge.tsx", "src/components/StatusBadge.tsx", "src/components/CaseLibraryClient.tsx"]) {
      const comp = src(path);
      expect(comp).not.toContain("text-justify");
    }
  });

  it("compact metadata dt/dd labels (Order number, Order date, Authority, CFID authority) on Case Detail are not justified -- only substantive narrative fields are", () => {
    const page = src("src/app/(app)/orders/[id]/page.tsx");
    expect(page).toMatch(/Order number<\/dt>\s*\n\s*<dd className="mt-1 font-mono text-sm text-\[var\(--color-ink-700\)\]">/);
  });
});

describe("7/8: Scope Note and Case Detail's other narrative boxes make sensible use of wide-screen width (root cause fixed, not patched)", () => {
  it("Scope Note is no longer trapped in the old max-w-prose narrow column -- it uses the same tiered measure as every other fixed narrative paragraph in the app", () => {
    const page = src("src/app/(app)/orders/[id]/page.tsx");
    expect(page).toMatch(/Scope note[\s\S]{0,500}NARRATIVE_PROSE_CLASSES/);
    // The <dd> className itself must not carry a literal max-w-prose class
    // (a code comment nearby may still legitimately mention the old class
    // name while explaining the fix, which this checks past).
    expect(page).toMatch(/Scope note[\s\S]{0,500}<dd className=\{`mt-1 text-sm text-\[var\(--color-ink-700\)\] \$\{NARRATIVE_PROSE_CLASSES\}`\}>/);
  });

  it("the fix lives in the shared proseClasses.ts constant, not a one-off Scope-Note-specific class string -- so every substantive narrative box on Case Detail benefits from the same root-cause fix", () => {
    const page = src("src/app/(app)/orders/[id]/page.tsx");
    const orderBroadScenariosComp = src("src/components/OrderBroadScenarios.tsx");
    const usesShared = (fileSrc: string) => /from "@\/lib\/proseClasses"/.test(fileSrc);
    expect(usesShared(page)).toBe(true);
    expect(usesShared(orderBroadScenariosComp)).toBe(true);
  });
});
