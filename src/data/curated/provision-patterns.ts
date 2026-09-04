// Curated id + detection pattern for each row of the "Provision Index" sheet
// in CFID_Precedent_Library_Pilot.xlsx. The import script reads the sheet's
// own Instrument/Provision/Subject/Cases/Treatment/Note text verbatim and
// only attaches the `id` and `matchPattern` from this file (looked up by the
// exact "Provision" column text). matchPattern is scoped to the instrument
// keyword so that, for example, "PFUTP ... 4(2)(e)" is never confused with
// "LODR ... 4(2)(e)(i)" even though both source strings contain "4(2)(e)".
//
// The import script fails validation (flags "unknown provisions") if any
// Provision Index row's exact text does not match an entry below, so this
// list must be kept in sync with the workbook rather than silently drifting.

export interface ProvisionPattern {
  /** Exact text of the workbook's "Provision" column for this row. */
  provisionColumnText: string;
  id: string;
  /** Source string for `new RegExp(matchPattern, "i")`. */
  matchPattern: string;
}

export const PROVISION_PATTERNS: ProvisionPattern[] = [
  { provisionColumnText: "Section 12A(a), (b), (c)", id: "SEBI-ACT-12A", matchPattern: "SEBI Act[^;]*12A" },
  { provisionColumnText: "Section 27", id: "SEBI-ACT-27", matchPattern: "SEBI Act[^;]*s\\.?\\s*27\\b" },
  { provisionColumnText: "Sections 11(2)(ia), 11C(3)", id: "SEBI-ACT-11-11C", matchPattern: "11\\(2\\)\\(ia\\)|11C\\(3\\)" },
  { provisionColumnText: "Sections 15HA and 15HB", id: "SEBI-ACT-15HA-15HB", matchPattern: "15HA|15HB" },
  { provisionColumnText: "Regulation 3(a)-(d)", id: "PFUTP-3-a-d", matchPattern: "PFUTP[^;]*\\b3\\s*\\([a-d]\\)" },
  { provisionColumnText: "Regulation 4(1)", id: "PFUTP-4-1", matchPattern: "PFUTP[^;]*\\b4\\(1\\)(?!\\()" },
  { provisionColumnText: "Regulation 4(2)(e)", id: "PFUTP-4-2-e", matchPattern: "PFUTP[^;]*4\\(2\\)\\(e\\)(?!\\(i\\))" },
  { provisionColumnText: "Regulation 4(2)(f)", id: "PFUTP-4-2-f", matchPattern: "PFUTP[^;]*4\\(2\\)\\(f\\)" },
  { provisionColumnText: "Regulation 4(2)(k)", id: "PFUTP-4-2-k", matchPattern: "PFUTP[^;]*4\\(2\\)\\(k\\)" },
  { provisionColumnText: "Regulation 4(2)(r)", id: "PFUTP-4-2-r", matchPattern: "PFUTP[^;]*4\\(2\\)\\(r\\)" },
  { provisionColumnText: "Regulation 4(1)(a),(b),(c),(e),(g),(h),(j)", id: "LODR-4-1-general", matchPattern: "LODR[^;]*4\\(1\\)\\([abcdefghij]\\)" },
  { provisionColumnText: "Regulation 4(2)(e)(i)", id: "LODR-4-2-e-i", matchPattern: "LODR[^;]*4\\(2\\)\\(e\\)\\(i\\)" },
  { provisionColumnText: "Regulation 4(2)(f) sub-clauses", id: "LODR-4-2-f", matchPattern: "LODR[^;]*4\\(2\\)\\(f\\)" },
  { provisionColumnText: "Regulation 6(1), 6(1A), 6(2)(a),(c)", id: "LODR-6-compliance-officer", matchPattern: "LODR[^;]*(6\\(1\\)|6\\(1A\\)|6\\(2\\)\\(a\\)|6\\(2\\)\\(c\\))" },
  { provisionColumnText: "Regulations 16(1)(b), 18(1)(d), 18(2), 18(3)", id: "LODR-audit-committee", matchPattern: "LODR[^;]*(16\\(1\\)\\(b\\)|18\\(1\\)\\(d\\)|18\\(2\\)|18\\(3\\))" },
  { provisionColumnText: "Regulation 17(8)", id: "LODR-17-8", matchPattern: "LODR[^;]*17\\(8\\)" },
  { provisionColumnText: "Regulation 23(2)", id: "LODR-23-2", matchPattern: "23\\(2\\)" },
  { provisionColumnText: "Regulation 27(2)(a)", id: "LODR-27-2-a", matchPattern: "27\\(2\\)\\(a\\)" },
  { provisionColumnText: "Regulation 32 / 32(7A)", id: "LODR-32", matchPattern: "LODR[^;]*\\b32\\b" },
  { provisionColumnText: "Regulation 33(1)(a),(c), 33(3)(d)", id: "LODR-33", matchPattern: "LODR[^;]*33\\(" },
  { provisionColumnText: "Regulation 34(2)(a), 34(3) and Schedule V", id: "LODR-34", matchPattern: "LODR[^;]*34\\(|34\\(3\\) read with Schedule V" },
  { provisionColumnText: "Regulation 46(2)(s)", id: "LODR-46-2-s", matchPattern: "46\\(2\\)\\(s\\)" },
  { provisionColumnText: "Regulation 48", id: "LODR-48", matchPattern: "LODR[^;]*\\b48\\b" },
  { provisionColumnText: "Section 136(1)", id: "COMPANIES-ACT-136", matchPattern: "136\\(1\\)" },
  { provisionColumnText: "Ind AS 1, 7, 21, 24, 32, 107, 110, 115", id: "IND-AS-various", matchPattern: "Ind AS" },
];
