/**
 * Hatton National Bank scraper.
 *
 * HNB serves its card promotions from a plain JSON API (no bot protection).
 * Endpoints were found in the hnb.lk frontend bundle:
 *
 *   GET /api/get_all_web_card_promos?page=1&limit=1000
 *     → { total, data: [{ id, title, thumb, merchant, cardType, to, valid }] }
 *     The full list. (The older /get_all_pcard_promotions only returns a
 *     random sample of 20 per call, so it can't be used for a complete scrape.)
 *
 *   GET /api/get_web_card_promo?id=<id>
 *     → { title, thumb, from, to, cardType, content }
 *     `content` is HTML with labelled sections:
 *     "Merchant: Fox Kandy  Offer: Up to 50% off …  Period: …  Eligibility: …"
 */
import { OfferInputSchema, type Category, type OfferInput, type OfferType } from "../../src/lib/schema/offer";
import { fetchJson, mapLimit } from "../utils/http";
import { parseDiscount } from "../utils/parseDiscount";
import { squish, stripHtml } from "../utils/text";

const API_BASE = "https://venus.hnb.lk/api";
const LIST_URL = `${API_BASE}/get_all_web_card_promos?page=1&limit=1000`;
const DETAIL_URL = (id: number) => `${API_BASE}/get_web_card_promo?id=${id}`;
const PAGE_URL = (id: number) => `https://www.hnb.lk/personal/promotions/card-promotion/search/${id}`;
// thumb values are relative to this (also from the frontend bundle).
const IMAGE_BASE = "https://assets.hnb.lk/atdi";

const DETAIL_CONCURRENCY = 4;

export interface HnbListItem {
  id: number;
  title: string;
  thumb: string;
  merchant: string;
  cardType: string; // "credit" | "debit" | "credit/debit"
  to: string; // YYYY-MM-DD
}

export interface HnbDetail {
  from?: string;
  content?: string;
}

interface HnbListResponse {
  total: number;
  data: HnbListItem[];
}

export async function scrapeHnb(): Promise<OfferInput[]> {
  const list = await fetchJson<HnbListResponse>(LIST_URL);
  if (!Array.isArray(list.data)) throw new Error("[hnb] list response has no data array");
  if (list.total > list.data.length) {
    console.warn(`[hnb] list has ${list.total} promotions but only ${list.data.length} returned`);
  }

  // The list repeats a promotion once per category it's filed under.
  const unique = [...new Map(list.data.map((p) => [p.id, p])).values()];

  const today = new Date();
  const active = unique.filter(
    (p) => p.cardType?.toLowerCase().includes("credit") && !isPast(parseDate(p.to, "end"), today)
  );
  console.log(`[hnb] ${unique.length} unique promotions → ${active.length} active credit card promotions`);

  const details = await mapLimit(active, DETAIL_CONCURRENCY, (p) =>
    fetchJson<HnbDetail>(DETAIL_URL(p.id)).catch((err) => {
      // A missing detail shouldn't drop the offer — the list has enough to show it.
      console.warn(`[hnb] detail #${p.id} failed: ${err instanceof Error ? err.message : err}`);
      return {} as HnbDetail;
    })
  );

  const offers: OfferInput[] = [];
  active.forEach((item, i) => {
    const parsed = OfferInputSchema.safeParse(mapPromotion(item, details[i], today));
    if (parsed.success) offers.push(parsed.data);
    else console.warn(`[hnb] skipped #${item.id}:`, parsed.error.issues.map((x) => x.message).join("; "));
  });

  console.log(`[hnb] ${offers.length} valid offers`);
  return offers;
}

export function mapPromotion(item: HnbListItem, detail: HnbDetail, now = new Date()) {
  const title = squish(item.title);
  const text = stripHtml(detail.content ?? "");
  const offerText = section(text, "Offers?");
  const discount = parseDiscount(title);

  return {
    bank: "hnb",
    title,
    description: offerText?.slice(0, 1000),
    ...discount,
    category: detectCategory(`${title} ${offerText ?? ""}`, discount.offerType),
    merchant: squish(item.merchant ?? "") || merchantFromTitle(title),
    sourceUrl: PAGE_URL(item.id),
    imageUrl: imageUrl(item.thumb),
    validFrom: parseDate(detail.from, "start"),
    validUntil: parseDate(item.to, "end"),
    scrapedAt: now,
  };
}

/**
 * Pull a labelled section out of the flattened content, e.g. section(text, "Merchant")
 * on "Merchant : Fox Kandy Offer: …" → "Fox Kandy".
 */
const LABELS = "Merchant|Offers?|Period|Eligibility|Reservations|Contact|Location|Locations|Special Terms";
export function section(text: string, label: string): string | undefined {
  const re = new RegExp(`(?:^|\\s)(?:${label})\\s*:\\s*(.+?)(?=\\s(?:${LABELS})\\b[^:]{0,30}:|$)`, "i");
  return text.match(re)?.[1]?.trim() || undefined;
}

/** "Up to 50% off … at Fox Kandy" → "Fox Kandy" */
export function merchantFromTitle(title: string): string | undefined {
  const idx = title.toLowerCase().lastIndexOf(" at ");
  return idx === -1 ? undefined : title.slice(idx + 4).trim() || undefined;
}

function detectCategory(text: string, offerType: OfferType): Category {
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

function imageUrl(thumb: string | undefined): string | undefined {
  const path = thumb?.trim().replace(/^\/+/, "");
  if (!path) return undefined;
  if (/^https?:\/\//i.test(path)) return path;
  // Some paths contain spaces ("merchants/Grand Sky Lounge /x.png").
  return `${IMAGE_BASE}/${path.split("/").map(encodeURIComponent).join("/")}`;
}

/** Parse YYYY-MM-DD as a Sri Lanka (UTC+5:30) date — start or end of that day. */
export function parseDate(value: string | undefined, at: "start" | "end"): Date | undefined {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value.trim())) return undefined;
  const time = at === "start" ? "00:00:00" : "23:59:59";
  const d = new Date(`${value.trim()}T${time}+05:30`);
  return isNaN(d.getTime()) ? undefined : d;
}

function isPast(date: Date | undefined, now: Date): boolean {
  return date !== undefined && date < now;
}
