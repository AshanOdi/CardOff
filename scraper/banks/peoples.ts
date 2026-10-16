/**
 * People's Bank scraper.
 *
 * peoplesbank.lk is WordPress (REST API disabled) with server-rendered category
 * pages. `?cardType=credit_card` filters to credit card offers server-side, and
 * each category lists all its offers on one page (no real pagination), so a run
 * is ~15 requests and no detail pages.
 *
 * Each offer is an <article class="offer-card"> whose footer buttons carry
 * clean data attributes (dates as YYYYMMDD only on the calendar button):
 *   <div class="discount-badge">30%</div>
 *   <div class="offer-image"><a href="…/promotion/<slug>/"><img src="…"></a></div>
 *   <div class="promo-short">Colombo Steak House</div>
 *   <a class="icon-btn calendar-btn" data-title="Colombo Steak House – 30% off – Credit"
 *      data-description="Maximum Bill Value: Rs.50,000/-" data-start="" data-end="20261231">
 *   <a class="icon-btn share-btn" data-title="…"
 *      data-permalink="https://www.peoplesbank.lk/promotion/colombo-steak-house-30-off-credit/">
 */
import { OfferInputSchema, type Category, type OfferInput } from "../../src/lib/schema/offer";
import { detectCategory } from "../utils/category";
import { fetchHtml, sleep } from "../utils/http";
import { parseDiscount } from "../utils/parseDiscount";
import { decodeEntities, squish, stripHtml } from "../utils/text";

const BASE = "https://www.peoplesbank.lk/promotion-category";
const PAGE_DELAY_MS = 800;

/** Category slug → our category; undefined = detect from the offer text. */
const CATEGORY_PAGES: Record<string, Category | undefined> = {
  restaurants: "dining",
  supermarkets: "groceries",
  leisure: "travel", // almost all hotels and resorts
  travel: "travel",
  "online-stores": "online",
  "home-care-electronics": "shopping",
  clothing: "shopping",
  entertainment: "entertainment",
  "auto-mobile": undefined,
  wellness: undefined,
  others: undefined,
  visa: undefined,
  mastercard: undefined,
};

export interface PeoplesCard {
  url: string;
  title: string;
  merchant?: string;
  badge?: string;
  description?: string;
  start?: string; // YYYYMMDD
  end?: string; // YYYYMMDD
  imageUrl?: string;
}

export async function scrapePeoples(): Promise<OfferInput[]> {
  const byUrl = new Map<string, { card: PeoplesCard; slug: string }>();
  let failedPages = 0;

  for (const slug of Object.keys(CATEGORY_PAGES)) {
    try {
      const html = await fetchHtml(`${BASE}/${slug}/?cardType=credit_card`);
      // An offer can appear under several categories — the first one wins.
      for (const card of parseCategoryPage(html)) if (!byUrl.has(card.url)) byUrl.set(card.url, { card, slug });
    } catch (err) {
      // 404 just means the category was removed; anything else is worth a warning.
      failedPages++;
      console.warn(`[peoples] category ${slug} failed: ${err instanceof Error ? err.message : err}`);
    }
    await sleep(PAGE_DELAY_MS);
  }
  if (byUrl.size === 0) throw new Error(`[peoples] no offers found (${failedPages} category pages failed)`);

  const now = new Date();
  const offers: OfferInput[] = [];
  for (const { card, slug } of byUrl.values()) {
    const parsed = OfferInputSchema.safeParse(mapCard(card, slug, now));
    if (!parsed.success) {
      console.warn(`[peoples] skipped ${card.url}:`, parsed.error.issues.map((x) => x.message).join("; "));
    } else if (!(parsed.data.validUntil && parsed.data.validUntil < now)) {
      offers.push(parsed.data);
    }
  }

  console.log(`[peoples] ${byUrl.size} offers on ${Object.keys(CATEGORY_PAGES).length} category pages → ${offers.length} valid`);
  return offers;
}

export function parseCategoryPage(html: string): PeoplesCard[] {
  const cards: PeoplesCard[] = [];
  for (const [, body] of html.matchAll(/<article class="offer-card"[^>]*>([\s\S]*?)<\/article>/g)) {
    const button = (cls: string) => body.match(new RegExp(`<a[^>]*class="[^"]*${cls}[^"]*"([\\s\\S]*?)>`))?.[1] ?? "";
    const buttons = button("calendar-btn") + " " + button("share-btn");
    const attr = (name: string) => {
      const v = buttons.match(new RegExp(`\\sdata-${name}="([^"]*)"`))?.[1];
      return v ? squish(decodeEntities(v)) || undefined : undefined;
    };
    const url = attr("permalink") ?? body.match(/href="(https:\/\/www\.peoplesbank\.lk\/promotion\/[^"]+)"/)?.[1];
    const title = attr("title");
    if (!url || !title) continue;

    const merchantHtml = body.match(/class="promo-short[^"]*">([\s\S]*?)<\/div>/)?.[1];
    const badgeHtml = body.match(/class="discount-badge">([\s\S]*?)<\/div>/)?.[1];
    cards.push({
      url,
      title,
      merchant: merchantHtml ? stripHtml(merchantHtml) || undefined : undefined,
      badge: badgeHtml ? stripHtml(badgeHtml) || undefined : undefined,
      description: attr("description"),
      start: attr("start"),
      end: attr("end"),
      imageUrl: body.match(/class="offer-image"[\s\S]*?<img[^>]+src="([^"]+)"/)?.[1],
    });
  }
  return cards;
}

export function mapCard(card: PeoplesCard, slug: string, now = new Date()) {
  // "Colombo Steak House – 30% off – Credit" → "Colombo Steak House – 30% off"
  const title = card.title.replace(/\s*[–-]\s*credit\s*$/i, "");
  const discount = parseDiscount(`${card.badge ?? ""} ${title} · ${card.description ?? ""}`);
  if (discount.offerType === "other") discount.discountLabel = "Special offer";

  return {
    bank: "peoples_bank",
    title,
    description: card.description,
    ...discount,
    category: CATEGORY_PAGES[slug] ?? detectCategory(`${title} ${card.description ?? ""}`, discount.offerType),
    merchant: card.merchant,
    sourceUrl: card.url,
    imageUrl: card.imageUrl,
    validFrom: parseYmd(card.start, "start"),
    validUntil: parseYmd(card.end, "end"),
    scrapedAt: now,
  };
}

/** "20261231" → that day in Sri Lanka time (start or end of day). */
export function parseYmd(value: string | undefined, at: "start" | "end"): Date | undefined {
  const m = value?.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (!m) return undefined;
  const d = new Date(`${m[1]}-${m[2]}-${m[3]}T${at === "start" ? "00:00:00" : "23:59:59"}+05:30`);
  return isNaN(d.getTime()) ? undefined : d;
}
