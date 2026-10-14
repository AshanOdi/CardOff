/**
 * Merchant name normalisation, used to match the same merchant across banks.
 *
 *   "SPAR Supermarkets" (HNB) and "Spar Supermarket" (ComBank) → "spar"
 *   "SriLankan Airlines" and "Sri Lankan Airlines"              → "srilankanairlines"
 *
 * Deliberately conservative: only legal suffixes and a few filler words are
 * dropped. Dropping "restaurants" would wrongly match "Softlogic Restaurants"
 * with the unrelated "Softlogic" retail offer.
 */
const FILLER = /\b(pvt|private|ltd|limited|plc|the|supermarkets?)\b/g;

export function merchantKey(name: string | undefined | null): string | undefined {
  if (!name) return undefined;
  const key = name.toLowerCase().replace(/\(.*?\)/g, " ").replace(FILLER, " ").replace(/[^a-z0-9]/g, "");
  // Very short keys ("lk", "m") match too much to be useful.
  return key.length >= 3 ? key : undefined;
}
