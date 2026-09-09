// Order-stage metadata correction pass: data-integrity regression tests.
//
// This project deliberately has NO runtime order-type classification
// engine — order_type is stored corpus metadata, set once at import/
// migration time from the actual official SEBI document, never derived
// from title text at request time (see the governing classification rule
// in supabase/migrations/0024_order_type_governing_classification_
// corrections.sql). These tests therefore protect the CURATED RESULT —
// the migration file's own exact UPDATE targets, and known-correct rows
// already in the corpus — rather than exercising a second, uncontrolled
// classification engine of their own. Fixture ids/order_numbers below are
// real production values (see this pass's own final report), the same
// "grounded fixture" convention tests/case-journey.test.ts already uses.
import { readFileSync } from "fs";
import { describe, expect, it } from "vitest";

const MIGRATION = readFileSync(
  new URL("../supabase/migrations/0024_order_type_governing_classification_corrections.sql", import.meta.url),
  "utf8"
);

/** Each `update orders ... ;` statement in this migration, isolated as its
 * own block, so an assertion about one row can never accidentally match a
 * neighbouring row's clause. */
const UPDATE_STATEMENTS = MIGRATION.split(/(?=^update orders$)/m).filter((s) => s.trim().startsWith("update orders"));

function statementFor(id: string): string {
  const stmt = UPDATE_STATEMENTS.find((s) => s.includes(`id = '${id}'`));
  if (!stmt) throw new Error(`No UPDATE statement found for id ${id}`);
  return stmt;
}

// ---------------------------------------------------------------------
// 1. Migration source guard: plain SEBI "Order" -> final_order (rule 3).
// ---------------------------------------------------------------------
describe("migration 0024: plain 'Order' documents corrected to final_order", () => {
  const cases: { id: string; orderNumber: string; caseLabel: string }[] = [
    { id: "fdf46fec-831a-411e-ba10-0f382cd51e40", orderNumber: "QJA/SS/CFID/CFID-SEC6/32688/2026-27", caseLabel: "Tarapur Transformers Limited" },
    { id: "1ee13f3e-c32e-41b1-8d66-2194ef11dea8", orderNumber: "QJA/MN/CFID/CFID-TPD/32406/2026-27", caseLabel: "Bajaj Hindusthan Sugar Limited" },
    { id: "d7d6a9fb-8f89-467e-ac63-66186bd9c445", orderNumber: "QJA/MN/CFID/CFID-SEC6/32159/2025-26", caseLabel: "Mediaone Global Entertainment Limited" },
    { id: "8d684f48-5a41-45b9-9828-5e82ee6f0928", orderNumber: "QJA/MN/CFID/CFID-SEC5/32160/2025-26", caseLabel: "Arcotech Ltd" },
    { id: "5995ced6-1397-42e7-8dc0-9224be4c6375", orderNumber: "QJA/SS/CFID/CFID-SEC5/31818/2025-26", caseLabel: "Droneacharya Aerial Innovations Ltd" },
    { id: "9a0cc27a-8974-452b-be1a-c357af484e3a", orderNumber: "WTM/AN/CFID/CFID/31591/2025-26", caseLabel: "Dewan Housing Finance Corporation Ltd" },
    { id: "8a011f8b-aa7b-4f78-abfb-a607ea7eb39e", orderNumber: "QJA/GR/CFID/CFID/30579/2024-25", caseLabel: "Binny Ltd" },
    { id: "3cbb2aea-bd2b-4fd8-8e80-5de38a1c21df", orderNumber: "QJA/AA/CFID/CFID/30318/2024-25", caseLabel: "Setubandhan Infrastructure Ltd" },
    { id: "326921bb-8bf5-4261-b874-ef1e0d132d8f", orderNumber: "WTM/ASB/CFID/CFID-SEC4/30313/2024-25", caseLabel: "Manpasand Beverages Ltd" },
    { id: "7e05cfdc-c1d0-4300-be9b-e9bc8323d510", orderNumber: "WTM/ASB/CFID/CFID/26926/2023-24", caseLabel: "Sharon Bio-Medicine Ltd (final order)" },
    { id: "9a8d5b4f-a6f7-4ea9-8d7a-f7eb1a209e72", orderNumber: "QJA/SP/CFID/CFID-SEC4/26875/2023-24", caseLabel: "Magnum Ventures Ltd" },
  ];

  for (const { id, orderNumber, caseLabel } of cases) {
    it(`${caseLabel}: id ${id} is set to final_order, keyed on its exact id AND order_number`, () => {
      const block = statementFor(id);
      expect(block).toContain("order_type = 'final_order'");
      expect(block).toContain(`order_number = '${orderNumber}'`);
    });
  }

  it("never mass-converts every 'other' row to final_order -- exactly 11 final_order corrections are present in Group A", () => {
    const finalOrderSets = MIGRATION.match(/set order_type = 'final_order'/g) ?? [];
    expect(finalOrderSets).toHaveLength(11);
  });
});

