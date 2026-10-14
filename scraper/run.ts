/**
 * Scraper entry point.
 *
 *   npm run scrape             scrape every bank and write to MongoDB
 *   npm run scrape -- --dry-run   scrape only, print a summary, no DB needed
 */
import { dbConnect, dbDisconnect } from "../src/lib/db/connect";
import type { Bank, OfferInput } from "../src/lib/schema/offer";
import { scrapeComBank } from "./banks/combank";
import { scrapeHnb } from "./banks/hnb";
import { expireOffers, upsertOffers } from "./db";

const SCRAPERS: Record<Bank, (() => Promise<OfferInput[]>) | undefined> = {
  hnb: scrapeHnb,
  commercial_bank: scrapeComBank,
};

const dryRun = process.argv.includes("--dry-run");

function loadEnv() {
  for (const file of [".env.local", ".env"]) {
    try {
      process.loadEnvFile(file);
    } catch {
      // file not present — fine (CI passes env vars directly)
    }
  }
}

async function main() {
  loadEnv();
  if (!dryRun) await dbConnect();

  let failed = 0;
  for (const [bank, scrape] of Object.entries(SCRAPERS) as [Bank, (typeof SCRAPERS)[Bank]][]) {
    if (!scrape) continue;
    const started = Date.now();
    try {
      const offers = await scrape();
      if (dryRun) {
        const byType = Object.groupBy(offers, (o) => o.offerType);
        const summary = Object.entries(byType).map(([k, v]) => `${k}=${v?.length}`).join(" ");
        console.log(`[${bank}] dry run: ${offers.length} offers (${summary})`);
        continue;
      }
      const { inserted, updated } = await upsertOffers(offers);
      const expired = await expireOffers(bank, offers);
      const secs = ((Date.now() - started) / 1000).toFixed(1);
      console.log(`[${bank}] ${offers.length} scraped · ${inserted} new · ${updated} refreshed · ${expired} expired (${secs}s)`);
    } catch (err) {
      failed++;
      console.error(`[${bank}] FAILED:`, err);
    }
  }

  if (!dryRun) await dbDisconnect();
  // Non-zero exit makes a failed bank visible in GitHub Actions.
  process.exitCode = failed > 0 ? 1 : 0;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
