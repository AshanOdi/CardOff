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
       └─ scraper/banks/hnb.ts      fetch HNB's public promotions JSON API
            └─ parseDiscount        classify: percentage / cashback / installment / other
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

## Local setup

```bash
npm install
cp .env.example .env.local   # fill in MONGODB_URI
npm run scrape               # fill the DB with real offers (~90s)
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
| `npm run scrape` | Scrape all banks and write to MongoDB |
| `npm run scrape -- --dry-run` | Scrape and print a summary — no DB needed |
| `npm test` | Unit tests (Node's built-in test runner) |
| `npm run type-check` | TypeScript check |

## Status

✅ HNB scraper (~860 live offers) · ✅ API · ✅ offer grid + filters + pagination · ✅ CI · ✅ daily cron · ✅ deployed on Vercel
⏳ Commercial Bank scraper
