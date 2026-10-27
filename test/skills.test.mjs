import { test } from "node:test";
import assert from "node:assert/strict";
import { buildItems, buildSkills } from "@/lib/skills";

const project = (slug, tags) => ({ slug, title: slug.replace("-", " "), tags });
const job = (company, tags, extra = {}) => ({ company, tags, ...extra });
const course = (code, tags) => ({ code, tags });

const one = (stack, sources) => buildSkills([{ label: "x", items: stack }], sources)[0].items;

test("a project, a job and a course each fill their own glyph", () => {
  const [py] = one([{ name: "Python" }], {
    projects: [project("a", ["Python"]), project("b", ["Go"])],
    jobs: [job("acme", ["Python"])],
    courses: [course("CS 1", ["Python"])],
  });
  assert.deepEqual(py.counts, { project: 1, job: 1, course: 1 });
  assert.equal(py.count, "1·1·1");
  assert.equal(py.bar.length, 16);
  // 3 of the 4 items use it: round(3 / 4 × 16) cells filled.
  assert.equal(py.bar.replace(/░/g, "").length, 12);
  for (const g of ["█", "▓", "▒"]) assert.ok(py.bar.includes(g), g);
});

test("a skill nothing uses has an empty bar", () => {
  const [x] = one([{ name: "Cobol" }], { projects: [project("a", ["Go"])] });
  assert.equal(x.used, 0);
  assert.equal(x.bar, "░".repeat(16));
  assert.equal(x.count, "0·0·0");
});

test("a job linked to a project is one item, with both tag sets", () => {
  const sources = {
    projects: [project("scan", ["OpenCV"]), project("other", ["Go"])],
    jobs: [job("city", ["PyTorch"], { project: "scan" })],
  };
  assert.equal(buildItems(sources).length, 2, "the pair counts once");
  const [cv, torch] = one([{ name: "OpenCV" }, { name: "PyTorch" }], sources);
  assert.deepEqual(cv.counts, { project: 0, job: 1, course: 0 });
  assert.deepEqual(torch.counts, { project: 0, job: 1, course: 0 });
  assert.equal(cv.tip, "used in: city / scan");
});

test("a skill both sides of a linked pair name counts the pair once", () => {
  const [py] = one([{ name: "Python" }], {
    projects: [project("scan", ["Python"])],
    jobs: [job("city", ["Python"], { project: "scan" })],
  });
  assert.equal(py.used, 1);
});

test("a job without tags is not an item", () => {
  const items = buildItems({
    projects: [project("a", ["Go"])],
    jobs: [job("club", []), job("firm", undefined), job("acme", ["Go"])],
  });
  assert.equal(items.length, 2);
});

test("all fills the bar: every item, split across the three sources", () => {
  const sources = {
    projects: Array.from({ length: 9 }, (_, i) => project("p" + i, ["Go"])),
    jobs: [job("a", ["Go"]), job("b", ["Go"]), job("c", ["Go"])],
    courses: [course("X", ["Go"]), course("Y", ["Go"]), course("Z", ["Go"])],
  };
  const [git] = one([{ name: "Git", all: true }], sources);
  assert.equal(git.used, 15);
  assert.equal(git.bar.replace(/░/g, "").length, 16, "15 items over 16 cells fill it");
  assert.deepEqual(git.counts, { project: 9, job: 3, course: 3 });
});

test("the glyph cells add up to the filled cells, and no used source gets none", () => {
  const projects = Array.from({ length: 10 }, (_, i) => project("p" + i, i < 3 ? ["Go"] : ["x"]));
  const jobs = [job("a", ["Go"]), job("b", ["x"]), job("c", ["x"])];
  const courses = [course("X", ["Go"]), course("Y", ["x"]), course("Z", ["x"])];
  const [go] = one([{ name: "Go" }], { projects, jobs, courses });
  const cells = (g) => [...go.bar].filter((c) => c === g).length;
  assert.equal(go.used, 5);
  assert.equal(cells("░"), 16 - Math.round((5 / 16) * 16));
  assert.ok(cells("█") >= 1 && cells("▓") >= 1 && cells("▒") >= 1);
  assert.equal(cells("█") + cells("▓") + cells("▒") + cells("░"), 16);
});

test("a skill used once still gets a cell", () => {
  // 1 of 40 is round(0.4) = 0 cells by the share alone.
  const projects = Array.from({ length: 40 }, (_, i) => project("p" + i, i ? ["x"] : ["Go"]));
  const [go] = one([{ name: "Go" }], { projects });
  assert.equal(go.bar.replace(/░/g, "").length, 1);
});

test("matching is exact or a prefix word, ignoring case", () => {
  const [tw, c] = one([{ name: "Tailwind" }, { name: "C" }], {
    projects: [project("a", ["tailwind css", "C++", "CSS Modules"])],
  });
  assert.equal(tw.used, 1);
  assert.equal(c.used, 0, "C++ is not C");
});

test("via names the variant a skill was used through", () => {
  const [sql] = one([{ name: "SQL", via: ["Oracle Database"] }], {
    projects: [project("a", ["Go"])],
    jobs: [job("ieso", ["SQL", "Oracle Database"]), job("other", ["Oracle Database"])],
  });
  assert.equal(sql.used, 2, "a via tag counts on its own");
  assert.equal(sql.tip, "used in: ieso (Oracle Database), other (Oracle Database)");
});

test("the tip lists projects, then jobs, then courses", () => {
  const [x] = one([{ name: "Linux" }], {
    projects: [project("a b", ["Linux"])],
    jobs: [job("acme", ["Linux"])],
    courses: [course("CS 136", ["Linux"])],
  });
  assert.equal(x.tip, "used in: a b, acme, CS 136");
});

test("uses groups a skill's items for its panel: projects (a merged job among them), jobs, courses", () => {
  const [x] = one([{ name: "Python", via: ["Oracle Database"] }], {
    projects: [project("scan", ["Python"]), project("solo", ["Python"]), project("no", ["Go"])],
    jobs: [job("city", ["Python"], { project: "scan" }), job("ieso", ["Oracle Database"])],
    courses: [course("CS 136", ["Python"])],
  });
  assert.deepEqual(x.uses, {
    projects: [
      { name: "solo", slug: "solo", via: [] },
      { name: "scan", slug: "scan", org: "city", via: [] },
    ],
    jobs: [{ name: "ieso", via: ["Oracle Database"] }],
    courses: [{ name: "CS 136", via: [] }],
  });
});

test("a skill used only in a course has no projects to jump to", () => {
  const [x] = one([{ name: "Racket" }], {
    projects: [project("a", ["Go"])],
    courses: [course("CS 135", ["Racket"])],
  });
  assert.deepEqual(x.uses.projects, []);
  assert.equal(x.uses.courses.length, 1);
});
