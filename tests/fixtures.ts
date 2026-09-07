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

type RawFinding = Omit<ScenarioFinding, "provisionLinks" | "findingStatus" | "publicationStatus"> & {
  provisionLinks?: ScenarioFinding["provisionLinks"];
  findingStatus: string;
  publicationStatus?: ScenarioFinding["publicationStatus"];
};

// This pilot-era generated JSON predates both per-provision tag attribution
// and the "Upheld"/"Not upheld" -> final-order-language rename, so both are
// bridged at load time rather than hand-editing the generated file.
const LEGACY_STATUS_LABELS: Record<string, ScenarioFinding["findingStatus"]> = {
  Upheld: "Confirmed in Final Order",
  "Partly upheld": "Partly Confirmed in Final Order",
  "Not upheld": "Not Confirmed in Final Order",
};

// This pilot-era generated JSON predates per-provision tag attribution
// (finding_provisions.justifying_tags — see engine.ts / migration
// 0010_finding_provisions_justifying_tags.sql). Derive universal links
// (empty justifyingTags, same as the pre-attribution behavior) from the
// flat provisionIds list — these fixtures test general matching behavior,
// not narrow-scope attribution, which has its own dedicated test file.
// It also predates the publication/quarantine lifecycle (migration
// 0015_publication_status.sql); every one of these findings is presently
// live in the database as "Published to search", so that is the default
// applied here — never a claim that a fresh review set it that way.
export const scenarioFindings = (scenarioFindingsJson as RawFinding[]).map(
  (f): ScenarioFinding => ({
    ...f,
    findingStatus: LEGACY_STATUS_LABELS[f.findingStatus] ?? (f.findingStatus as ScenarioFinding["findingStatus"]),
    provisionLinks: f.provisionLinks ?? f.provisionIds.map((provisionId) => ({ provisionId, justifyingTags: [] })),
    publicationStatus: f.publicationStatus ?? "Published to search",
  })
);
export const provisions = provisionsJson as LegalProvision[];
export const legalTests = legalTestsJson as LegalTest[];
