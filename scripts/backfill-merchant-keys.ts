/**
 * One-off: set merchantKey on offers saved before the field existed.
 * New scrapes set it automatically (scraper/db.ts).
 *
 *   npx tsx scripts/backfill-merchant-keys.ts
 */
import { dbConnect, dbDisconnect } from "../src/lib/db/connect";
import { merchantKey } from "../src/lib/merchant";
import { OfferModel } from "../src/lib/models/offer.model";

async function main() {
  try {
    process.loadEnvFile(".env.local");
  } catch {
    // env passed directly
  }
  await dbConnect();

  const docs = await OfferModel.find({}, { merchant: 1 }).lean();
  const ops = docs.map((d) => {
    const key = merchantKey(d.merchant);
    return {
      updateOne: {
        filter: { _id: d._id },
        update: key ? { $set: { merchantKey: key } } : { $unset: { merchantKey: 1 as const } },
      },
    };
  });

  const res = await OfferModel.bulkWrite(ops, { ordered: false });
  console.log(`[backfill] ${docs.length} offers checked, ${res.modifiedCount} updated`);
  await OfferModel.syncIndexes();
  await dbDisconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
