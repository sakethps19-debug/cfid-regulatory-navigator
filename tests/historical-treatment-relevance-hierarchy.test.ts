// Demo-priority presentation pass: Historical Treatment's entry ordering
// must rank CURRENT-SCENARIO applicability (Question A) before HISTORICAL
// FREQUENCY (Question B) — see applicabilitySectionRank/
// isPresentScenarioRelevant in historicalTreatment.ts. Before this pass,
// entries.sort() ranked purely by presentationTier (fact-attribution
// richness) and comparableMatterCount (historical volume), with no
// reference to currentCandidateTier at all — so a provision cited in
// dozens of historical matters but currently gate-blocked on the present
// facts could visually outrank a genuine primary candidate with only a
// handful of historical matters. These tests assert the fix purely via
// analyzeScenario()'s output order — no rendering, no UI — using the SAME
// frozen legal engine (no rule, no comparability scoring, no matter
// identity logic, no outcome aggregation touched by this pass).
import { describe, expect, it } from "vitest";
import { analyzeScenario } from "@/lib/matching/engine";
import type { LegalProvision, ScenarioFinding } from "@/types/domain";

function makeFinding(overrides: Partial<ScenarioFinding>): ScenarioFinding {
  const provisionIds = overrides.provisionIds ?? [];
  const provisionLinks =
    overrides.provisionLinks ?? provisionIds.map((provisionId) => ({ provisionId, justifyingTags: [] as string[] }));
  return {
    recordId: "MOCK-01",
    caseName: "Mock Case Limited",
    orderIds: [],
    category: null,
    scenarioTitle: "Mock finding",
    factualPattern: "Mock factual pattern.",
    provisionsConsideredRaw: null,
    provisionIds,
    provisionLinks,
    noticeeActors: [],
    findingStatus: "Confirmed in Final Order",
    interimParagraphReferences: "Para 1",
    finalParagraphReferences: "Para 10",
    qualification: null,
    officialSourceUrl: "https://www.sebi.gov.in/enforcement/orders/mock",
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

function makeProvision(overrides: Partial<LegalProvision>): LegalProvision {
  return {
    id: "MOCK-PROVISION",
    instrument: "Mock Instrument",
    provisionNumber: "Mock 1",
    subject: null,
    currentTextVerificationStatus: "Requires verification",
    officialSource: null,
    ordersConsidered: ["Mock Case Limited"],
    treatmentInPilotOrders: "Cited in 1 finding.",
    lawLibraryNote: null,
    ...overrides,
  };
}

function link(provisionId: string, justifyingTags: string[] = []) {
  return { provisionId, justifyingTags };
}

// Real, currently-gated provisions (frozen engine, unchanged rules):
// LODR-23-2 requires related_party_transaction connected to an RPT
// process-lapse fact — a genuine primary candidate for the RPT-only query
// below. LODR-30 requires material_event_disclosure connected to a
// non-disclosure fact — a real provision that stays gate-blocked when the
// query never mentions a material event/loan-default/disclosure-to-
// exchange fact, exactly the PFUTP/12A-family symptom this pass fixes.
const rpt232 = makeProvision({ id: "LODR-23-2", provisionNumber: "Regulation 23(2)", subject: "Prior Audit Committee approval of RPTs" });
const reg30 = makeProvision({ id: "LODR-30", provisionNumber: "Regulation 30", subject: "Disclosure of material events/information to stock exchanges" });

const RPT_ONLY_SCENARIO =
  "A listed company entered into a related-party transaction without prior Audit Committee approval. There was a misrepresented related party dealing recorded in the disclosures.";

describe("Historical Treatment relevance hierarchy — current applicability ranks before historical volume", () => {
  it("1/2. a primary candidate with few historical matters ranks above a gate-blocked provision with many historical matters", () => {
    const primaryFinding = makeFinding({
      recordId: "RPT-01",
      caseName: "RPT Matter Ltd.",
      allegedConduct: ["related_party_misrepresentation"],
      transactionTypes: ["related_party_transaction"],
      provisionIds: [rpt232.id],
      provisionLinks: [link(rpt232.id, ["related_party_transaction", "related_party_misrepresentation"])],
    });
    // Three UNRELATED historical matters (material-event disclosure, no
    // RPT content at all) all citing LODR-30 with real curated
    // justifyingTags — enough historical volume that, before this fix,
    // presentationTier + comparableMatterCount alone would have put
    // LODR-30 ahead of the RPT provisions.
    const volumeFindings = [1, 2, 3].map((n) =>
      makeFinding({
        recordId: `VOL-0${n}`,
        caseName: `Volume Matter ${n} Ltd.`,
        // Deliberately overlaps the QUERY's own detected concepts
        // (related_party_transaction / related_party_misrepresentation),
        // exactly mirroring how a real PFUTP/12A historical finding often
        // ALSO carries RPT-adjacent tags — enough overlap to reach
        // strongly_comparable for Historical Treatment's own comparability
        // scoring (which is query-relative, not provision-gate-relative),
        // while the LINK to LODR-30 stays gate-blocked at the Question-A
        // engine level because LODR-30's own gate requires a SEPARATE
        // material_event_disclosure topic this query never states.
        allegedConduct: ["related_party_misrepresentation"],
        transactionTypes: ["related_party_transaction"],
        provisionIds: [reg30.id],
        provisionLinks: [link(reg30.id, ["related_party_transaction", "related_party_misrepresentation"])],
      })
    );
    const result = analyzeScenario({ freeText: RPT_ONLY_SCENARIO }, [primaryFinding, ...volumeFindings], [rpt232, reg30], []);

    const rptEntry = result.historicalTreatment.entries.find((e) => e.provision.id === "LODR-23-2");
    const volumeEntry = result.historicalTreatment.entries.find((e) => e.provision.id === "LODR-30");
    expect(rptEntry).toBeDefined();
    expect(volumeEntry).toBeDefined();
    // Confirm the fixture actually produces the intended shape: LODR-23-2
    // IS a primary candidate, LODR-30 IS gate-blocked (requires_additional_fact)
    // and DOES have more historical matters than LODR-23-2.
    expect(rptEntry!.currentCandidateTier).toBe("primary_candidate");
    expect(volumeEntry!.currentCandidateTier).toBe("requires_additional_fact");
    expect(volumeEntry!.comparableMatterCount).toBeGreaterThan(rptEntry!.comparableMatterCount);
    // The actual assertion: despite LESS historical volume, the primary
    // candidate ranks BEFORE the higher-volume gate-blocked provision.
    const rptIndex = result.historicalTreatment.entries.indexOf(rptEntry!);
    const volumeIndex = result.historicalTreatment.entries.indexOf(volumeEntry!);
    expect(rptIndex).toBeLessThan(volumeIndex);
  });

  it("3. a related/ancillary candidate ranks above a not_currently_a_candidate provision, historical volume notwithstanding", () => {
    // LODR-4-1-a is a real general-principle provision gated on
    // ANY_SUBSTANTIVE_VIOLATION_CONDUCT — it becomes related_ancillary once
    // the RPT misrepresentation is established.
    const relatedProvision = makeProvision({ id: "LODR-4-1-a", provisionNumber: "Regulation 4(1)(a)", subject: "Information disclosed per applicable standards" });
    const primaryFinding = makeFinding({
      recordId: "RPT-02",
      caseName: "RPT Matter Ltd.",
      allegedConduct: ["related_party_misrepresentation"],
      transactionTypes: ["related_party_transaction"],
      provisionIds: [rpt232.id, relatedProvision.id],
      provisionLinks: [
        link(rpt232.id, ["related_party_transaction", "related_party_misrepresentation"]),
        link(relatedProvision.id, []),
      ],
    });
    const volumeFindings = [1, 2, 3].map((n) =>
      makeFinding({
        recordId: `VOL2-0${n}`,
        caseName: `Volume Matter ${n} Ltd.`,
        allegedConduct: ["related_party_misrepresentation"],
        transactionTypes: ["related_party_transaction"],
        provisionIds: [reg30.id],
        provisionLinks: [link(reg30.id, ["related_party_transaction", "related_party_misrepresentation"])],
      })
    );
    const result = analyzeScenario({ freeText: RPT_ONLY_SCENARIO }, [primaryFinding, ...volumeFindings], [rpt232, relatedProvision, reg30], []);

    const relatedEntry = result.historicalTreatment.entries.find((e) => e.provision.id === "LODR-4-1-a");
    const volumeEntry = result.historicalTreatment.entries.find((e) => e.provision.id === "LODR-30");
    expect(relatedEntry).toBeDefined();
    expect(volumeEntry).toBeDefined();
    expect(relatedEntry!.currentCandidateTier).toBe("related_ancillary");
    expect(volumeEntry!.comparableMatterCount).toBeGreaterThan(relatedEntry!.comparableMatterCount);
    const relatedIndex = result.historicalTreatment.entries.indexOf(relatedEntry!);
    const volumeIndex = result.historicalTreatment.entries.indexOf(volumeEntry!);
    expect(relatedIndex).toBeLessThan(volumeIndex);
  });

  it("4. within the same current-candidate tier, fact-attributed entries rank above comparable-unverified ones", () => {
    const attributedProvision = makeProvision({ id: "LODR-23-4", provisionNumber: "Regulation 23(4)", subject: "Mandatory shareholder approval of material RPTs" });
    const unverifiedProvision = makeProvision({ id: "IND-AS-24", subject: "Related Party Disclosures" });
    // Both provisions land as primary/governing candidates here; the first
    // has a curated, fact-attributing link (attributionStatus="attributed"),
    // the second has an EMPTY justifyingTags link (attributionStatus=
    // "unverified") — same current-candidate strength, different
    // historical-quality tiebreak.
    const attributedFinding = makeFinding({
      recordId: "ATTR-01",
      caseName: "Attributed Matter Ltd.",
      allegedConduct: ["related_party_misrepresentation", "rpt_approval_lapse"],
      transactionTypes: ["related_party_transaction"],
      provisionIds: [rpt232.id, attributedProvision.id],
      provisionLinks: [
        link(rpt232.id, ["related_party_transaction", "related_party_misrepresentation"]),
        link(attributedProvision.id, ["related_party_transaction", "rpt_approval_lapse"]),
      ],
    });
    const unverifiedFinding = makeFinding({
      recordId: "UNVER-01",
      caseName: "Unverified Matter Ltd.",
      allegedConduct: ["related_party_misrepresentation"],
      transactionTypes: ["related_party_transaction"],
      provisionIds: [unverifiedProvision.id],
      provisionLinks: [link(unverifiedProvision.id, [])],
    });
    const result = analyzeScenario(
      { freeText: RPT_ONLY_SCENARIO },
      [attributedFinding, unverifiedFinding],
      [rpt232, attributedProvision, unverifiedProvision],
      []
    );
    const attributedEntry = result.historicalTreatment.entries.find((e) => e.provision.id === "LODR-23-4");
    const unverifiedEntry = result.historicalTreatment.entries.find((e) => e.provision.id === "IND-AS-24");
    expect(attributedEntry).toBeDefined();
    expect(unverifiedEntry).toBeDefined();
    expect(attributedEntry!.presentationTier).toBe("fact_attributed");
    expect(unverifiedEntry!.presentationTier).toBe("comparable_unverified");
    const attributedIndex = result.historicalTreatment.entries.indexOf(attributedEntry!);
    const unverifiedIndex = result.historicalTreatment.entries.indexOf(unverifiedEntry!);
    expect(attributedIndex).toBeLessThan(unverifiedIndex);
  });

  it("5. historical matter count can only break ties AFTER current-scenario applicability class — a higher-volume governing-only entry never outranks a low-volume primary candidate", () => {
    const primaryFinding = makeFinding({
      recordId: "RPT-03",
      caseName: "RPT Matter Ltd.",
      allegedConduct: ["related_party_misrepresentation"],
      transactionTypes: ["related_party_transaction"],
      provisionIds: [rpt232.id],
      provisionLinks: [link(rpt232.id, ["related_party_transaction", "related_party_misrepresentation"])],
    });
    const highVolumeFindings = Array.from({ length: 5 }, (_, i) =>
      makeFinding({
        recordId: `HV-0${i + 1}`,
        caseName: `High Volume Matter ${i + 1} Ltd.`,
        allegedConduct: ["related_party_misrepresentation"],
        transactionTypes: ["related_party_transaction"],
        provisionIds: [reg30.id],
        provisionLinks: [link(reg30.id, ["related_party_transaction", "related_party_misrepresentation"])],
      })
    );
    const result = analyzeScenario({ freeText: RPT_ONLY_SCENARIO }, [primaryFinding, ...highVolumeFindings], [rpt232, reg30], []);
    expect(result.historicalTreatment.entries[0].provision.id).toBe("LODR-23-2");
  });

  it("8/9. secondary (gate-blocked) historical material remains present in entries — never deleted — with its comparability data unchanged", () => {
    const primaryFinding = makeFinding({
      recordId: "RPT-04",
      caseName: "RPT Matter Ltd.",
      allegedConduct: ["related_party_misrepresentation"],
      transactionTypes: ["related_party_transaction"],
      provisionIds: [rpt232.id],
      provisionLinks: [link(rpt232.id, ["related_party_transaction", "related_party_misrepresentation"])],
    });
    const volumeFinding = makeFinding({
      recordId: "VOL-99",
      caseName: "Volume Matter Ltd.",
      allegedConduct: ["related_party_misrepresentation"],
      transactionTypes: ["related_party_transaction"],
      provisionIds: [reg30.id],
      provisionLinks: [link(reg30.id, ["related_party_transaction", "related_party_misrepresentation"])],
    });
    const result = analyzeScenario({ freeText: RPT_ONLY_SCENARIO }, [primaryFinding, volumeFinding], [rpt232, reg30], []);
    const volumeEntry = result.historicalTreatment.entries.find((e) => e.provision.id === "LODR-30");
    expect(volumeEntry).toBeDefined();
    expect(volumeEntry!.comparableMatterCount).toBe(1);
    expect(volumeEntry!.matterOutcomes).toHaveLength(1);
    expect(volumeEntry!.cases).toHaveLength(1);
  });
});
