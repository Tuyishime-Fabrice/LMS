import { test } from "node:test";
import assert from "node:assert/strict";
import { applyFilters, parseFilters, languageCode } from "../src/features/courses/catalogueFilters.ts";

const course = (id, title, extra = {}) => ({ id, title, summary: null, category: null, level: "beginner", language: "en", isFree: false, teacherName: null, ...extra });
const courses = [
  course("a", "Data Analysis with Excel", { category: "Data & Analytics", teacherName: "Théo Mugisha" }),
  course("b", "Initiation à la culture des données", { language: "Français", isFree: true }),
  course("c", "SQL for Data Analysts", { level: "intermediate" }),
  course("d", "Suivi et évaluation", { language: "fr" }),
];
const run = (query, live = []) => applyFilters(courses, parseFilters(new URLSearchParams(query)), new Set(live)).map((c) => c.id);

test("unknown filter values are ignored", () => {
  assert.deepEqual(parseFilters(new URLSearchParams("level=expert&price=cheap&subject=x")), { q: "", subject: null, level: null, format: null, lang: null, price: null });
});

test("filters combine", () => {
  assert.deepEqual(run("lang=fr"), ["b", "d"]);
  assert.deepEqual(run("lang=fr&price=free"), ["b"]);
  assert.deepEqual(run("level=intermediate"), ["c"]);
  assert.deepEqual(run("subject=me"), ["d"]);
  assert.deepEqual(run("format=live", ["c"]), ["c"]);
});

test("search matches title, category and instructor, ignoring accents and case", () => {
  assert.deepEqual(run("q=donnees"), ["b"]);
  assert.deepEqual(run("q=theo"), ["a"]);
  assert.deepEqual(run("q=sql analysts"), ["c"]);
});

test("languages are read from codes or names", () => {
  assert.equal(languageCode("Français"), "fr");
  assert.equal(languageCode("English"), "en");
  assert.equal(languageCode(null), null);
});
