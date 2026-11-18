import { test } from "node:test";
import assert from "node:assert/strict";
import { pageHead, headTags, applyHead } from "@/lib/pageHead";
import { projects } from "@/data/projects";
import { site } from "@/config/site";

test("pageHead: a project is its own title, purpose and address", () => {
  const p = projects[0];
  const h = pageHead(p.slug);
  assert.equal(h.title, `${p.title} | ${site.name}`);
  assert.equal(h.description, p.purpose);
  assert.equal(h.url, `${site.url}/projects/${p.slug}/`);
  assert.equal(h.type, "article");
});

test("pageHead: no slug, or an unknown one, is the home page", () => {
  for (const s of [null, undefined, "", "nope"]) {
    const h = pageHead(s);
    assert.equal(h.title, site.title);
    assert.equal(h.description, site.description);
    assert.equal(h.url, `${site.url}/`);
    assert.equal(h.type, "website");
  }
});

test("headTags: canonical, description, og and twitter all follow the route", () => {
  const h = pageHead(projects[1].slug);
  const tags = Object.fromEntries(headTags(h).map(([sel, , v]) => [sel, v]));
  assert.equal(tags['link[rel="canonical"]'], h.url);
  assert.equal(tags['meta[property="og:url"]'], h.url);
  assert.equal(tags['meta[property="og:title"]'], h.title);
  assert.equal(tags['meta[name="twitter:title"]'], h.title);
  assert.equal(tags['meta[name="description"]'], h.description);
  assert.equal(tags['meta[property="og:description"]'], h.description);
  assert.equal(tags['meta[name="twitter:description"]'], h.description);
});

test("applyHead: sets the title and skips a tag the page doesn't have", () => {
  const set = [];
  const doc = {
    title: "",
    querySelector: (sel) =>
      sel.includes("canonical") ? { setAttribute: (a, v) => set.push([a, v]) } : null,
  };
  const h = pageHead(projects[0].slug);
  applyHead(doc, h);
  assert.equal(doc.title, h.title);
  assert.deepEqual(set, [["href", h.url]]);
});
