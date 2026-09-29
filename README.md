# Lanka Card Deals

A small, free-tier-only Sri Lankan bank credit card offers aggregator — a portfolio
project inspired by the architecture of a larger crawler+Next.js project, rebuilt from
scratch, simpler, and without any paid services.

See [PLAN.md](./PLAN.md) for the full 2-week build plan, scope decisions, and daily
progress log.

## Stack

Next.js (App Router) · TypeScript · MongoDB Atlas (free M0) · Tailwind CSS · GitHub Actions

## Local setup

```bash
npm install
cp .env.example .env.local   # fill in MONGODB_URI
npm run dev
```

## Status

🚧 Day 1 — project scaffold. Scraper and real data pipeline coming next.
