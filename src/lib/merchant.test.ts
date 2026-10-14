import { test } from "node:test";
import assert from "node:assert/strict";
import { merchantKey } from "./merchant";

test("same merchant across banks gets the same key", () => {
  assert.equal(merchantKey("SPAR Supermarkets"), merchantKey("Spar Supermarket"));
  assert.equal(merchantKey("SriLankan Airlines"), merchantKey("Sri Lankan Airlines"));
  assert.equal(merchantKey("CARGILLS FOOD CITY"), merchantKey("Cargills Food City"));
  assert.equal(merchantKey("Solar Booze (Pvt) Ltd"), merchantKey("Solar Booze"));
  assert.equal(merchantKey("Tudo.LK"), merchantKey("tudo.lk"));
});

test("different businesses keep different keys", () => {
  assert.notEqual(merchantKey("Softlogic Restaurants"), merchantKey("Softlogic"));
  assert.notEqual(merchantKey("Hilton Colombo"), merchantKey("Hilton Colombo Residences"));
});

test("empty or too-short names have no key", () => {
  assert.equal(merchantKey(undefined), undefined);
  assert.equal(merchantKey(""), undefined);
  assert.equal(merchantKey("The Ltd"), undefined);
});
