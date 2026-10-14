import { test } from "node:test";
import assert from "node:assert/strict";
import { parseDiscount } from "./parseDiscount";

// Cases taken from real HNB promotion titles.
test("percentage with 'up to'", () => {
  assert.deepEqual(parseDiscount("Up to 50% off on Room only basis at Fox Kandy"), {
    offerType: "percentage",
    discountPercentage: 50,
    discountLabel: "Up to 50% off",
  });
});

test("flat percentage", () => {
  assert.deepEqual(parseDiscount("15% off on dine-in at The Blue Water Wadduwa"), {
    offerType: "percentage",
    discountPercentage: 15,
    discountLabel: "15% off",
  });
});

test("discount + installment combo counts as percentage", () => {
  const r = parseDiscount("Up to 35% off on selected items + Up to 06 months 0% installments at Multilac");
  assert.equal(r.offerType, "percentage");
  assert.equal(r.discountPercentage, 35);
});

test("installment only", () => {
  assert.deepEqual(parseDiscount("Up to 06 months 0% installments at Phone Lab"), {
    offerType: "installment",
    discountLabel: "Up to 6 months 0% installments",
  });
});

test("installment picks the longest plan", () => {
  const r = parseDiscount("0% + 3, 6, 12 & 24 months installment plans");
  assert.equal(r.discountLabel, "Up to 24 months 0% installments");
});

test("cashback", () => {
  assert.deepEqual(parseDiscount("Up to 10% cashback on groceries"), {
    offerType: "cashback",
    discountPercentage: 10,
    discountLabel: "Up to 10% cashback",
  });
});

test("unrecognised falls back to other", () => {
  const r = parseDiscount("Complimentary dessert with every main course");
  assert.equal(r.offerType, "other");
  assert.equal(r.discountPercentage, undefined);
});

test("easy payment plans count as installment", () => {
  const r = parseDiscount("Enjoy Special Credit Card Easy Payment Plans for the Student and Members of AICPA");
  assert.equal(r.offerType, "installment");
  assert.equal(r.discountLabel, "0% installments");
});
