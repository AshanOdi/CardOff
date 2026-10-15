import { test } from "node:test";
import assert from "node:assert/strict";
import { parseBankList } from "./pipeline";

test("parseBankList", () => {
  assert.deepEqual(parseBankList(undefined), ["hnb", "commercial_bank"]);
  assert.deepEqual(parseBankList(" "), ["hnb", "commercial_bank"]);
  assert.deepEqual(parseBankList("hnb"), ["hnb"]);
  assert.deepEqual(parseBankList("commercial_bank, nope"), ["commercial_bank"]);
});
