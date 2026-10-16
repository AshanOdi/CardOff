import { test } from "node:test";
import assert from "node:assert/strict";
import { mapCard, parseCategoryPage, parseYmd } from "./peoples";
import { OfferInputSchema } from "../../src/lib/schema/offer";

// Trimmed copy of a real card from peoplesbank.lk/promotion-category/restaurants/?cardType=credit_card
const PAGE = `
<article class="offer-card" role="article">
  <div class="discount-badge">30%</div>
  <div class="offer-image">
    <a href="https://www.peoplesbank.lk/promotion/colombo-steak-house-30-off-credit/">
      <img src="https://www.peoplesbank.lk/roastoth/2024/10/Steak-House.jpg" alt="x" />
    </a>
  </div>
  <div class="card-content"><div>
    <a href="#"><div class="promo-short fw-medium">
      Colombo Steak House                     </div></a>
    <span class="fw-medium valid-date">Till December 31, 2026</span>
  </div></div>
  <div class="card-footer p-0">
    <a class="icon-btn calendar-btn" title="Add to Calendar" href="#"
      data-title="Colombo Steak House &#8211; 30% off &#8211; Credit"
      data-description="Maximum Bill Value: Rs.50,000/-"
      data-start="20261001"
      data-end="20261231">
      <img src="calendar.png" alt="Add to Calendar" /></a>
    <a class="icon-btn share-btn" title="Share Promotion" href="#"
      data-title="Colombo Steak House &#8211; 30% off &#8211; Credit"
      data-start-display="" data-end-display="December 31, 2026"
      data-permalink="https://www.peoplesbank.lk/promotion/colombo-steak-house-30-off-credit/">
      <img src="share.png" alt="Share" /></a>
  </div>
</article>`;

test("parseCategoryPage reads the card and its button data attributes", () => {
  assert.deepEqual(parseCategoryPage(PAGE), [
    {
      url: "https://www.peoplesbank.lk/promotion/colombo-steak-house-30-off-credit/",
      title: "Colombo Steak House – 30% off – Credit",
      merchant: "Colombo Steak House",
      badge: "30%",
      description: "Maximum Bill Value: Rs.50,000/-",
      start: "20261001",
      end: "20261231",
      imageUrl: "https://www.peoplesbank.lk/roastoth/2024/10/Steak-House.jpg",
    },
  ]);
});

test("mapCard builds a valid offer", () => {
  const offer = OfferInputSchema.parse(mapCard(parseCategoryPage(PAGE)[0], "restaurants"));
  assert.equal(offer.bank, "peoples_bank");
  assert.equal(offer.title, "Colombo Steak House – 30% off");
  assert.equal(offer.discountLabel, "30% off");
  assert.equal(offer.category, "dining");
  assert.equal(offer.validFrom?.toISOString(), "2026-09-30T18:30:00.000Z");
  assert.equal(offer.validUntil?.toISOString(), "2026-12-31T18:29:59.000Z");
});

test("uncategorised pages fall back to keyword detection", () => {
  const card = { ...parseCategoryPage(PAGE)[0], title: "Aadya Tea Bungalows – 30% Off – Credit", description: "30% off the Best Available Rate" };
  assert.equal(mapCard(card, "mastercard").category, "travel");
});

test("parseYmd", () => {
  assert.equal(parseYmd("20261031", "end")?.toISOString(), "2026-10-31T18:29:59.000Z");
  assert.equal(parseYmd("", "end"), undefined);
  assert.equal(parseYmd("2026-10-31", "end"), undefined);
});
