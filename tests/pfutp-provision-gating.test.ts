// P0 provision-precision remediation: the SPECIAL PFUTP MATRIX. For every
// PFUTP/SEBI-Act-12A clause the provision-level retrieval gate covers (see
// src/data/curated/provision-retrieval-rules.ts), this file proves three
// things with a REAL scenario finding tagged to that clause (empty
// justifyingTags on the link, exactly mirroring the live data - all 498
// PFUTP/SEBI-Act-12A finding_provisions rows are empty-justifyingTags, so a
// test that pre-narrows the link would not actually prove the gate works
// against the real data shape):
//   1. a scenario stating the clause's own minimum facts DOES surface it;
//   2. a "near miss" stating only PART of what the clause requires does NOT
//      surface it (this is the actual regression target: before this pass,
//      any factual overlap with the underlying finding at all was enough);
//   3. a scenario with neither nexus present does NOT surface it.
// Each expected answer is reasoned from the provision's own official
// subject text (re-queried live from legal_provisions before this pass; see
// docs/provision-gating-remediation.md), not from running the engine and
// keeping whatever it happened to return.
import { describe, expect, it } from "vitest";
import { analyzeScenario } from "@/lib/matching/engine";
import type { LegalProvision, ScenarioFinding } from "@/types/domain";

function makeProvision(id: string, provisionNumber: string, subject: string): LegalProvision {
  return {
    id,
    instrument: id.startsWith("SEBI-ACT") ? "SEBI Act, 1992" : "PFUTP Regulations, 2003",
    provisionNumber,
    subject,
    currentTextVerificationStatus: "Requires verification",
    officialSource: null,
    ordersConsidered: [],
    treatmentInPilotOrders: "",
    lawLibraryNote: null,
  };
}

let seq = 0;
function makeFinding(provisionId: string): ScenarioFinding {
  seq += 1;
  return {
    recordId: `PFUTP-MATRIX-${seq}`,
    caseName: "Synthetic PFUTP Matrix Matter",
    orderIds: [],
    category: "test",
    scenarioTitle: "Synthetic PFUTP matrix finding",
    factualPattern: "Synthetic factual pattern for the PFUTP gating matrix.",
    provisionsConsideredRaw: null,
    provisionIds: [provisionId],
    // Empty justifyingTags on purpose - mirrors the live data exactly (all
    // 498 PFUTP/SEBI-Act-12A links are empty), so this test proves the
    // provision-level gate, not a pre-narrowed link.
    provisionLinks: [{ provisionId, justifyingTags: [] }],
    noticeeActors: [],
    findingStatus: "Confirmed in Final Order",
    interimParagraphReferences: null,
    finalParagraphReferences: "Para 1",
    qualification: null,
    officialSourceUrl: "https://www.sebi.gov.in/example.html",
    transactionTypes: ["preferential_allotment", "rights_issue", "related_party_transaction"],
    actorRoles: ["promoter"],
    evidenceTypes: [],
    allegedConduct: [
      "fictitious_sales_or_revenue",
      "fictitious_or_nongenuine_assets",
      "financial_statement_misstatement",
      "false_business_or_corporate_announcement",
      "price_manipulation_nexus",
      "non_disclosure_of_information",
    ],
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
  };
}

interface ClauseCase {
  provisionId: string;
  provisionNumber: string;
  subject: string;
  positiveText: string;
  nearMissTexts: string[];
  negativeText: string;
}