// ---------------------------------------------------------------------
// 2. Par Drugs: explicit EX-PARTE INTERIM ORDER -> interim_order.
// ---------------------------------------------------------------------
describe("migration 0024: Par Drugs 15-09-2025 corrected to interim_order", () => {
  const PAR_DRUGS_INTERIM_ID = "39d66f9f-14b2-4441-9fa4-b76d9bcd75d9";

  it("sets order_type = interim_order for the exact id + order_number, and does not touch the 25-03-2026 Confirmatory Order", () => {
    const block = statementFor(PAR_DRUGS_INTERIM_ID);
    expect(block).toContain("order_type = 'interim_order'");
    expect(block).toContain("order_number = 'WTM/KV/CFID/CFID-SEC4/31660/2025-26'");
    // The Confirmatory Order's own id must never appear as an UPDATE target.
    expect(MIGRATION).not.toContain("id = 'ce0b50a9-8052-4247-ac11-2f7914dea82d'");
  });

  it("does not fabricate an official_order_title for Par Drugs -- only the document TYPE was evidenced, not its exact printed caption", () => {
    expect(statementFor(PAR_DRUGS_INTERIM_ID)).not.toContain("official_order_title");
  });
});

// ---------------------------------------------------------------------
// 3. Suzlon 29-05-2026: adjudication_order -> other, NOT a routine
// Adjudication Order.
// ---------------------------------------------------------------------
describe("migration 0024: Suzlon 29-05-2026 corrected from adjudication_order to other", () => {
  const SUZLON_ID = "3824c4b9-ae67-4e1b-9d59-dcfbe02120d9";

  it("sets order_type = other, keyed on its exact id, and populates its exact special statutory title", () => {
    const block = statementFor(SUZLON_ID);
    expect(block).toContain("order_type = 'other'");
    expect(block).toContain("Section 15I(3)");
    expect(block).toContain("Section 23I(3)");
    expect(block).toContain("SCRA");
  });

  it("never sets this row to adjudication_order anywhere in the migration", () => {
    expect(statementFor(SUZLON_ID)).not.toContain("adjudication_order");
  });
});

// ---------------------------------------------------------------------
// 4. Rows that must remain "other" -- never touched by this migration.
// ---------------------------------------------------------------------
describe("migration 0024: Corrigendum/Miscellaneous/disposal rows are never touched", () => {
  const preservedOtherIds = [
    "e7ce7769-2bc6-4fec-8bcc-d6f32275f0f0", // Setco Automotive -- Corrigendum
    "f1a76e2f-8a77-4505-a5b2-d4595bb3e57a", // Reliance Home Finance -- Corrigendum
    "fc143f0e-c71c-4dc2-9c99-c192c8ec1925", // Linde India -- Corrigendum
    "9a60020b-a5ec-4bcd-8059-5511a78242f7", // Eros International Media -- Corrigendum
    "3cd99d52-1d52-416d-8800-f1465a7c8008", // Sharon Bio-Medicine -- Corrigendum
    "244793a9-326f-4b1e-b12c-4b6e87dbd1b3", // Ricoh India -- Corrigendum
    "0e0b996a-18d9-455e-b1b7-14e73a6b04c7", // Bombay Dyeing -- disposal of representation
    "6b5636bd-97eb-4794-a7aa-64927f206550", // CG Power -- Miscellaneous Order
    "ddd69916-a15b-42c2-b040-6f42ed9bec0b", // Linde -- Miscellaneous Order
  ];

  it.each(preservedOtherIds)("id %s never appears as an UPDATE target in migration 0024", (id) => {
    expect(MIGRATION).not.toContain(`id = '${id}'`);
  });
});

