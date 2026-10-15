/**
 * Offer queries — shared by the API route and server components.
 */
import { z } from "zod";
import { dbConnect } from "./db/connect";
import { OfferModel } from "./models/offer.model";
import { BankSchema, CategorySchema, OfferTypeSchema, type Offer } from "./schema/offer";

export const PAGE_SIZE = 24;

export const SORTS = ["best", "ending", "newest"] as const;
export type Sort = (typeof SORTS)[number];

// Offers with no end date sort as "ends far in the future" so they don't
// crowd the top of "Ending soon" (Mongo puts missing values first otherwise).
const FAR_FUTURE = new Date("9999-12-31T00:00:00Z");

const SORT_STAGES: Record<Sort, Record<string, 1 | -1>> = {
  best: { discountPercentage: -1, _end: 1, _id: 1 },
  ending: { _end: 1, discountPercentage: -1, _id: 1 },
  newest: { createdAt: -1, discountPercentage: -1, _id: 1 },
};

/**
 * Active = not marked expired by the scraper AND not past its end date.
 * The date check matters when a bank's scrape fails for a few days: its
 * offers never get marked expired, but they still drop off the site on time.
 */
export function activeOfferFilter(now = new Date()) {
  return {
    isExpired: false,
    $or: [{ validUntil: { $exists: false } }, { validUntil: null }, { validUntil: { $gte: now } }],
  };
}

/** Query params from the URL. Anything invalid is dropped rather than erroring. */
export const OfferFiltersSchema = z.object({
  bank: BankSchema.optional().catch(undefined),
  category: CategorySchema.optional().catch(undefined),
  type: OfferTypeSchema.optional().catch(undefined),
  q: z.string().trim().max(100).optional().catch(undefined),
  sort: z.enum(SORTS).catch("best").default("best"),
  page: z.coerce.number().int().min(1).max(1000).catch(1).default(1),
});

export type OfferFilters = z.infer<typeof OfferFiltersSchema>;

export interface OfferPage {
  offers: Offer[];
  total: number;
  page: number;
  totalPages: number;
}

/** Turn URLSearchParams or Next.js searchParams into validated filters. */
export function parseFilters(params: URLSearchParams | Record<string, string | string[] | undefined>): OfferFilters {
  const get = (key: string) => {
    const v = params instanceof URLSearchParams ? params.get(key) : params[key];
    const s = Array.isArray(v) ? v[0] : v;
    return s || undefined;
  };
  return OfferFiltersSchema.parse({
    bank: get("bank"),
    category: get("category"),
    type: get("type"),
    q: get("q"),
    sort: get("sort"),
    page: get("page"),
  });
}

export async function getOffers(filters: OfferFilters): Promise<OfferPage> {
  await dbConnect();

  const query: Record<string, unknown> = { ...activeOfferFilter() };
  if (filters.bank) query.bank = filters.bank;
  if (filters.category) query.category = filters.category;
  if (filters.type) query.offerType = filters.type;
  if (filters.q) {
    const re = new RegExp(escapeRegex(filters.q), "i");
    query.$and = [{ $or: [{ merchant: re }, { title: re }] }];
  }

  const [docs, total] = await Promise.all([
    OfferModel.aggregate([
      { $match: query },
      { $addFields: { _end: { $ifNull: ["$validUntil", FAR_FUTURE] } } },
      { $sort: SORT_STAGES[filters.sort] },
      { $skip: (filters.page - 1) * PAGE_SIZE },
      { $limit: PAGE_SIZE },
      { $project: { _end: 0, __v: 0 } },
    ]),
    OfferModel.countDocuments(query),
  ]);

  return {
    offers: docs.map((d) => ({ ...d, _id: String(d._id) })) as Offer[],
    total,
    page: filters.page,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  };
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
