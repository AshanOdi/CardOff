import { test } from "node:test";
import assert from "node:assert/strict";
import { decodeEntities, stripHtml } from "./text";

test("decodes named and numeric entities", () => {
  assert.equal(decodeEntities("Shop at &#039;CDF Duty Free&#039;"), "Shop at 'CDF Duty Free'");
  assert.equal(decodeEntities("Reservations &#x2F; Contact &amp; more"), "Reservations / Contact & more");
  assert.equal(decodeEntities("&unknown; stays"), "&unknown; stays");
});

test("stripHtml removes tags and collapses whitespace", () => {
  assert.equal(stripHtml("<p><b>Merchant:</b>  Fox&nbsp;Kandy<br/>Offer</p>"), "Merchant: Fox Kandy Offer");
});
