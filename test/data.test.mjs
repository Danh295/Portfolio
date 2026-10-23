import { test } from "node:test";
import assert from "node:assert/strict";
import { projects, projectCategories } from "@/data/projects";
import { experienceEntries } from "@/data/experience";
import { coreTechStack, courses, homeContent, whoamiFacts } from "@/data/home";
import { buildItems, buildSkills } from "@/lib/skills";

test("projects: unique slugs, known category, required fields, https links", () => {
  const slugs = projects.map((p) => p.slug);
  assert.equal(new Set(slugs).size, slugs.length);
  for (const p of projects) {
    assert.match(p.slug, /^[a-z0-9-]+$/, p.slug);
    assert.ok(projectCategories.includes(p.category), p.slug);
    for (const f of ["title", "org", "context", "timeline", "year", "purpose"])
      assert.ok(p[f], p.slug + " needs " + f);
    assert.ok(p.bullets.length && p.tags.length, p.slug);
    for (const l of p.links) assert.match(l.href, /^https:\/\//, p.slug + " " + l.label);
  }
});

test("experience: required fields, unique companies (they become file names)", () => {
  const names = experienceEntries.map((e) => e.company.toLowerCase());
  assert.equal(new Set(names).size, names.length);
  for (const e of experienceEntries)
    for (const f of ["title", "company", "loc", "date", "summary"])
      assert.ok(e[f], e.company + " needs " + f);
  assert.ok(experienceEntries.filter((e) => e.now).length <= 1, "at most one current role");
});

test("whoami facts come from the hero's facts", () => {
  const working = homeContent.facts.find((f) => f.key === "working");
  const row = whoamiFacts.find((f) => f.k === "working");
  if (working) assert.equal(row.v, working.value + working.org);
  else assert.equal(row, undefined, "no working row once the role has ended");
});

// The hero's "working … @ <org>" is tied to an experience entry by company name (it shows
// only while that role is current), so a typo would hide it silently.
test("the working fact names an experience entry's company", async () => {
  const src = await import("node:fs").then((fs) =>
    fs.readFileSync(new URL("../src/data/home.js", import.meta.url), "utf8"),
  );
  const org = src.match(/key: "working",[^}]*org: "([^"]+)"/)?.[1];
  assert.ok(org, "home.js has a working fact");
  assert.ok(
    experienceEntries.some((e) => e.company === org),
    org + " is no experience entry's company",
  );
  const working = homeContent.facts.find((f) => f.key === "working");
  const current = experienceEntries.some((e) => e.now && e.company === org);
  assert.equal(!!working, current, "shown exactly while the role is current");
});

// Every skill row must be used by something, or its bar would be empty.
const allSources = { projects, jobs: experienceEntries, courses };
test("every skill is used by a project, a job or a course", () => {
  const unused = buildSkills(coreTechStack, allSources)
    .flatMap((g) => g.items)
    .filter((i) => i.used === 0)
    .map((i) => i.name);
  assert.deepEqual(unused, []);
});

test("a job's project link names a real project", () => {
  const slugs = new Set(projects.map((p) => p.slug));
  for (const e of experienceEntries)
    if (e.project) assert.ok(slugs.has(e.project), e.company + " links " + e.project);
});

test("Git is used by every item", () => {
  const total = buildItems(allSources).length;
  const git = buildSkills(coreTechStack, allSources)
    .flatMap((g) => g.items)
    .find((i) => i.name === "Git");
  assert.equal(git.used, total);
});
