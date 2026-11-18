import { test } from "node:test";
import assert from "node:assert/strict";
import { routeProblems, copyProblems, duplicateProblems } from "../scripts/head-rules.mjs";

const origin = "https://example.test/Portfolio/";
const slugs = ["alpha", "beta"];
const good = {
  sitemap: [origin, origin + "resume/", origin + "projects/alpha/", origin + "projects/beta/"],
  slugs,
  exported: ["alpha", "beta"],
  origin,
};

test("routes: the exact set passes", () => {
  assert.deepEqual(routeProblems(good), []);
});

test("routes: a project missing from the sitemap or the export is named", () => {
  const noMap = { ...good, sitemap: good.sitemap.slice(0, 3) };
  assert.deepEqual(routeProblems(noMap), [`the sitemap is missing ${origin}projects/beta/`]);
  const noFile = { ...good, exported: ["alpha"] };
  assert.deepEqual(routeProblems(noFile), ["no exported page for the project beta"]);
});

test("routes: extras, duplicates and unlisted pages fail", () => {
  assert.equal(routeProblems({ ...good, sitemap: [...good.sitemap, origin + "x/"] }).length, 1);
  assert.equal(routeProblems({ ...good, sitemap: [...good.sitemap, origin] }).length, 1);
  assert.equal(routeProblems({ ...good, exported: ["alpha", "beta", "gamma"] }).length, 1);
});

const metaOf = (o) => (key) => o[key];
const page = {
  title: "alpha | site",
  meta: metaOf({
    description: "what alpha is",
    "og:title": "alpha | site",
    "twitter:title": "alpha | site",
    "og:description": "what alpha is",
    "twitter:description": "what alpha is",
  }),
};

test("copy: matching title and description pass", () => {
  assert.deepEqual(copyProblems(page), []);
});

test("copy: a missing description is reported once per tag that should carry it", () => {
  const p = {
    ...page,
    meta: metaOf({ "og:title": "alpha | site", "twitter:title": "alpha | site" }),
  };
  const out = copyProblems(p);
  assert.ok(out.includes("no description meta"));
  assert.ok(out.includes("no og:description"));
  assert.ok(out.includes("no twitter:description"));
});

test("copy: a social title that is not the page title fails", () => {
  const m = { description: "d", "og:description": "d", "twitter:description": "d" };
  const p = { title: "t", meta: metaOf({ ...m, "og:title": "home", "twitter:title": "t" }) };
  assert.deepEqual(copyProblems(p), ['og:title is not the title: "home"']);
});

test("duplicates: two pages with one description are named", () => {
  const pages = { a: { title: "a", description: "d" }, b: { title: "b", description: "d" } };
  assert.deepEqual(duplicateProblems(pages), ["a and b share one description"]);
});
