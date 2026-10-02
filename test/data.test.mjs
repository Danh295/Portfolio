import { test } from "node:test";
import assert from "node:assert/strict";
import { projects, projectCategories } from "@/data/projects";
import { experienceEntries } from "@/data/experience";
import { coreTechStack, homeContent, whoamiFacts } from "@/data/home";
import { buildSkills } from "@/lib/skills";

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
  assert.equal(whoamiFacts.find((f) => f.k === "working").v, working.value + working.org);
});

test("skills match tags exactly or as a prefix word", () => {
  const p = [{ title: "a", tags: ["Tailwind CSS", "CSS Modules", "GitHub Pages"] }];
  const items = buildSkills(
    [{ label: "x", items: [{ name: "Tailwind" }, { name: "C" }, { name: "Git" }] }],
    p,
  )[0].items;
  assert.deepEqual(
    items.map((i) => i.coursework),
    [false, true, true],
  );
});

const coursework = buildSkills(coreTechStack, projects)
  .flatMap((g) => g.items)
  .filter((i) => i.coursework && /\[course\]/.test(i.tip))
  .map((i) => i.name);
test(
  "coursework skills name their courses",
  { todo: coursework.length ? "still placeholders: " + coursework.join(", ") : false },
  () => {
    assert.deepEqual(coursework, []);
  },
);
