/**
 * Offer queries — shared by the API route and server components.
 */
import { z } from "zod";
import { dbConnect } from "./db/connect";
import { OfferModel } from "./models/offer.model";
import { BankSchema, CategorySchema, OfferTypeSchema, type Offer } from "./schema/offer";

export const PAGE_SIZE = 24;

/** Query params from the URL. Anything invalid is dropped rather than erroring. */
export const OfferFiltersSchema = z.object({
  bank: BankSchema.optional().catch(undefined),
  category: CategorySchema.optional().catch(undefined),
  type: OfferTypeSchema.optional().catch(undefined),
  q: z.string().trim().max(100).optional().catch(undefined),
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
    page: get("page"),
  });
}

export async function getOffers(filters: OfferFilters): Promise<OfferPage> {
  await dbConnect();

  const query: Record<string, unknown> = { isExpired: false };
  if (filters.bank) query.bank = filters.bank;
  if (filters.category) query.category = filters.category;
  if (filters.type) query.offerType = filters.type;
  if (filters.q) {
    const re = new RegExp(escapeRegex(filters.q), "i");
    query.$or = [{ merchant: re }, { title: re }];
  }

  const [docs, total] = await Promise.all([
    OfferModel.find(query)
      // Biggest discounts first, then offers ending soonest.
      .sort({ discountPercentage: -1, validUntil: 1, _id: 1 })
      .skip((filters.page - 1) * PAGE_SIZE)
      .limit(PAGE_SIZE)
      .lean(),
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