// The finding's own tags (above) deliberately span every family this
// matrix needs so a single synthetic finding+provision pair per clause is
// enough - what varies per test is only the QUERY text, exactly like a real
// officer's input would.
const CASES: ClauseCase[] = [
  {
    provisionId: "PFUTP-3-a",
    provisionNumber: "Regulation 3(a)",
    subject: "Buying, selling or otherwise dealing in securities in a fraudulent manner.",
    positiveText:
      "The company made a preferential allotment of shares to promoter entities, structured through fictitious assets that had no genuine existence, to create false substance for the allotment.",
    nearMissTexts: [
      "The company made a preferential allotment of shares, fully paid for at fair value. No fraud is alleged.",
      "The company's published financial statements included fictitious assets that had no genuine existence. No securities issue or dealing is alleged.",
    ],
    negativeText: "The company made an ordinary purchase of raw materials from an unrelated vendor at market price.",
  },
  {
    provisionId: "PFUTP-3-b",
    provisionNumber: "Regulation 3(b)",
    subject: "Manipulative or deceptive device or contrivance in connection with the issue, purchase or sale of securities.",
    positiveText:
      "In connection with a rights issue, the company made a false announcement about the use of proceeds to mislead subscribing investors.",
    nearMissTexts: [
      "The company completed a rights issue and used the proceeds exactly as disclosed. No deception is alleged.",
      "The company made a false corporate announcement about its financial position. No securities issue or dealing is alleged.",
    ],
    negativeText: "The Audit Committee did not meet during the quarter. No securities issue or fraud is alleged.",
  },
  {
    provisionId: "PFUTP-3-c",
    provisionNumber: "Regulation 3(c)",
    subject: "Device, scheme or artifice to defraud in connection with dealing in or issue of listed securities.",
    positiveText:
      "In connection with a preferential allotment, the company booked fictitious sales with no genuine underlying transaction to inflate the valuation used for the allotment.",
    nearMissTexts: [
      "The company made a preferential allotment at a valuation supported by audited financial statements. No fraud is alleged.",
      "The company booked fictitious sales with no genuine underlying transaction. No allegation of any securities issue or dealing is included in this scenario.",
    ],
    negativeText: "The Compliance Officer position was vacant for two months. No securities issue or fraud is alleged.",
  },
  {
    provisionId: "PFUTP-3-d",
    provisionNumber: "Regulation 3(d)",
    subject: "Act, practice or course of business operating as fraud or deceit, in connection with dealing in or issue of listed securities.",
    positiveText:
      "In connection with a rights issue, the company misrepresented related party dealings as arm's-length to obtain subscriber confidence.",
    nearMissTexts: [
      "The company completed a rights issue that was fully subscribed and correctly utilised. No deceit is alleged.",
      "The company misrepresented a related-party transaction as an arm's-length dealing. No securities issue or dealing is alleged in this scenario.",
    ],
    negativeText: "A director failed to attend three consecutive board meetings. No securities issue or fraud is alleged.",
  },
  {
    provisionId: "PFUTP-4-1",
    provisionNumber: "Regulation 4(1)",
    subject: "Manipulative, fraudulent or unfair trade practice in the securities market.",
    positiveText:
      "The company made a preferential allotment while its published annual report contained a false announcement about the transaction's genuineness.",
    nearMissTexts: [
      "The company made a preferential allotment that was fully paid and genuine. No unfair trade practice is alleged.",
      "The company's annual report contained a false corporate announcement. No securities issue or dealing is alleged in this scenario.",
    ],
    negativeText: "The company failed to furnish accounting records sought under a SEBI summons. No securities fraud is alleged.",
  },
  {
    provisionId: "PFUTP-4-2-a",
    provisionNumber: "Regulation 4(2)(a)",
    subject: "Knowingly indulging in an act which creates a false or misleading appearance of trading.",
    positiveText:
      "A small group of connected trading accounts kept buying and selling the same stock back and forth among themselves, with no real change in who actually owned the shares.",
    nearMissTexts: [
      "The company booked fictitious sales with no genuine underlying transaction. No trading or price-related facts are alleged.",
    ],
    negativeText: "The company's Audit Committee meeting minutes could not be produced for the quarter. No trading facts are alleged.",
  },
  {
    provisionId: "PFUTP-4-2-b",
    provisionNumber: "Regulation 4(2)(b)",
    subject: "Dealing in securities involving an artificial price.",
    positiveText: "Synchronized trading among connected accounts artificially propped up the share price ahead of a corporate announcement.",
    nearMissTexts: [
      "The company's financial statements misstated the classification of an expense. No trading or price-related facts are alleged.",
    ],
    negativeText: "The statutory auditor's engagement letter was not renewed on time. No trading facts are alleged.",
  },
  {
    provisionId: "PFUTP-4-2-c",
    provisionNumber: "Regulation 4(2)(c)",
    subject: "A person dealing in securities issues, circulates or disseminates rumours or information not based on facts.",
    positiveText:
      "A person dealing in the company's securities through synchronized trading also circulated a false announcement about the company's prospects.",
    nearMissTexts: [
      "Synchronized trading among connected accounts created an artificial price rise. No false announcement or information is alleged.",
      "A false corporate announcement about the company's prospects was circulated. No trading or dealing facts are alleged in this scenario.",
    ],
    negativeText: "The company's related-party register was not updated for a quarter. No trading or false-information facts are alleged.",
  },
  {
    provisionId: "PFUTP-4-2-e",
    provisionNumber: "Regulation 4(2)(e)",
    subject: "Act or omission amounting to manipulation of the security's price.",
    positiveText: "No genuine change in beneficial ownership occurred despite repeated trades among connected accounts that induced investors to trade.",
    nearMissTexts: [
      "The company diverted funds to a promoter-controlled entity. No trading or price-related facts are alleged.",
    ],
    negativeText: "The CEO's compliance certificate to the board was not duly signed for one quarter. No trading facts are alleged.",
  },
  {
    provisionId: "PFUTP-4-2-f",
    provisionNumber: "Regulation 4(2)(f)",
    subject: "Publishing or reporting untrue securities-related information.",
    positiveText:
      "The company's published annual report contained fictitious sales figures with no genuine underlying transaction.",
    nearMissTexts: [
      "The company recorded fictitious sales with no genuine underlying transaction. No financial statement or public disclosure of the figures is alleged.",
      "The company's annual report was filed on time and reflects audited, accurate figures. No fraud is alleged.",
    ],
    negativeText: "A non-executive director did not attend the last two board meetings. No false information or disclosure facts are alleged.",
  },
  {
    provisionId: "PFUTP-4-2-k",
    provisionNumber: "Regulation 4(2)(k)",
    subject: "Disseminating false or misleading information likely to influence investors.",
    positiveText:
      "The company's stock exchange corporate announcement about an intended acquisition was fabricated with no genuine underlying transaction to influence investor sentiment.",
    nearMissTexts: [
      "The company's stock exchange corporate announcement about an intended acquisition was accurate and fully supported by documentation. No false information is alleged.",
      "The company fabricated internal records with no genuine underlying transaction. No public disclosure or announcement is alleged in this scenario.",
    ],
    negativeText: "The company's forensic auditor was denied access to the ERP system. No false information or disclosure facts are alleged.",
  },
  {
    provisionId: "PFUTP-4-2-r",
    provisionNumber: "Regulation 4(2)(r)",
    subject: "Knowingly planting false or misleading information inducing trades.",
    positiveText:
      "A false announcement about the company's prospects was knowingly planted, and synchronized trading by connected accounts induced investors to trade on it.",
    nearMissTexts: [
      "A false announcement about the company's prospects was knowingly planted. No trading or price-related facts are alleged.",
      "Synchronized trading among connected accounts created an artificial price rise. No false or misleading information is alleged in this scenario.",
    ],
    negativeText: "The company's Compliance Officer vacancy lasted for two months. No false information or trading facts are alleged.",
  },
  {
    provisionId: "SEBI-ACT-12A-a",
    provisionNumber: "Section 12A(a)",
    subject: "Manipulative or deceptive device or contrivance in connection with the issue, purchase or sale of securities.",
    positiveText:
      "In connection with a preferential allotment, the company misrepresented related party dealings as arm's-length to secure allottee confidence.",
    nearMissTexts: [
      "The company made a preferential allotment that was fully paid and genuine. No deception is alleged.",
      "The company misrepresented a related-party transaction as an arm's-length dealing. No securities issue or dealing is alleged in this scenario.",
    ],
    negativeText: "The company's Audit Committee was not properly constituted for one quarter. No securities issue or fraud is alleged.",
  },
  {
    provisionId: "SEBI-ACT-12A-b",
    provisionNumber: "Section 12A(b)",
    subject: "Device, scheme or artifice to defraud in connection with the issue of, or dealing in, listed securities.",
    positiveText:
      "In connection with a rights issue, the company booked fictitious sales with no genuine underlying transaction to inflate the figures used to market the issue.",
    nearMissTexts: [
      "The company completed a rights issue and utilised the proceeds exactly as disclosed and certified. No fraud is alleged.",
      "The company booked fictitious sales with no genuine underlying transaction. No allegation of any securities issue or dealing is included in this scenario.",
    ],
    negativeText: "The company's related-party register omitted one immaterial entry for a quarter. No securities issue or fraud is alleged.",
  },
  {
    provisionId: "SEBI-ACT-12A-c",
    provisionNumber: "Section 12A(c)",
    subject: "Act, practice or course of business operating as a fraud or deceit, in connection with the issue of or dealing in listed securities.",
    positiveText:
      "In connection with a preferential allotment, the company's financial statements misstated the accounts to create a false appearance of financial health for allottees.",
    nearMissTexts: [
      "The company made a preferential allotment supported by audited, accurate financial statements. No misstatement is alleged.",
      "The company's financial statements contained a misstatement. No securities issue or dealing is alleged in this scenario.",
    ],
    negativeText: "The statutory auditor resigned mid-term without a securities dealing or fraud allegation.",
  },
];

