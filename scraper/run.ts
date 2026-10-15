/**
 * Scraper entry point.
 *
 *   npm run scrape                     scrape every bank and write to MongoDB
 *   npm run scrape -- --dry-run        scrape only, print a summary, no DB needed
 *   SCRAPE_BANKS=hnb npm run scrape    only the listed banks (comma-separated)
 */
import { dbConnect, dbDisconnect } from "../src/lib/db/connect";
import { parseBankList, scrapeAndSave, SCRAPERS } from "./pipeline";

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
  const banks = parseBankList(process.env.SCRAPE_BANKS);
  if (!dryRun) await dbConnect();

  let failed = 0;
  for (const bank of banks) {
    try {
      if (dryRun) {
        const offers = await SCRAPERS[bank]();
        const byType = Object.groupBy(offers, (o) => o.offerType);
        const summary = Object.entries(byType).map(([k, v]) => `${k}=${v?.length}`).join(" ");
        console.log(`[${bank}] dry run: ${offers.length} offers (${summary})`);
        continue;
      }
      const r = await scrapeAndSave(bank);
      console.log(
        `[${bank}] ${r.scraped} scraped · ${r.inserted} new · ${r.updated} refreshed · ${r.expired} expired (${r.seconds}s)`
      );
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
