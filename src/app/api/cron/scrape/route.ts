/**
 * GET /api/cron/scrape?banks=commercial_bank
 *
 * Called daily by Vercel Cron (see vercel.json). Exists because combank.lk's
 * WAF blocks GitHub Actions runner IPs; HNB still runs from GitHub Actions.
 *
 * Protected by CRON_SECRET: Vercel Cron sends `Authorization: Bearer <CRON_SECRET>`.
 */
import { NextResponse, type NextRequest } from "next/server";
import { dbConnect } from "@/lib/db/connect";
import { parseBankList, scrapeAndSave, type BankRunResult } from "../../../../../scraper/pipeline";

export const dynamic = "force-dynamic";
// Commercial Bank takes ~1 min (throttled detail pages); leave headroom.
export const maxDuration = 300;

const DEFAULT_BANKS = "commercial_bank";

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 500 });
  }
  if (req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const banks = parseBankList(req.nextUrl.searchParams.get("banks") ?? DEFAULT_BANKS);
  await dbConnect();

  const results: (BankRunResult | { bank: string; error: string })[] = [];
  for (const bank of banks) {
    try {
      const r = await scrapeAndSave(bank);
      console.log(`[cron] ${bank}: ${r.scraped} scraped · ${r.inserted} new · ${r.expired} expired (${r.seconds}s)`);
      results.push(r);
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      console.error(`[cron] ${bank} FAILED:`, error);
      results.push({ bank, error });
    }
  }

  const ok = results.every((r) => !("error" in r));
  return NextResponse.json({ ok, results }, { status: ok ? 200 : 502 });
}
