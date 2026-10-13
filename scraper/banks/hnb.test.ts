import { test } from "node:test";
import assert from "node:assert/strict";
import { mapPromotion, merchantFromTitle, parseDate, section } from "./hnb";
import { OfferInputSchema } from "../../src/lib/schema/offer";

const CONTENT =
  "Merchant : Fox Kandy Offer: Up to 50% off (from rack rates) on Room Only basis " +
  "Period: Till 31st October 2026 Eligibility: All HNB Credit Card Reservations / Contact No : 0742532186";

test("section reads labelled values from flattened content", () => {
  assert.equal(section(CONTENT, "Merchant"), "Fox Kandy");
  assert.equal(section(CONTENT, "Offers?"), "Up to 50% off (from rack rates) on Room Only basis");
  assert.equal(section(CONTENT, "Period"), "Till 31st October 2026");
  assert.equal(section(CONTENT, "Missing"), undefined);
});

test("merchantFromTitle takes the text after the last ' at '", () => {
  assert.equal(merchantFromTitle("20% off on BB basis at Yara Nuwara Eliya"), "Yara Nuwara Eliya");
  assert.equal(merchantFromTitle("VISA CONCIERGE PROGRAM"), undefined);
});

test("parseDate uses Sri Lanka time and covers the whole last day", () => {
  assert.equal(parseDate("2026-10-31", "start")?.toISOString(), "2026-10-30T18:30:00.000Z");
  assert.equal(parseDate("2026-10-31", "end")?.toISOString(), "2026-10-31T18:29:59.000Z");
  assert.equal(parseDate("", "end"), undefined);
  assert.equal(parseDate("2026-03--01", "start"), undefined);
});

test("mapPromotion builds a valid offer", () => {
  const raw = mapPromotion(
    {
      id: 4052,
      title: "Up to 50% off on Room only basis at Fox Kandy ",
      thumb: "merchants/Fox Kandy/fox.jpg",
      merchant: "Fox Kandy",
      cardType: "credit",
      to: "2026-11-30",
    },
    { from: "2026-09-04", content: `<p><strong>${CONTENT}</strong></p>` },
    new Date("2026-10-01T00:00:00Z")
  );
  const offer = OfferInputSchema.parse(raw);

  assert.equal(offer.offerType, "percentage");
  assert.equal(offer.discountPercentage, 50);
  assert.equal(offer.category, "travel");
  assert.equal(offer.merchant, "Fox Kandy");
  assert.equal(offer.sourceUrl, "https://www.hnb.lk/personal/promotions/card-promotion/search/4052");
  assert.equal(offer.imageUrl, "https://assets.hnb.lk/atdi/merchants/Fox%20Kandy/fox.jpg");
});
