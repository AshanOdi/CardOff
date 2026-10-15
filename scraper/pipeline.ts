/**
 * Scrape one bank and save the result — shared by the CLI runner (run.ts)
 * and the Vercel cron route (src/app/api/cron/scrape).
 * Expects the DB connection to be open already.
 */
import { BANKS, type Bank, type OfferInput } from "../src/lib/schema/offer";
import { scrapeComBank } from "./banks/combank";
import { scrapeHnb } from "./banks/hnb";
import { expireOffers, upsertOffers } from "./db";

export const SCRAPERS: Record<Bank, () => Promise<OfferInput[]>> = {
  hnb: scrapeHnb,
  commercial_bank: scrapeComBank,
};

export interface BankRunResult {
  bank: Bank;
  scraped: number;
  inserted: number;
  updated: number;
  expired: number;
  seconds: number;
}

export async function scrapeAndSave(bank: Bank): Promise<BankRunResult> {
  const started = Date.now();
  const offers = await SCRAPERS[bank]();
  const { inserted, updated } = await upsertOffers(offers);
  const expired = await expireOffers(bank, offers);
  return {
    bank,
    scraped: offers.length,
    inserted,
    updated,
    expired,
    seconds: Number(((Date.now() - started) / 1000).toFixed(1)),
  };
}

/** "hnb,commercial_bank" → valid banks; empty/undefined → all banks. */
export function parseBankList(value: string | undefined | null): Bank[] {
  if (!value?.trim()) return [...BANKS];
  const wanted = value.split(",").map((s) => s.trim());
  return BANKS.filter((b) => wanted.includes(b));
}
