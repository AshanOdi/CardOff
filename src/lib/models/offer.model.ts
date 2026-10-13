/**
 * Mongoose model for offers.
 * Validation lives in the Zod schema; this only defines storage + indexes.
 */
import mongoose, { Schema, type Model } from "mongoose";
import { BANKS, CATEGORIES, OFFER_TYPES, type OfferInput } from "../schema/offer";

export type OfferDocument = OfferInput & {
  isExpired: boolean;
  createdAt: Date;
  updatedAt: Date;
};

const OfferSchema = new Schema<OfferDocument>(
  {
    bank: { type: String, enum: BANKS, required: true },
    title: { type: String, required: true },
    description: String,
    discountLabel: { type: String, required: true },
    discountPercentage: Number,
    offerType: { type: String, enum: OFFER_TYPES, required: true },
    category: { type: String, enum: CATEGORIES, default: "other" },
    merchant: String,
    sourceUrl: { type: String, required: true },
    imageUrl: String,
    validFrom: Date,
    validUntil: Date,
    isExpired: { type: Boolean, default: false },
    scrapedAt: { type: Date, required: true },
  },
  { timestamps: true }
);

// One document per offer page — the scraper upserts on this key.
OfferSchema.index({ bank: 1, sourceUrl: 1 }, { unique: true });
// Main listing query: active offers filtered by bank/category.
OfferSchema.index({ isExpired: 1, bank: 1, category: 1 });

// Reuse the compiled model across Next.js hot reloads.
export const OfferModel: Model<OfferDocument> =
  (mongoose.models.Offer as Model<OfferDocument>) ?? mongoose.model<OfferDocument>("Offer", OfferSchema);
