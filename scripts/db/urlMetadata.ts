/**
 * Extracts order type and a coarse date hint from the OFFICIAL SEBI URL
 * itself (SEBI's own published path/filename text) — never from document
 * content we have not retrieved. This is legitimate metadata (SEBI names
 * its own URLs "interim-order-...", "final-order-...", puts the order in a
 * "sep-2024" month folder, etc.) as opposed to anything inferred from a
 * document body we have not read.
 */

export type UrlOrderType =
  | "interim_order"
  | "interim_cum_show_cause_notice"
  | "confirmatory_order"
  | "revocation_order"
  | "final_order"
  | "adjudication_order"
  | "settlement_order"
  | "other";

export function orderTypeFromUrl(url: string): { orderType: UrlOrderType; matched: boolean } {
  const path = url.toLowerCase();
  if (/interim.*(cum|-and-).*show[- ]cause/.test(path) || /show[- ]cause.*interim/.test(path)) {
    return { orderType: "interim_cum_show_cause_notice", matched: true };
  }
  if (/revocation-order/.test(path)) return { orderType: "revocation_order", matched: true };
  if (/confirmatory-order/.test(path)) return { orderType: "confirmatory_order", matched: true };
  if (/adjudication-order/.test(path)) return { orderType: "adjudication_order", matched: true };
  if (/settlement-order/.test(path)) return { orderType: "settlement_order", matched: true };
  if (/final-order/.test(path) || /final_order/.test(path)) return { orderType: "final_order", matched: true };
  if (/interim-ex-parte-order|interim-order/.test(path)) return { orderType: "interim_order", matched: true };
  if (/corrigendum|miscellaneous-order|order-in-the-matter-of|order-in-respect-of/.test(path)) {
    return { orderType: "other", matched: true };
  }
  return { orderType: "other", matched: false };
}

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

export function orderPeriodHintFromUrl(url: string): string | null {
  const match = url.toLowerCase().match(/(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)-(\d{4})/);
  if (!match) return null;
  const monthIdx = MONTHS.indexOf(match[1]);
  const monthLabel = match[1].charAt(0).toUpperCase() + match[1].slice(1);
  return monthIdx >= 0 ? `${monthLabel}-${match[2]}` : null;
}
