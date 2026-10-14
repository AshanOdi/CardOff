# Lanka Card Deals

**Live:** https://card-off.vercel.app

A small, free-tier-only Sri Lankan bank credit card offers aggregator — a portfolio
project inspired by the architecture of a larger crawler+Next.js project, rebuilt from
scratch, simpler, and without any paid services.

See [PLAN.md](./PLAN.md) for the full 2-week build plan, scope decisions, and daily
progress log.

## Stack

Next.js (App Router) · TypeScript · MongoDB Atlas (free M0) · Mongoose · Zod · Tailwind CSS · GitHub Actions

## How it works

```
GitHub Actions (daily 06:00 SL time)
  └─ scraper/run.ts
       ├─ scraper/banks/hnb.ts      HNB: public promotions JSON API
       ├─ scraper/banks/combank.ts  Commercial Bank: server-rendered HTML listing + detail pages
       └─ parseDiscount             classify: percentage / cashback / installment / other
       └─ scraper/db.ts             upsert by bank+sourceUrl, expire ended/removed offers
                                    ▼
                              MongoDB Atlas
                                    ▼
Next.js on Vercel
  ├─ /                server-rendered offer grid, filters kept in the URL
  └─ /api/offers      JSON API: ?bank= &category= &type= &q= &page=
```

### HNB data source

HNB's site loads promotions from `venus.hnb.lk`. The endpoint most people find first,
`get_all_pcard_promotions`, returns a **random 20 promotions per call**. The scraper
uses `get_all_web_card_promos?limit=1000` (the full ~900-promotion list) plus
`get_web_card_promo?id=` for each offer's details. Logos are served from
`assets.hnb.lk/atdi/`.

### Commercial Bank data source

`combank.lk/rewards-promotions` lists every offer on one page (the category tabs are
anchors). Detail pages add the offer terms used as the description. The site sits behind
an AWS WAF rate limit (~75 requests in a few minutes → CloudFront 403), so detail pages
are fetched 2 at a time with a delay, and the scraper stops fetching details after the
first 403 — offers are still saved from the listing data.

Payment-plan offers list fees like "12 Months – 3.5%". Those are commission, not
discounts, so they're labelled "easy payment plan" — "0%" is only shown when the bank
says 0%.

## Local setup

```bash
npm install
cp .env.example .env.local   # fill in MONGODB_URI
npm run scrape               # fill the DB with real offers (~2–3 min)
npm run dev
```

No Atlas account yet? Run Mongo locally:

```bash
docker run -d --name lcd-mongo -p 127.0.0.1:27017:27017 mongo
# MONGODB_URI=mongodb://127.0.0.1:27017
```

## Scripts

| Command | What it does |
|---|---|
| `npm run scrape` | Scrape all banks (HNB, Commercial Bank) and write to MongoDB |
| `npm run scrape -- --dry-run` | Scrape and print a summary — no DB needed |
| `npm test` | Unit tests (Node's built-in test runner) |
| `npm run type-check` | TypeScript check |

## Status

✅ HNB (~860 offers) + Commercial Bank (~70 offers) scrapers · ✅ API · ✅ offer grid + filters + pagination
✅ CI · ✅ daily cron · ✅ deployed on Vercel
