/**
 * Scraper → MongoDB writes: upsert scraped offers and expire the ones that disappeared.
 */
import { merchantKey } from "../src/lib/merchant";
import { OfferModel } from "../src/lib/models/offer.model";
import type { Bank, OfferInput } from "../src/lib/schema/offer";

export interface UpsertResult {
  inserted: number;
  updated: number;
}

/** Insert new offers and refresh existing ones, matched on bank + sourceUrl. */
export async function upsertOffers(offers: OfferInput[]): Promise<UpsertResult> {
  if (offers.length === 0) return { inserted: 0, updated: 0 };

  const result = await OfferModel.bulkWrite(
    offers.map((offer) => ({
      updateOne: {
        filter: { bank: offer.bank, sourceUrl: offer.sourceUrl },
        update: { $set: { ...offer, merchantKey: merchantKey(offer.merchant), isExpired: false } },
        upsert: true,
      },
    })),
    { ordered: false }
  );

  return { inserted: result.upsertedCount, updated: result.modifiedCount };
}

/**
 * Mark a bank's offers as expired when they're past their end date
 * or no longer listed by the bank.
 *
 * Guard: if this run found far fewer offers than are currently active,
 * the scrape probably broke — skip "not listed" expiry so one bad run
 * can't wipe the site. Date-based expiry still runs.
 */
export async function expireOffers(bank: Bank, scraped: OfferInput[], minRatio = 0.5): Promise<number> {
  const now = new Date();
  const byDate = await OfferModel.updateMany(
    { bank, isExpired: false, validUntil: { $lt: now } },
    { $set: { isExpired: true } }
  );

  const activeCount = await OfferModel.countDocuments({ bank, isExpired: false });
  if (scraped.length < activeCount * minRatio) {
    console.warn(
      `[db] ${bank}: scraped ${scraped.length} but ${activeCount} active — skipping unlisted-offer expiry`
    );
    return byDate.modifiedCount;
  }

  const unlisted = await OfferModel.updateMany(
    { bank, isExpired: false, sourceUrl: { $nin: scraped.map((o) => o.sourceUrl) } },
    { $set: { isExpired: true } }
  );

  return byDate.modifiedCount + unlisted.modifiedCount;
}
