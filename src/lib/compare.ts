/**
 * Cross-bank comparison: merchants that currently have offers from 2+ banks.
 */
import { dbConnect } from "./db/connect";
import { OfferModel } from "./models/offer.model";
import type { Bank, Offer } from "./schema/offer";

export interface MerchantComparison {
  key: string;
  name: string;
  banks: Bank[];
  offers: Offer[]; // best first
  bestPercentage?: number;
}

export async function getMerchantComparisons(): Promise<MerchantComparison[]> {
  await dbConnect();

  const groups = await OfferModel.aggregate<{ _id: string; banks: Bank[]; offers: Offer[] }>([
    { $match: { isExpired: false, merchantKey: { $type: "string" } } },
    // Best offers first inside each group.
    { $sort: { discountPercentage: -1, validUntil: 1 } },
    { $group: { _id: "$merchantKey", banks: { $addToSet: "$bank" }, offers: { $push: "$$ROOT" } } },
    { $match: { "banks.1": { $exists: true } } },
  ]);

  return groups
    .map((g) => ({
      key: g._id,
      name: displayName(g.offers.map((o) => o.merchant ?? "")),
      banks: [...g.banks].sort(),
      offers: g.offers.map((o) => ({ ...o, _id: String(o._id) })),
      bestPercentage: g.offers.find((o) => o.discountPercentage !== undefined)?.discountPercentage,
    }))
    .sort((a, b) => (b.bestPercentage ?? -1) - (a.bestPercentage ?? -1) || a.name.localeCompare(b.name));
}

/** merchantKey → banks, for the "also at …" hint on offer cards. */
export async function getMultiBankMerchants(): Promise<Map<string, Bank[]>> {
  return new Map((await getMerchantComparisons()).map((c) => [c.key, c.banks]));
}

/** Prefer a mixed-case spelling ("Cargills Food City" over "CARGILLS FOOD CITY"), then the shortest. */
function displayName(names: string[]): string {
  const candidates = names.filter(Boolean);
  const mixed = candidates.filter((n) => n !== n.toUpperCase());
  return (mixed.length ? mixed : candidates).sort((a, b) => a.length - b.length)[0] ?? "";
}
