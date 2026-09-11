// Post-freeze correction pass (Section I): a curated orders.scope_note
// (see orderGist.ts) is a single free-text string, but a subset already
// follow a predictable internal convention -- an introductory clause, an
// enumerated findings list ("... findings (...): (1) ...; (2) ...; (3)
// ..."), and a closing "Directions: ..." clause (see Rajesh Exports
// Limited's own scope_note, the case this pass was reported against). One
// dense paragraph doesn't use a wide card well; this module is a purely
// presentational parser -- it never rewrites, summarises, or reorders a
// single word of the stored text, it only detects that structure (when
// present) and returns its pieces so the UI can render them as an intro
// paragraph, a bulleted findings list, and a directions paragraph instead
// of one undifferentiated block.
//
// Deliberately generic, not special-cased to Rajesh Exports: any order
// whose scope_note happens to follow the same "intro: (1) ...; (2) ..."
// / "Directions: ..." convention benefits the same way. An order whose
// scope_note does not follow it (the majority) falls back to `intro`
// holding the entire original text, `listItems` empty, `directions` null
// -- rendered exactly as a single paragraph, identical to before this
// pass, never a garbled partial parse.
export interface ScopeNoteSections {
  /** Everything before the enumerated findings list (including that
   * list's own introductory clause ending in ':'), or the entire
   * non-directions text when no enumerated list is detected. */
  intro: string;
  /** Enumerated findings items with their "(N) " markers stripped --
   * empty when no "<clause ending in ':'> (1) ..." pattern is found. */
  listItems: string[];
  /** Text after a standalone "Directions:" marker, or null when absent. */
  directions: string | null;
}

export function parseScopeNoteSections(text: string): ScopeNoteSections {
  const directionsMatch = text.match(/\bDirections:\s*([\s\S]*)$/);
  let body = text;
  let directions: string | null = null;
  if (directionsMatch) {
    directions = directionsMatch[1].trim() || null;
    body = text.slice(0, directionsMatch.index).trim();
  }

  const listMatch = body.match(/^([\s\S]*?:)\s*\(1\)\s*([\s\S]*)$/);
  if (!listMatch) {
    return { intro: body, listItems: [], directions };
  }
  const [, intro, rest] = listMatch;
  const listItems = rest
    .split(/;\s*\(\d+\)\s*/)
    .map((s) => s.trim())
    .filter(Boolean);
  // Defensive fallback: a malformed/ambiguous match that produced no real
  // items (or only one, which is not meaningfully a "list") is not worth
  // rendering as a bulleted list -- fall back to the plain paragraph
  // rather than showing a single stray bullet.
  if (listItems.length < 2) {
    return { intro: body, listItems: [], directions };
  }
  return { intro: intro.trim(), listItems, directions };
}
