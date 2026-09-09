-- Narrow, evidence-backed data-completeness fix discovered during the
-- Cases (Case Library / Order Detail) officer-facing cleanup pass. That
-- pass fixed Order Detail's Directions & Outcomes query to scope strictly
-- by order_id (see the migration's sibling code change: the previous
-- query guessed "final" vs "interim" from order.orderStage, which could
-- both drop an order's own directions and pull in a sibling order's
-- directions by stage-label coincidence). Applying the corrected,
-- order_id-scoped query surfaced that the four orders integrated in
-- migrations 0021/0022 (Debock, Trafiksol, Max Financial Services,
-- Varanium Cloud) have ZERO order_directions rows at all, despite each
-- order's own operative "ORDER"/directions section being fully read and
-- quoted during that integration work. This is not a UI-only cosmetic
-- gap: an officer opening any of these four orders would see an empty
-- Directions & Outcomes section for an order that in fact directed
-- extensive relief.
--
-- This migration is narrow (exactly these 4 orders, not a corpus-wide
-- pass), unquestionably supported (every row's text and paragraph
-- reference is drawn directly from the official order PDF already read
-- verbatim during migration 0021's own drafting -- re-verified against
-- the retained scratch copy before writing this migration), and additive
-- only (new order_directions rows; no existing row anywhere is touched).
-- Granularity matches this corpus's own existing convention (see e.g.
-- Seacoast Shipping Services Limited's final order: 4 summary-level rows,
-- not one row per noticee) -- a handful of rows per order capturing the
-- restitution/debarment/disgorgement/penalty/disposal structure, not a
-- transcription of every individually-numbered sub-direction against
-- every noticee.
insert into order_directions (order_id, case_name, stage, direction_or_outcome, paragraph_reference, official_source_url)
values
  (
    '29ab5354-0336-4d22-83bb-322a579076be',
    'In the matter of Debock Industries Limited',
    'Final',
    'Debock Industries Limited directed to bring back the Rs.49 crore diverted from rights-issue proceeds, with 12% interest, within 3 months',
    'Para 187(i)',
    'https://www.sebi.gov.in/enforcement/orders/aug-2026/final-order-in-the-matter-of-debock-industries-limited_104110.html'
  ),
  (
    '29ab5354-0336-4d22-83bb-322a579076be',
    'In the matter of Debock Industries Limited',
    'Final',
    'Debarment/director-KMP restraint: 7 years for Debock and Mr. Mukesh Manveer Singh; 5 years for Mr. Sunil Kalot; 3 years for Ms. Priyanka Sharma and Mr. Gaurav Jain; 2 years for the remaining debarred noticees',
    'Para 187(ii)-(ix)',
    'https://www.sebi.gov.in/enforcement/orders/aug-2026/final-order-in-the-matter-of-debock-industries-limited_104110.html'
  ),
  (
    '29ab5354-0336-4d22-83bb-322a579076be',
    'In the matter of Debock Industries Limited',
    'Final',
    'Disgorgement of Rs.59,30,52,248 (individually/jointly and severally) against Mr. Sunil Kalot, Mr. Mukesh Manveer Singh and Mr. Gaurav Jain, with 12% interest',
    'Para 189',
    'https://www.sebi.gov.in/enforcement/orders/aug-2026/final-order-in-the-matter-of-debock-industries-limited_104110.html'
  ),
  (
    '29ab5354-0336-4d22-83bb-322a579076be',
    'In the matter of Debock Industries Limited',
    'Final',
    'Monetary penalties under Sections 15HA/15HB of the SEBI Act imposed against 11 noticees per Table 44 of the order',
    'Paras 190-192',
    'https://www.sebi.gov.in/enforcement/orders/aug-2026/final-order-in-the-matter-of-debock-industries-limited_104110.html'
  ),
  (
    '29ab5354-0336-4d22-83bb-322a579076be',
    'In the matter of Debock Industries Limited',
    'Final',
    'Proceedings against Noticees no. 5-9 and 12-24 disposed of without issuance of any direction or imposition of any monetary penalty',
    'Para 194',
    'https://www.sebi.gov.in/enforcement/orders/aug-2026/final-order-in-the-matter-of-debock-industries-limited_104110.html'
  ),
  (
    'cd1aa5dd-52c3-4f6f-89da-9ded4f0aaef5',
    'In the matter of Initial Public Offer of Trafiksol ITS Technologies Ltd.',
    'Final',
    'Trafiksol ITS Technologies Limited, Mr. Jitendra Narayan Das and Ms. Poonam Das restrained from accessing the securities market for 1 year',
    'Para 144.1',
    'https://www.sebi.gov.in/enforcement/orders/aug-2026/final-order-in-the-matter-of-ipo-of-trafiksol-its-technologies-limited_104109.html'
  ),
  (
    'cd1aa5dd-52c3-4f6f-89da-9ded4f0aaef5',
    'In the matter of Initial Public Offer of Trafiksol ITS Technologies Ltd.',
    'Final',
    'Monetary penalties under Sections 15A(a), 15HA and 15HB of the SEBI Act imposed against all three noticees',
    'Para 144.3',
    'https://www.sebi.gov.in/enforcement/orders/aug-2026/final-order-in-the-matter-of-ipo-of-trafiksol-its-technologies-limited_104109.html'
  ),
  (
    'b5de6f63-4823-4b60-b4ff-ec673b3a9e5b',
    'In the matter of Max Financial Services Limited',
    'Final',
    'Proceedings against all 12 Noticees disposed of without issuance of any direction or imposition of any penalty — every substantive allegation was found not established',
    'Para 185',
    'https://www.sebi.gov.in/enforcement/orders/aug-2026/order-in-the-matter-of-max-financial-services-limited_103935.html'
  ),
  (
    '40f3d753-6233-4141-895d-9a13221b2d5e',
    'In the matter of Varanium Cloud Ltd',
    'Final',
    'VCL directed to bring back the Rs.62.51 crore found diverted, with 12% interest, within 3 months',
    'Para 200(i)',
    'https://www.sebi.gov.in/enforcement/orders/aug-2026/final-order-in-respect-of-varanium-cloud-limited_104019.html'
  ),
  (
    '40f3d753-6233-4141-895d-9a13221b2d5e',
    'In the matter of Varanium Cloud Ltd',
    'Final',
    'VCL and Mr. Harshawardhan Sabale debarred from the securities market for 7 years; Mr. Sabale further restrained as director/KMP for 7 years; other noticees debarred/restrained for 1-4 years',
    'Para 200(ii)-(xi)',
    'https://www.sebi.gov.in/enforcement/orders/aug-2026/final-order-in-respect-of-varanium-cloud-limited_104019.html'
  ),
  (
    '40f3d753-6233-4141-895d-9a13221b2d5e',
    'In the matter of Varanium Cloud Ltd',
    'Final',
    'Mr. Harshawardhan Sabale directed to disgorge unlawful gains of Rs.1,28,77,11,275 with 12% interest',
    'Para 200(iv)',
    'https://www.sebi.gov.in/enforcement/orders/aug-2026/final-order-in-respect-of-varanium-cloud-limited_104019.html'
  ),
  (
    '40f3d753-6233-4141-895d-9a13221b2d5e',
    'In the matter of Varanium Cloud Ltd',
    'Final',
    'Monetary penalties under Sections 15A(a), 15A(b), 15HA and 15HB of the SEBI Act imposed against VCL and Mr. Sabale per Table 27 of the order (Rs.1.3 crore and Rs.20.4 crore respectively)',
    'Para 202',
    'https://www.sebi.gov.in/enforcement/orders/aug-2026/final-order-in-respect-of-varanium-cloud-limited_104019.html'
  );
