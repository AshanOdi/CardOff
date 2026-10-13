/**
 * Small text helpers for turning bank HTML snippets into clean strings.
 */

const ENTITIES: Record<string, string> = {
  "&nbsp;": " ",
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&#x27;": "'",
  "&#x2F;": "/",
};

export function decodeEntities(text: string): string {
  return text.replace(/&(?:nbsp|amp|lt|gt|quot|#39|#x27|#x2F);/gi, (m) => ENTITIES[m] ?? m);
}

/** Collapse runs of whitespace and trim. */
export function squish(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/** Strip tags, decode common entities, collapse whitespace. */
export function stripHtml(html: string): string {
  return squish(decodeEntities(html.replace(/<br\s*\/?>/gi, " ").replace(/<[^>]+>/g, " ")));
}
