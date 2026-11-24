import { test } from "node:test";
import assert from "node:assert/strict";
import { subjectSummary, priceRange } from "../src/features/site/home/catalogueSummary.ts";

const course = (title, price, extra = {}) => ({ title, category: null, price, earlyBird: null, isFree: price === 0, currency: "RWF", ...extra });

test("counts courses per subject and leaves empty subjects out", () => {
  const summary = subjectSummary([course("Excel for analysts", 50000), course("SQL for analysts", 80000), course("M&E basics", 0), course("Mapping with QGIS", 60000)]);
  assert.deepEqual(summary.map((s) => [s.family, s.count]), [["data", 2], ["me", 1], ["geo", 1]]);
  assert.equal(summary.find((s) => s.family === "data").from, 50000);
});

test("the starting price uses an early-bird price while it runs, and ignores free courses", () => {
  const [data] = subjectSummary([course("Excel for analysts", 50000, { earlyBird: 40000 }), course("Intro to data", 0)]);
  assert.equal(data.from, 40000);
  assert.equal(data.anyFree, true);
  const [me] = subjectSummary([course("M&E basics", 0)]);
  assert.equal(me.from, null);
});

test("price range covers paid courses only, in the most common currency", () => {
  assert.equal(priceRange([course("Intro", 0)]), null);
  assert.deepEqual(priceRange([course("A data", 50000), course("B data", 80000, { earlyBird: 65000 }), course("C data", 30, { currency: "USD" })]), { min: 50000, max: 65000, currency: "RWF" });
});