describe("PFUTP / SEBI Act 12A clause matrix: provision-level retrieval gate", () => {
  for (const c of CASES) {
    const provision = makeProvision(c.provisionId, c.provisionNumber, c.subject);
    const finding = makeFinding(c.provisionId);

    describe(`${c.provisionId} (${c.provisionNumber})`, () => {
      it("surfaces the provision when the scenario states its own minimum facts (positive)", () => {
        const result = analyzeScenario({ freeText: c.positiveText }, [finding], [provision], []);
        const ids = result.provisionResults.map((pr) => pr.provision.id);
        expect(ids).toContain(c.provisionId);
        expect(result.gateBlockedProvisionResults.map((g) => g.provision.id)).not.toContain(c.provisionId);
      });

      c.nearMissTexts.forEach((text, i) => {
        it(`does NOT surface the provision when only part of its minimum facts is stated (near miss ${i + 1})`, () => {
          const result = analyzeScenario({ freeText: text }, [finding], [provision], []);
          const ids = result.provisionResults.map((pr) => pr.provision.id);
          expect(ids).not.toContain(c.provisionId);
        });
      });

      it("does NOT surface the provision when neither nexus is present (negative)", () => {
        const result = analyzeScenario({ freeText: c.negativeText }, [finding], [provision], []);
        const ids = result.provisionResults.map((pr) => pr.provision.id);
        expect(ids).not.toContain(c.provisionId);
      });
    });
  }
});