// ---------------------------------------------------------------------
// 5. Control cases: Future Retail and Max Financial Services are already
// correctly final_order and are never touched by this migration.
// ---------------------------------------------------------------------
describe("migration 0024: Future Retail and Max Financial Services controls are untouched", () => {
  it("neither control id appears anywhere in the migration", () => {
    expect(MIGRATION).not.toContain("225695fa-1b33-40a2-8248-bff2aee99154"); // Future Retail
    expect(MIGRATION).not.toContain("b5de6f63-4823-4b60-b4ff-ec673b3a9e5b"); // Max Financial Services
  });
});

// ---------------------------------------------------------------------
// 6. Migration only ever touches orders.order_type/official_order_title
// -- never matter_id, findings, provisions, directions, noticees,
// relationships, or official_url.
// ---------------------------------------------------------------------
describe("migration 0024: scope guard -- no legal-provision, findings, or Analyzer changes", () => {
  it("contains no INSERT (never creates a duplicate/new order)", () => {
    expect(MIGRATION.toLowerCase()).not.toMatch(/\binsert\s+into\b/);
  });

  it("contains no DELETE", () => {
    expect(MIGRATION.toLowerCase()).not.toMatch(/\bdelete\s+from\b/);
  });

  it("never updates matter_id, scenario_findings, finding_provisions, order_directions, order_noticees, order_relationships, or official_url", () => {
    expect(MIGRATION).not.toMatch(/set[\s\S]*matter_id\s*=/);
    expect(MIGRATION.toLowerCase()).not.toMatch(/update\s+scenario_findings/);
    expect(MIGRATION.toLowerCase()).not.toMatch(/update\s+finding_provisions/);
    expect(MIGRATION.toLowerCase()).not.toMatch(/update\s+order_directions/);
    expect(MIGRATION.toLowerCase()).not.toMatch(/update\s+order_noticees/);
    expect(MIGRATION.toLowerCase()).not.toMatch(/update\s+order_relationships/);
    expect(MIGRATION).not.toMatch(/set[\s\S]*official_url\s*=/);
  });

  it("touches only the orders table", () => {
    // Anchored to the start of a line so this only matches actual SQL
    // statements, never a comment sentence that happens to contain the
    // word "update" (e.g. "Every UPDATE is naturally idempotent...").
    const updateTargets = [...MIGRATION.matchAll(/^update\s+(\w+)/gim)].map((m) => m[1].toLowerCase());
    expect(updateTargets.length).toBeGreaterThan(0);
    expect(new Set(updateTargets)).toEqual(new Set(["orders"]));
  });
});

// ---------------------------------------------------------------------
// 7. General governing-rule regression: explicit special types elsewhere
// in the ALREADY-CURATED corpus retain their actual character -- these
// rows are untouched by migration 0024 (they were already correct) and
// are asserted here as fixed, real, grounded facts, never derived from
// a title parser.
// ---------------------------------------------------------------------
describe("governing classification rule: explicit special types are preserved corpus-wide", () => {
  it("Seacoast Shipping Services Limited's interim (ad32246b-...) and final (cbe246c9-...) orders -- explicit Interim-cum-SCN and Final types -- are untouched by migration 0024", () => {
    // Full grounded fixture (order_type/dates/relationship) already lives in
    // tests/case-journey.test.ts; this test only guards that this pass's
    // migration never touches either id, so their already-correct types
    // (interim_cum_show_cause_notice / final_order) can never be silently
    // mass-converted by a "plain Order" rule applied too broadly.
    expect(MIGRATION).not.toContain("ad32246b-0593-45b3-bd53-14c590161145");
    expect(MIGRATION).not.toContain("cbe246c9-02d5-482f-966a-c140860b7af5");
  });

  it("Par Drugs 25-03-2026 (explicit Confirmatory Order, id ce0b50a9-8052-4247-ac11-2f7914dea82d) remains confirmatory_order -- untouched by migration 0024", () => {
    expect(MIGRATION).not.toContain("ce0b50a9-8052-4247-ac11-2f7914dea82d");
  });

  it("Sunedison Infrastructure Limited 28-07-2022 (explicit Revocation Order, id 531ff5bf-ce13-4cae-b2b4-46cf5440d6d4) is a real revocation_order example, untouched by migration 0024", () => {
    expect(MIGRATION).not.toContain("531ff5bf-ce13-4cae-b2b4-46cf5440d6d4");
  });
});
