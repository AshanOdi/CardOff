/**
 * Keyword-based category detection, shared by all bank scrapers.
 * Order matters: the first matching rule wins.
 */
import type { Category, OfferType } from "../../src/lib/schema/offer";

export function detectCategory(text: string, offerType: OfferType): Category {
  const t = text.toLowerCase();
  if (/dine|din-in|dining|restaurant|cafe|pizza|burger|taco|buffet|bakery|lunch|dinner|take-?away/.test(t)) return "dining";
  if (/hotel|resort|villa|room only|\b(bb|hb|fb)\b|half board|full board|travel|airline|holiday|tour/.test(t)) return "travel";
  if (/supermarket|grocery|groceries|keells|cargills|arpico|glomark|laugfs super/.test(t)) return "groceries";
  if (/fuel|petrol|filling station/.test(t)) return "fuel";
  if (/optic|spectacle|frames|eye care|hospital|pharmacy|clinic|medical|hearing|dental|channel+ing/.test(t)) return "health";
  if (/cinema|movie|theme park|concert|event/.test(t)) return "entertainment";
  if (/online|e-commerce|website/.test(t)) return "online";
  if (/electronic|phone|mobile|furniture|bedding|paint|fashion|clothing|jewel|watch|bicycle|bike|appliance|machine|selected (items|products|brands)/.test(t)) return "shopping";
  // Installment plans are almost always retail purchases.
  return offerType === "installment" || /instal{1,2}ment/.test(t) ? "shopping" : "other";
}
