import { test } from "node:test";
import assert from "node:assert/strict";
import { coverFamily } from "../src/features/courses/coverFamily.ts";

test("category wins over title", () => {
  assert.equal(coverFamily({ title: "Excel for M&E officers", category: "Monitoring and Evaluation" }), "me");
  assert.equal(coverFamily({ title: "Data for maps", category: "GIS" }), "geo");
});

test("title decides when the category is generic or missing", () => {
  assert.equal(coverFamily({ title: "AI for professionals", category: null }), "ai");
  assert.equal(coverFamily({ title: "Writing research proposals" }), "research");
  assert.equal(coverFamily({ title: "Initiation à la culture des données", category: "" }), "data");
  assert.equal(coverFamily({ title: "Suivi et évaluation des projets" }), "me");
});

test("words are matched whole, so 'ai' inside a word does not count", () => {
  assert.equal(coverFamily({ title: "Maintaining training records" }), "data");
  assert.equal(coverFamily({ title: "SQL for Data Analysts", category: "Data & Analytics" }), "data");
});

test("unknown subjects fall back to the data cover", () => {
  assert.equal(coverFamily({ title: "Leadership basics" }), "data");
});
