// Regression guards for the Provision Detail / Source Library source-status
// overhaul: order_cited_text_only must never be presented as "current
// statutory text", Source Library's provision-text summary must be
// live-computed (never the old hardcoded blanket claim), and both surfaces
// must share exactly one provenance-label module (src/lib/provisionTextProvenance.ts)
// rather than duplicating strings that could drift apart.
import { readFileSync } from "fs";
import { describe, expect, it } from "vitest";
import {
  countProvisionTextProvenance,
  PROVISION_TEXT_PROVENANCE,
  provisionTextProvenance,
  type ProvisionTextProvenanceStatus,
} from "@/lib/provisionTextProvenance";
import type { ProvisionVersion } from "@/types/domain";

const src = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf-8");

const ALL_STATUSES: ProvisionTextProvenanceStatus[] = [
  "officially_verified",
  "order_cited_text_only",
  "requires_verification",
];

function makeVersion(overrides: Partial<ProvisionVersion> & { id: string; status: ProvisionTextProvenanceStatus }): ProvisionVersion {
  return {
    provisionId: "PFUTP-4-2-e",
    versionLabel: "v1",
    effectiveFrom: null,
    effectiveTo: null,
    exactText: "Sample provision text.",
    sourceUrl: "https://www.sebi.gov.in/legal/regulations/mock",
    ...overrides,
  };
}

describe("provisionTextProvenance mapping", () => {
  it("covers all three provision_versions statuses with a distinct label", () => {
    for (const status of ALL_STATUSES) {
      expect(PROVISION_TEXT_PROVENANCE[status]).toBeDefined();
    }
    const labels = ALL_STATUSES.map((s) => PROVISION_TEXT_PROVENANCE[s].label);
    expect(new Set(labels).size).toBe(ALL_STATUSES.length);
  });

  it("never describes order_cited_text_only as current statutory text, in either its label or description", () => {
    const { label, description } = provisionTextProvenance("order_cited_text_only");
    expect(label.toLowerCase()).not.toContain("current statutory text");
    expect(description.toLowerCase()).not.toContain("current statutory text");
    // And it must actively warn against exactly that misreading.
    expect(description.toLowerCase()).toMatch(/not.*(independent|current statutory)/);
  });

  it("order_cited_text_only's own label never claims to BE officially verified", () => {
    const { label } = provisionTextProvenance("order_cited_text_only");
    expect(label.toLowerCase()).not.toBe("officially verified");
    expect(label.toLowerCase()).not.toContain("verified");
  });

  it("officially_verified is the only status whose label claims verification against the official source", () => {
    for (const status of ALL_STATUSES) {
      const mentionsVerified = PROVISION_TEXT_PROVENANCE[status].label.toLowerCase().includes("verified");
      expect(mentionsVerified).toBe(status === "officially_verified");
    }
  });
});

describe("countProvisionTextProvenance", () => {
  it("tallies versions by status and never conflates a zero-version provision with requires_verification", () => {
    const versionsByProvisionId = new Map<string, ProvisionVersion[]>([
      ["PFUTP-4-2-e", [makeVersion({ id: "v1", status: "officially_verified" })]],
      [
        "PFUTP-3-1",
        [
          makeVersion({ id: "v2", status: "order_cited_text_only" }),
          makeVersion({ id: "v3", status: "requires_verification" }),
        ],
      ],
    ]);
    // totalProvisionCount (5) exceeds the 2 provisions that have any version
    // row on file -- the other 3 must show up as "no version on file", not
    // silently dropped and not folded into requiresVerificationVersions.
    const counts = countProvisionTextProvenance(5, versionsByProvisionId);
    expect(counts.officiallyVerifiedVersions).toBe(1);
    expect(counts.orderCitedTextOnlyVersions).toBe(1);
    expect(counts.requiresVerificationVersions).toBe(1);
    expect(counts.totalVersions).toBe(3);
    expect(counts.provisionsWithNoVersionOnFile).toBe(3);
  });

  it("never returns a negative provisionsWithNoVersionOnFile even if the version map somehow exceeds the provision count", () => {
    const versionsByProvisionId = new Map<string, ProvisionVersion[]>([
      ["P-1", [makeVersion({ id: "v1", status: "officially_verified" })]],
      ["P-2", [makeVersion({ id: "v2", status: "officially_verified" })]],
    ]);
    const counts = countProvisionTextProvenance(1, versionsByProvisionId);
    expect(counts.provisionsWithNoVersionOnFile).toBe(0);
  });

  it("a provision with zero recorded versions is absent from the map, exercising the no-version bucket alone", () => {
    const counts = countProvisionTextProvenance(1, new Map());
    expect(counts.totalVersions).toBe(0);
    expect(counts.provisionsWithNoVersionOnFile).toBe(1);
  });
});

describe("Source Library: provision-text summary is live-computed, not hardcoded", () => {
  const pageSrc = src("src/app/(app)/library/page.tsx");

  it("no longer contains the old stale blanket claim that current statutory text is never reproduced", () => {
    expect(pageSrc).not.toMatch(/Current statutory text for each provision is not reproduced/i);
  });

  it("computes its provision-text counts via the shared countProvisionTextProvenance helper rather than a literal number", () => {
    expect(pageSrc).toContain("countProvisionTextProvenance");
    expect(pageSrc).toContain("getProvisionVersionsByProvisionId");
  });

  it("accounts for provisions with no version data at all as an explicit bucket", () => {
    expect(pageSrc).toContain("provisionsWithNoVersionOnFile");
  });
});

describe("Provision Detail and Source Library share exactly one provenance module", () => {
  const provisionDetailSrc = src("src/app/(app)/provisions/[id]/page.tsx");
  const librarySrc = src("src/app/(app)/library/page.tsx");

  it("Provision Detail imports from src/lib/provisionTextProvenance", () => {
    expect(provisionDetailSrc).toMatch(/from ["']@\/lib\/provisionTextProvenance["']/);
  });

  it("Source Library imports from src/lib/provisionTextProvenance", () => {
    expect(librarySrc).toMatch(/from ["']@\/lib\/provisionTextProvenance["']/);
  });

  it("neither page hardcodes its own copy of the three status labels instead of importing them", () => {
    // A literal object keyed by all three raw status strings would indicate
    // a duplicated mapping instead of an import from the shared module.
    const duplicateMapPattern = /officially_verified["']?\s*:\s*\{[\s\S]{0,120}order_cited_text_only["']?\s*:/;
    expect(provisionDetailSrc).not.toMatch(duplicateMapPattern);
    expect(librarySrc).not.toMatch(duplicateMapPattern);
  });

  it("Provision Detail never labels order-cited-only text as current statutory text on the page itself", () => {
    expect(provisionDetailSrc.toLowerCase()).not.toContain("current statutory text");
  });
});
