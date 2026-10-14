/**
 * Commercial Bank of Ceylon scraper.
 *
 * No API here — plain server-rendered HTML, no bot protection.
 *
 *   1. https://www.combank.lk/rewards-promotions lists every offer on one page
 *      (the category "tabs" are just anchors). Each card has:
 *        <a class="reward …" href="/rewards-promotion/<category>/<slug>">
 *          <div class="reward-image" style="background-image: url('…thumb.jpg')">
 *          <div class="offer-tag percentage"><p>Up to</p><p>15%</p><p>Off</p></div>   (optional)
 *          <h3>Enjoy the art of dining at Via Torino Colombo with ComBank Credit Cards</h3>
 *          <p class="valid-date">Offer valid till 31st October 2026</p>
 *   2. Each detail page has the offer terms list we use as the description
 *      ("Offer – 15% discount …", "Maximum Discount value Rs.3,000/-").
 */
import { OfferInputSchema, type Category, type OfferInput } from "../../src/lib/schema/offer";
import { detectCategory } from "../utils/category";
import { fetchHtml, mapLimit, sleep } from "../utils/http";
import { parseDiscount } from "../utils/parseDiscount";
import { squish, stripHtml } from "../utils/text";

const LISTING_URL = "https://www.combank.lk/rewards-promotions";
// combank.lk sits behind an AWS WAF rate limit (403 from CloudFront when
// exceeded) — keep detail fetches slow and few.
const DETAIL_CONCURRENCY = 2;
const DETAIL_DELAY_MS = 600;

/** URL category segment → our category. Missing ones fall back to keyword detection. */
const CATEGORY_BY_SEGMENT: Record<string, Category> = {
  "food-restaurants": "dining",
  leisure: "travel",
  travel: "travel",
  supermarket: "groceries",
  "online-shopping": "online",
  healthcare: "health",
  "fashion-jewellery": "shopping",
};

export interface ComBankCard {
  url: string;
  segment: string;
  title: string;
  tag?: string; // "Up to 15% Off"
  validity: string; // "Offer valid till 31st October 2026"
  imageUrl?: string;
}

export async function scrapeComBank(): Promise<OfferInput[]> {
  const cards = parseListing(await fetchHtml(LISTING_URL));
  if (cards.length === 0) throw new Error("[combank] no offer cards found — page layout may have changed");

  const credit = cards.filter((c) => !isDebitOnly(c.title));
  console.log(`[combank] ${cards.length} offers on listing → ${credit.length} usable with credit cards`);

  // Descriptions are a nice-to-have: once the WAF starts answering 403, stop
  // fetching details and keep the listing data rather than hammering it.
  let blocked = false;
  const descriptions = await mapLimit(credit, DETAIL_CONCURRENCY, async (c) => {
    if (blocked) return undefined;
    await sleep(DETAIL_DELAY_MS);
    try {
      return parseDescription(await fetchHtml(c.url, 2));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.startsWith("HTTP 403")) blocked = true;
      console.warn(`[combank] detail failed ${c.url}: ${msg}`);
      return undefined;
    }
  });
  if (blocked) console.warn("[combank] rate-limited (403) — some offers saved without descriptions");

  const now = new Date();
  const offers: OfferInput[] = [];
  credit.forEach((card, i) => {
    const parsed = OfferInputSchema.safeParse(mapCard(card, descriptions[i], now));
    if (!parsed.success) {
      console.warn(`[combank] skipped ${card.url}:`, parsed.error.issues.map((x) => x.message).join("; "));
    } else if (parsed.data.validUntil && parsed.data.validUntil < now) {
      // Listing sometimes still shows offers that ended — skip them.
    } else {
      offers.push(parsed.data);
    }
  });

  console.log(`[combank] ${offers.length} valid offers`);
  return offers;
}

