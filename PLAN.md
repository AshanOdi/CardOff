# lanka-card-deals — Project Plan

> Portfolio project inspired by `card-max`'s architecture, rebuilt smaller, simpler, and
> **100% free-tier**. Goal: learn the full pipeline (scraper → DB → API → frontend) by
> building it myself, in ~2 weeks, with clean structured commits.

## 1. Why this scope (not a full card-max clone)

card-max needed **paid proxy services** (ZenRows, WebScrapingAPI) only because some banks
(NTB, BOC) run aggressive bot-protection (Akamai/Incapsula). Everything else in card-max is
free-tier (MongoDB Atlas M0, Vercel Hobby, GitHub Actions, Gemini free tier).

So this project avoids those banks entirely and only targets **banks with no bot-protection**,
which means the whole thing costs **$0** to build and run.

| Bank | Access method | Bot protection? | Use in this project? |
|---|---|---|---|
| **HNB** | Plain JSON REST API (`venus.hnb.lk`) | None | ✅ Primary target — Week 1 |
| **Commercial Bank** | Plain HTML (2-phase scrape) | None (works via direct HTTP) | ✅ Stretch goal — Week 2, if time allows |
| Sampath | API, but needed proxy fallback historically | Occasional | ❌ Skip for v1 |
| NTB, BOC | Needs Playwright / proxy fallback | Heavy (Incapsula/Akamai) | ❌ Skip — this is exactly the paid/fragile part we're avoiding |

## 2. What's deliberately cut vs. card-max (v1 scope)

To hit 2 weeks and stay free, v1 does **not** include:
- ❌ AI enrichment (Gemini/Groq semantic summaries) — pure scraped data only
- ❌ Admin dashboard / Google OAuth login
- ❌ Rate limiting (Upstash Redis)
- ❌ Proxy fallback / headless browser scraping
- ❌ Spec-kit / heavy spec-driven process — one plan file is enough for this scale
- ❌ AdSense, custom domain, analytics

These are all realistic **"v2" stretch ideas** once the core pipeline works and is on the CV.

## 3. What v1 DOES include (the real learning goals)

1. A working **scraper** for real, current bank offers (starting with HNB)
2. A simple **discount-type classifier** (percentage / cashback / other — simplified from
   card-max's 8-type system)
3. **MongoDB Atlas** (free M0) storage with upsert + basic dedup logic
4. A **Next.js API route** (`GET /api/offers`) with bank/category filtering
5. A **Next.js frontend** — offer grid, filter bar, basic responsive styling
6. **Daily automated scraping** via a free GitHub Actions cron
7. Deployed live on **Vercel** (free Hobby tier)
8. Structured, readable git history the whole way

## 4. Tech stack

- **Language**: TypeScript everywhere (scraper + app)
- **Frontend/API**: Next.js (App Router)
- **DB**: MongoDB Atlas (free M0) + Mongoose
- **Validation**: Zod (one schema, kept intentionally small)
- **Styling**: Tailwind CSS
- **Scraper runner**: `tsx` (same simple pattern as card-max — no separate build step)
- **CI/scheduling**: GitHub Actions (free minutes on a public repo)
- **Hosting**: Vercel free tier

## 5. Simplified data model (v1)

```ts
type Bank = "hnb" | "commercial_bank"; // grows over time

type OfferType = "percentage" | "cashback" | "other"; // simplified from card-max's 8 types

interface Offer {
  bank: Bank;
  title: string;
  description?: string;
  discountLabel: string;       // original text, e.g. "20% off"
  discountPercentage?: number; // parsed number, when applicable
  offerType: OfferType;
  category?: string;
  merchant?: string;
  sourceUrl: string;           // link back to the real bank offer page
  imageUrl?: string;
  validFrom?: Date;
  validUntil?: Date;
  isExpired: boolean;
  scrapedAt: Date;
}
```

## 6. Two-week day-by-day plan

**Week 1 — Data pipeline (the hard/interesting part first)**

| Day | Task | Commit(s) |
|---|---|---|
| 1 | Repo scaffold: Next.js app, TS config, `.env.example`, README, this plan | `chore: scaffold project` |
| 2 | Zod schema + Mongoose model + DB connection helper | `feat: add offer schema and db connection` |
| 3-4 | HNB scraper (fetch JSON, map to `Offer` shape) — correctness first, not speed | `feat: add HNB scraper` |
| 5 | Discount-type classifier (`parseDiscount.ts`, simplified) + upsert-to-DB logic | `feat: add discount parser and db upsert` |
| 6 | Manual run against real HNB data, verify in MongoDB, fix bugs | `fix: ...` (as needed) |
| 7 | **Checkpoint**: review real scraped data together, decide if Commercial Bank scraper fits in Week 2 | — |

**Week 2 — API, frontend, deploy**

| Day | Task | Commit(s) |
|---|---|---|
| 8 | `GET /api/offers` route with bank/category query params | `feat: add offers API route` |
| 9 | Offer grid page (Server Component, real data) | `feat: add offer grid page` |
| 10 | Filter bar (URL-params-as-state, same good pattern card-max uses) | `feat: add filter bar` |
| 11 | Styling pass (Tailwind), responsive check, empty/loading states | `feat: polish offer card styling` |
| 12 | Deploy to Vercel + MongoDB Atlas, verify live | `chore: deploy to vercel` |
| 13 | GitHub Actions daily cron for the scraper | `feat: add daily scraper cron` |
| 14 | README polish, buffer day for whatever slipped | `docs: finalize README` |

## 7. Commit conventions

Same lightweight style as card-max, kept simple:
```
feat: ...     new functionality
fix: ...      bug fix
chore: ...    setup/config/deps
docs: ...     README/plan updates
```
One logical change per commit, small enough to explain in one sentence.

## 8. How we'll work day to day

- Each session: I explain (in Sinhala) what we're building and why before writing code.
- Real data only — no mock/fake offers, same principle as the investigation we already did.
- Commit after each working step, not one giant commit at the end.
- If something breaks (e.g. HNB API shape changes), we debug it together as a real learning moment, not just silently patch it.
