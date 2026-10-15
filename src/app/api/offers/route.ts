/**
 * GET /api/offers?bank=hnb&category=dining&type=percentage&q=pizza&sort=ending&page=2
 *   sort: best (default) | ending | newest
 */
import { NextResponse, type NextRequest } from "next/server";
import { getOffers, parseFilters } from "@/lib/offers";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const result = await getOffers(parseFilters(req.nextUrl.searchParams));
    return NextResponse.json(result, {
      // Offers change once a day — let the CDN cache for 10 minutes.
      headers: { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=3600" },
    });
  } catch (err) {
    console.error("[api/offers]", err);
    return NextResponse.json({ error: "Failed to load offers" }, { status: 500 });
  }
}
