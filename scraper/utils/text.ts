/**
 * Small text helpers for turning bank HTML snippets into clean strings.
 */

const NAMED: Record<string, string> = {
  nbsp: " ",
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
};

/** Decode named entities above plus any numeric one (&#039; &#x2F;). */
export function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, code: string) => {
    if (code[0] !== "#") return NAMED[code.toLowerCase()] ?? m;
    const n = code[1].toLowerCase() === "x" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
    return Number.isFinite(n) ? String.fromCodePoint(n) : m;
  });
}

/** Collapse runs of whitespace and trim. */
export function squish(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/** Strip tags, decode common entities, collapse whitespace. */
export function stripHtml(html: string): string {
  return squish(decodeEntities(html.replace(/<br\s*\/?>/gi, " ").replace(/<[^>]+>/g, " ")));
}