export function parseListing(html: string): ComBankCard[] {
  const seen = new Set<string>();
  const cards: ComBankCard[] = [];

  for (const [, href, body] of html.matchAll(/<a\s+class="reward\b[^"]*"\s+href="([^"]+)"\s*>([\s\S]*?)<\/a>/g)) {
    const url = new URL(href, LISTING_URL).toString();
    if (seen.has(url)) continue;
    seen.add(url);

    const segment = new URL(url).pathname.split("/")[2] ?? "";
    const tagHtml = body.match(/<div class="offer-tag[^"]*">([\s\S]*?)<\/div>/)?.[1];
    cards.push({
      url,
      segment,
      title: stripHtml(body.match(/<h3>([\s\S]*?)<\/h3>/)?.[1] ?? ""),
      tag: tagHtml ? stripHtml(tagHtml) || undefined : undefined,
      validity: stripHtml(body.match(/class="valid-date">([\s\S]*?)<\/p>/)?.[1] ?? ""),
      imageUrl: body.match(/background-image:\s*url\(['"]?([^'")]+)['"]?\)/)?.[1],
    });
  }
  return cards;
}

/** Titles name the cards: "…with ComBank Debit Cards" alone means no credit card. */
export function isDebitOnly(title: string): boolean {
  return /\bdebit\b/i.test(title) && !/\bcredit\b/i.test(title);
}

export function mapCard(card: ComBankCard, description: string | undefined, now = new Date()) {
  // Tag holds the number ("Up to 15% Off"); the title says if it's cashback / easy payment.
  let discount = parseDiscount(`${card.tag ?? ""} ${card.title}`);
  // No tag (e.g. "Embark on a journey to Korea…") — the terms usually state it.
  if (discount.offerType === "other" && description) discount = parseDiscount(description);
  if (discount.offerType === "other") discount.discountLabel = "Special offer";

  const { validFrom, validUntil } = parseValidity(card.validity);
  return {
    bank: "commercial_bank",
    title: card.title,
    description,
    ...discount,
    category: CATEGORY_BY_SEGMENT[card.segment] ?? detectCategory(card.title, discount.offerType),
    merchant: merchantFromTitle(card.title),
    sourceUrl: card.url,
    imageUrl: normaliseUrl(card.imageUrl),
    validFrom,
    validUntil,
    scrapedAt: now,
  };
}

/**
 * Pull the merchant out of ComBank's title style:
 *   "Enjoy the art of dining at Hilton Colombo with ComBank Credit Cards"  → "Hilton Colombo"
 *   "Visit your favourite holiday destination with Crazy Jets and ComBank" → "Crazy Jets"
 *   "Relax at your favourite destination from Aahaasa Collection with …"   → "Aahaasa Collection"
 * Takes the phrase after the *last* at/with/from/via before "… ComBank".
 * Case-sensitive on purpose: lowercase words are prepositions, but "Via Torino"
 * or a leading "From the Magic of…" are part of a name/sentence start.
 */
export function merchantFromTitle(title: string): string | undefined {
  const m = title.match(
    /\b(?:at|with|from|via)\s+((?:(?!\b(?:at|with|from|via)\b).)+?)\s+(?:with|using|and)\s+(?:ComBank|LankaPay)\b/
  );
  let name = m?.[1]?.trim();
  if (!name) return undefined;

  name = name
    .replace(/^(your\s+favourite|savings\s+on)\s+/i, "")
    .replace(/\s+for\s+.+$/i, "") // "Daraz for Electronic Items" → "Daraz"
    .replace(/\s+now$/i, "");
  const quoted = name.match(/^['"](.+?)['"]/);
  if (quoted) name = quoted[1];

  // "your favourite restaurant(s)", "selected Supermarkets" — not a real merchant
  if (/^(restaurants?|holiday destination|destination|hotels?|ease|selected\s+\w+)$/i.test(name)) return undefined;
  return squish(name) || undefined;
}

/** Re-encode an image URL that may contain raw spaces; undefined if malformed. */
function normaliseUrl(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  try {
    return new URL(raw.trim().replace(/ /g, "%20")).toString();
  } catch {
    return undefined;
  }
}

const MONTHS = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december",
];
const DAY_MONTH = String.raw`(\d{1,2})(?:st|nd|rd|th)?\s+(${MONTHS.join("|")})`;

/** Sri Lanka midnight / end-of-day for a given calendar date. */
function slDate(year: number, monthIdx: number, day: number, at: "start" | "end"): Date {
  const mm = String(monthIdx + 1).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return new Date(`${year}-${mm}-${dd}T${at === "start" ? "00:00:00" : "23:59:59"}+05:30`);
}

/**
 * Handles the phrasings seen on the listing:
 *   "Offer valid till 31st October 2026"                       → until
 *   "Offer valid on every Thursday till 15th October 2026"     → until
 *   "Offer valid on 29th October 2026"                         → single day
 *   "Offer valid from 8.00PM on 09th October to 16th October 2026" → from + until
 *   "Booking valid 11th to 25th October 2026"                  → until (from needs a month)
 *   "Book before 15th November 2026"                           → until
 *   "… of every month till December 2026"                      → until month end
 */
export function parseValidity(text: string): { validFrom?: Date; validUntil?: Date } {
  const lower = text.toLowerCase();
  const full = [...lower.matchAll(new RegExp(`${DAY_MONTH}\\s+(\\d{4})`, "g"))];
  if (full.length === 0) {
    // "till December 2026" — no day given, so the offer runs to month end.
    const monthOnly = lower.match(new RegExp(`(${MONTHS.join("|")})\\s+(\\d{4})`));
    if (!monthOnly) return {};
    const monthIdx = MONTHS.indexOf(monthOnly[1]);
    const lastDay = new Date(Date.UTC(Number(monthOnly[2]), monthIdx + 1, 0)).getUTCDate();
    return { validUntil: slDate(Number(monthOnly[2]), monthIdx, lastDay, "end") };
  }

  const last = full[full.length - 1];
  const year = Number(last[3]);
  const validUntil = slDate(year, MONTHS.indexOf(last[2]), Number(last[1]), "end");

  // Single-day offer: "valid on 29th October 2026" (not "on every …")
  const single = lower.match(new RegExp(`valid\\s+on\\s+${DAY_MONTH}\\s+(\\d{4})`));
  if (single && full.length === 1) {
    return { validFrom: slDate(year, MONTHS.indexOf(single[2]), Number(single[1]), "start"), validUntil };
  }

  // "from (8.00PM on) 09th October to …": start date usually omits the year.
  const from = lower.match(new RegExp(`from\\s+(?:[\\d.:]+\\s*[ap]m\\s+on\\s+)?${DAY_MONTH}`));
  if (from) {
    const monthIdx = MONTHS.indexOf(from[2]);
    // A start month after the end month means it began last year.
    const fromYear = monthIdx > MONTHS.indexOf(last[2]) ? year - 1 : year;
    return { validFrom: slDate(fromYear, monthIdx, Number(from[1]), "start"), validUntil };
  }

  return { validUntil };
}

/**
 * Detail page: the first <ol> in .editor-content is the offer summary.
 * Keep the lines that describe the deal; drop dates/phone numbers.
 */
export function parseDescription(html: string): string | undefined {
  const content = html.match(/class="editor-content">([\s\S]*?)<div class="share-block"/)?.[1];
  const firstList = content?.match(/<ol>([\s\S]*?)<\/ol>/)?.[1];
  if (!firstList) return undefined;

  const lines = [...firstList.matchAll(/<li>([\s\S]*?)<\/li>/g)]
    .map(([, li]) => stripHtml(li))
    .filter((l) => l && !/^(offer\s+)?valid|reservation|contact|hotline|call\b|tel\b/i.test(l));

  return lines.join(" · ").slice(0, 1000) || undefined;
}
