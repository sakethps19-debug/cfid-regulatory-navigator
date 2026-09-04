// Fixture data for the deterministic matching-engine tests. These are the
// known-good, human-curated scenario findings, provisions and legal tests
// for the 3 deep-analyzed pilot orders (Rajesh Exports Limited; Seacoast
// Shipping Services Limited interim + final). Sourced from the same
// generated JSON that seeded the live database (see scripts/import-data.ts),
// kept as static fixtures here so engine tests stay fast, deterministic and
// independent of any live Postgres connection.
import type { LegalProvision, LegalTest, ScenarioFinding } from "@/types/domain";

import scenarioFindingsJson from "@/data/generated/scenarioFindings.json";
import provisionsJson from "@/data/generated/provisions.json";
import legalTestsJson from "@/data/generated/legalTests.json";

export const scenarioFindings = scenarioFindingsJson as ScenarioFinding[];
export const provisions = provisionsJson as LegalProvision[];
export const legalTests = legalTestsJson as LegalTest[];
