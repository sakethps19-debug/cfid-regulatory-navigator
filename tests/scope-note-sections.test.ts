// Post-freeze correction pass (Section I): parseScopeNoteSections is a
// purely presentational parser for orders.scope_note -- it must never
// rewrite, summarise, or reorder a single word of the stored text, only
// detect an existing "intro: (1) ...; (2) ..." / "Directions: ..."
// convention (when present) and split it for display. Fixture text below
// is the ACTUAL Rajesh Exports Limited interim order scope_note (queried
// read-only from production during this pass), so these tests are
// grounded in the real regression case, not a synthetic approximation.
import { readFileSync } from "fs";
import { describe, expect, it } from "vitest";
import { parseScopeNoteSections } from "@/lib/scopeNoteSections";

const REL_SCOPE_NOTE =
  'Ad-interim ex-parte interim order re Rajesh Exports Limited (REL, gold refiner/exporter, brand SHUBH Jewellers) and promoter/Executive Chairman Rajesh Mehta. Prima facie findings (investigation ongoing, not yet final): (1) fictitious sale/purchase transactions worth Rs.11,487cr/11,488cr fabricated against Rajesh Mehta\'s personal gold-derivative trading losses via stockbroker Affluence (which confirmed REL was never its client); (2) consolidated financials ~99% dependent on unverifiable overseas subsidiary revenue via an internally-contradictory consolidation methodology; (3) untraceable Rs.1,035cr "Investment in Gold Mines in Africa"; (4) opaque netting of Rs.2,914cr receivables against payables and unreconciled intra-group investments/payables; (5) Rs.338.9cr routed through Rajesh Mehta\'s/Siddharth Mehta\'s personal accounts undisclosed as RPTs; (6) non-cooperation/obstruction of SEBI and the Forensic Auditor (withheld ERP/books, contradictory submissions across 3 stages). Directions: Rajesh Mehta (Noticee 2) restrained from dealing in REL securities until further orders; REL (Noticee 1) directed to cooperate and make true LODR disclosures; no penalties yet imposed (investigation to continue with new forensic auditor); matter referred to NFRA re statutory auditors.';

describe("parseScopeNoteSections: Rajesh Exports Limited (real production scope_note)", () => {
  const result = parseScopeNoteSections(REL_SCOPE_NOTE);

  it("splits the intro clause ending in ':' from the six enumerated findings", () => {
    expect(result.intro).toMatch(/^Ad-interim ex-parte interim order re Rajesh Exports Limited/);
    expect(result.intro).toMatch(/Prima facie findings \(investigation ongoing, not yet final\):$/);
    expect(result.listItems).toHaveLength(6);
  });

  it("strips only the '(N) ' numbering markers, never any other word of each item", () => {
    expect(result.listItems[0]).toMatch(/^fictitious sale\/purchase transactions worth Rs\.11,487cr\/11,488cr/);
    expect(result.listItems[0]).not.toMatch(/^\(1\)/);
    expect(result.listItems[4]).toMatch(/^Rs\.338\.9cr routed through Rajesh Mehta's\/Siddharth Mehta's personal accounts undisclosed as RPTs\.?$/);
  });

  it("never converts the Rs.338.9cr figure into 'diverted' language -- the parser touches no words, only boundaries", () => {
    expect(result.listItems.join(" ").toLowerCase()).not.toMatch(/divert/);
    expect(result.directions!.toLowerCase()).not.toMatch(/divert/);
  });

  it("extracts the Directions clause separately, verbatim", () => {
    expect(result.directions).toMatch(/^Rajesh Mehta \(Noticee 2\) restrained from dealing in REL securities/);
    expect(result.directions).toMatch(/matter referred to NFRA re statutory auditors\.$/);
    expect(result.directions).not.toMatch(/^Directions:/); // marker itself is stripped, not duplicated
  });

  it("reassembling intro + numbered items + directions reproduces the exact original text (no word lost, none added)", () => {
    const reassembled =
      result.intro +
      " " +
      result.listItems.map((item, i) => `(${i + 1}) ${item}`).join("; ") +
      " Directions: " +
      result.directions;
    expect(reassembled).toBe(REL_SCOPE_NOTE);
  });
});

describe("parseScopeNoteSections: generic fallback for scope notes that don't follow the enumerated convention", () => {
  it("a plain single-paragraph scope note (the common case) returns it unchanged as intro, with no list and no directions", () => {
    const plain = "Final order confirming diversion of issue proceeds; Rs. 4.2 crore disgorgement ordered with interest.";
    const result = parseScopeNoteSections(plain);
    expect(result.intro).toBe(plain);
    expect(result.listItems).toEqual([]);
    expect(result.directions).toBeNull();
  });

  it("a scope note with a 'Directions:' clause but no enumerated list still splits directions out, with intro holding the rest unchanged", () => {
    const text = "Interim order finds prima facie diversion of funds. Directions: Noticee restrained from the securities market until further orders.";
    const result = parseScopeNoteSections(text);
    expect(result.intro).toBe("Interim order finds prima facie diversion of funds.");
    expect(result.listItems).toEqual([]);
    expect(result.directions).toBe("Noticee restrained from the securities market until further orders.");
  });

  it("a single stray '(1)' with no genuine second item never renders as a fabricated one-item list -- falls back to the plain paragraph", () => {
    const text = 'The Company\'s registered office is at (1) MG Road, Bengaluru, as per its incorporation documents.';
    const result = parseScopeNoteSections(text);
    expect(result.listItems).toEqual([]);
    expect(result.intro).toBe(text);
  });

  it("empty string input returns an empty intro, no list, no directions -- never throws", () => {
    const result = parseScopeNoteSections("");
    expect(result.intro).toBe("");
    expect(result.listItems).toEqual([]);
    expect(result.directions).toBeNull();
  });
});

describe("Order Detail page: Scope Note rendering preserves exact substance and layout-only change", () => {
  const page = readFileSync(new URL("../src/app/(app)/orders/[id]/page.tsx", import.meta.url), "utf8");

  it("uses parseScopeNoteSections generically -- no conditional keyed on this order's own case name/id", () => {
    expect(page).toMatch(/parseScopeNoteSections/);
    expect(page).not.toMatch(/order\.caseName\s*===\s*"Rajesh Exports Limited"/);
    expect(page).not.toMatch(/order\.id\s*===\s*"[^"]*rel[^"]*"/i);
  });

  it("falls back to a single paragraph (no bulleted list) when parseScopeNoteSections finds no enumerated items", () => {
    expect(page).toMatch(/listItems\.length === 0/);
  });
});
