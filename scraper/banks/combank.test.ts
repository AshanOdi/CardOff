import { test } from "node:test";
import assert from "node:assert/strict";
import { isDebitOnly, mapCard, merchantFromTitle, parseDescription, parseListing, parseValidity } from "./combank";
import { OfferInputSchema } from "../../src/lib/schema/offer";

// Trimmed copy of a real card from combank.lk/rewards-promotions
const LISTING = `
<a class="reward box-shadow active"
   href="https://www.combank.lk/rewards-promotion/food-restaurants/enjoy-the-art-of-dining-at-hilton-colombo">
  <div class="reward-image" style="background-image: url('https://s3.ap-southeast-1.amazonaws.com/static.combank.cloud/photos/Hilton%20thumb.jpg')"></div>
  <div class="offer-tag percentage"> <p>Up to</p><p class='percentage'>20%</p><p>Off</p> </div>
  <div class="reward-content">
    <p class="category">Food &amp; Restaurants</p>
    <h3>Enjoy the art of dining at Hilton Colombo with ComBank Credit Cards</h3>
    <p class="valid-date"> Offer valid till 31st October 2026 </p>
  </div>
</a>
<a class="reward box-shadow"
   href="https://www.combank.lk/rewards-promotion/food-restaurants/enjoy-the-art-of-dining-at-hilton-colombo">dup</a>`;

const sl = (d?: Date) => d?.toISOString();

test("parseListing reads each card once", () => {
  const cards = parseListing(LISTING);
  assert.equal(cards.length, 1);
  assert.deepEqual(cards[0], {
    url: "https://www.combank.lk/rewards-promotion/food-restaurants/enjoy-the-art-of-dining-at-hilton-colombo",
    segment: "food-restaurants",
    title: "Enjoy the art of dining at Hilton Colombo with ComBank Credit Cards",
    tag: "Up to 20% Off",
    validity: "Offer valid till 31st October 2026",
    imageUrl: "https://s3.ap-southeast-1.amazonaws.com/static.combank.cloud/photos/Hilton%20thumb.jpg",
  });
});

test("mapCard builds a valid offer", () => {
  const offer = OfferInputSchema.parse(mapCard(parseListing(LISTING)[0], "Offer–20% discount for Credit Cards"));
  assert.equal(offer.bank, "commercial_bank");
  assert.equal(offer.offerType, "percentage");
  assert.equal(offer.discountLabel, "Up to 20% off");
  assert.equal(offer.category, "dining");
  assert.equal(offer.merchant, "Hilton Colombo");
});

test("mapCard falls back to the description when there is no tag", () => {
  const card = { ...parseListing(LISTING)[0], tag: undefined, title: "Embark on a journey to Korea with ComBank Visa Card" };
  const offer = mapCard(card, "Offer – Up to 30% discount for ComBank Visa Cards");
  assert.equal(offer.offerType, "percentage");
  assert.equal(offer.discountPercentage, 30);
});

test("debit-only offers are detected", () => {
  assert.equal(isDebitOnly("Great online deals at Daraz with ComBank Debit Cards"), true);
  assert.equal(isDebitOnly("Relax at Hunas Falls with ComBank Credit and Debit Cards"), false);
  assert.equal(isDebitOnly("Embark on a journey to Japan with ComBank Visa Cards"), false);
});

test("merchantFromTitle handles ComBank title styles", () => {
  const cases: [string, string | undefined][] = [
    ["Enjoy the art of dining at Via Torino Colombo with ComBank Credit Cards", "Via Torino Colombo"],
    ["Visit your favourite holiday destination with Crazy Jets and ComBank Credit Cards", "Crazy Jets"],
    ["Relax at your favourite destination from Aahaasa Collection with ComBank Premium Credit Cards", "Aahaasa Collection"],
    ["Great online deals with tudo.lk using ComBank Credit and Debit Cards", "tudo.lk"],
    ["Great online deals at Daraz for Electronic Items with ComBank Credit Cards", "Daraz"],
    ["Shop Duty Free at &#039;CDF Duty Free&#039; now and Pay later with ComBank Credit Cards".replace(/&#039;/g, "'"), "CDF Duty Free"],
    ["Fuel your journey with savings on Mobil Engine Oil with ComBank Credit and Debit Cards", "Mobil Engine Oil"],
    ["Enjoy the art of dining at your favourite restaurant with ComBank Credit and Debit Cards", undefined],
    ["Access premium medical care abroad with ease with ComBank Visa Cards", undefined],
    ["From the Magic of Disneyland to the Thrills of Universal Studios with ComBank Cards", undefined],
    ["Make your Online Payments with ComBank Credit Cards", undefined],
  ];
  for (const [title, expected] of cases) assert.equal(merchantFromTitle(title), expected, title);
});

test("parseValidity covers the listing's date phrasings", () => {
  const v = parseValidity;
  assert.equal(sl(v("Offer valid till 31st October 2026").validUntil), "2026-10-31T18:29:59.000Z");
  assert.equal(v("Offer valid till 31st October 2026").validFrom, undefined);
  assert.equal(sl(v("Offer valid on every Thursday till 15th October 2026").validUntil), "2026-10-15T18:29:59.000Z");

  const single = v("Offer valid on 29th October 2026");
  assert.equal(sl(single.validFrom), "2026-10-28T18:30:00.000Z");
  assert.equal(sl(single.validUntil), "2026-10-29T18:29:59.000Z");

  const range = v("Offer valid from 8.00PM on 09th October to 16th October 2026");
  assert.equal(sl(range.validFrom), "2026-10-08T18:30:00.000Z");
  assert.equal(sl(range.validUntil), "2026-10-16T18:29:59.000Z");

  // "from 20th … till 31st December" must not use December as the start
  const monthly = v("Offer valid from 24th to 11th of every month till 31st December 2026");
  assert.equal(monthly.validFrom, undefined);
  assert.equal(sl(monthly.validUntil), "2026-12-31T18:29:59.000Z");

  assert.equal(sl(v("Offer valid from 20th to 30th of every month till December 2026").validUntil), "2026-12-31T18:29:59.000Z");
  assert.equal(sl(v("Book before 15th November 2026").validUntil), "2026-11-15T18:29:59.000Z");
  assert.deepEqual(v("Valid while stocks last"), {});
});

test("parseDescription keeps offer lines and drops dates/phones", () => {
  const html = `<div class="editor-content"><p><b>Offer terms</b></p><ol>
    <li>Offer–15% discount for Credit Cards</li><li>Offer valid till 31st October 2026</li>
    <li>Maximum Discount value Rs.3,000/-</li><li>Reservations: 0761 336 675</li></ol>
    <ol><li>General terms…</li></ol></div><div class="share-block">`;
  assert.equal(parseDescription(html), "Offer–15% discount for Credit Cards · Maximum Discount value Rs.3,000/-");
  assert.equal(parseDescription("<html>no content</html>"), undefined);
});
