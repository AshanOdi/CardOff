/**
 * Offer schema — the single source of truth for an offer's shape.
 * Shared by the scraper (validation before DB write) and the Next.js app.
 */
import { z } from "zod";

export const BANKS = ["hnb", "commercial_bank"] as const;
export const OFFER_TYPES = ["percentage", "cashback", "installment", "other"] as const;
export const CATEGORIES = [
  "dining",
  "travel",
  "shopping",
  "groceries",
  "fuel",
  "health",
  "entertainment",
  "online",
  "other",
] as const;

export const BankSchema = z.enum(BANKS);
export const OfferTypeSchema = z.enum(OFFER_TYPES);
export const CategorySchema = z.enum(CATEGORIES);

export const OfferInputSchema = z.object({
  bank: BankSchema,
  title: z.string().trim().min(1).max(300),
  description: z.string().trim().max(1000).optional(),
  discountLabel: z.string().trim().min(1).max(200),
  discountPercentage: z.number().min(0).max(100).optional(),
  offerType: OfferTypeSchema,
  category: CategorySchema.default("other"),
  merchant: z.string().trim().max(150).optional(),
  sourceUrl: z.url(),
  imageUrl: z.url().optional(),
  validFrom: z.date().optional(),
  validUntil: z.date().optional(),
  scrapedAt: z.date(),
});

export type Bank = z.infer<typeof BankSchema>;
export type OfferType = z.infer<typeof OfferTypeSchema>;
export type Category = z.infer<typeof CategorySchema>;
export type OfferInput = z.infer<typeof OfferInputSchema>;

/** An offer as stored in the DB (adds lifecycle fields). */
export type Offer = OfferInput & {
  _id: string;
  isExpired: boolean;
  createdAt: Date;
  updatedAt: Date;
};
