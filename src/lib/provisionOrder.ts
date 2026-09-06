/** Ascending, numeric-aware ordering for provision numbers like "Regulation
 * 4(1)(a)", "Section 11(2)(ia)", "Regulation 17(8)", "Schedule V, Part A,
 * Clause 1" — a plain string sort puts "17(8)" before "4(1)(a)" because "1"
 * sorts before "4" character-by-character. This splits each provision
 * number into runs of digits vs runs of non-digits and compares digit runs
 * numerically, so "4" < "17" as a person actually reading the regulations
 * would expect, while non-digit runs (letters, punctuation, roman numerals)
 * still compare lexicographically. */
function tokenize(value: string): string[] {
  return value.match(/(\d+|\D+)/g) ?? [];
}

export function compareProvisionNumbers(a: string, b: string): number {
  const aTokens = tokenize(a);
  const bTokens = tokenize(b);
  const len = Math.max(aTokens.length, bTokens.length);
  for (let i = 0; i < len; i++) {
    const aTok = aTokens[i] ?? "";
    const bTok = bTokens[i] ?? "";
    const aIsNum = /^\d+$/.test(aTok);
    const bIsNum = /^\d+$/.test(bTok);
    if (aIsNum && bIsNum) {
      const diff = Number(aTok) - Number(bTok);
      if (diff !== 0) return diff;
    } else {
      const cmp = aTok.localeCompare(bTok);
      if (cmp !== 0) return cmp;
    }
  }
  return 0;
}

export function sortByProvisionNumber<T extends { provisionNumber: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => compareProvisionNumbers(a.provisionNumber, b.provisionNumber));
}
