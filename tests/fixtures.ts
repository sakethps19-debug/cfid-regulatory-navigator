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

type RawFinding = Omit<ScenarioFinding, "provisionLinks"> & { provisionLinks?: ScenarioFinding["provisionLinks"] };

// This pilot-era generated JSON predates per-provision tag attribution
// (finding_provisions.justifying_tags — see engine.ts / migration
// 0010_finding_provisions_justifying_tags.sql). Derive universal links
// (empty justifyingTags, same as the pre-attribution behavior) from the
// flat provisionIds list — these fixtures test general matching behavior,
// not narrow-scope attribution, which has its own dedicated test file.
export const scenarioFindings = (scenarioFindingsJson as RawFinding[]).map(
  (f): ScenarioFinding => ({
    ...f,
    provisionLinks: f.provisionLinks ?? f.provisionIds.map((provisionId) => ({ provisionId, justifyingTags: [] })),
  })
);
export const provisions = provisionsJson as LegalProvision[];
export const legalTests = legalTestsJson as LegalTest[];
