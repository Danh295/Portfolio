import { test } from "node:test";
import assert from "node:assert/strict";
import { parseHash, parsePath } from "@/lib/urls";
import { stepSelection, heroStops, EXP_LAST, selectionLabel } from "@/lib/selection";
import { projects } from "@/data/projects";
import { experienceEntries } from "@/data/experience";

test("parseHash / parsePath", () => {
  assert.deepEqual(parseHash(""), { sec: 0 });
  assert.deepEqual(parseHash("#experience"), { sec: 2 });
  assert.deepEqual(parseHash("#nope"), { sec: 0 });
  assert.deepEqual(parseHash("#projects/recall"), { slug: "recall" });
  assert.deepEqual(parseHash("#recall"), { slug: "recall" }, "older links");
  assert.deepEqual(parseHash("#projects/nope"), { sec: 1 });
  assert.deepEqual(parsePath("/Portfolio/projects/recall/", ""), { slug: "recall" });
  assert.deepEqual(parsePath("/projects/recall", ""), { slug: "recall" });
  assert.deepEqual(parsePath("/Portfolio/projects/nope/", ""), { sec: 0 });
  assert.deepEqual(parsePath("/Portfolio/", "#skills"), { sec: 3 });
});

const base = {
  activeSec: 0,
  heroSel: "head",
  sel: -1,
  expSel: -1,
  rulesSeen: false,
  listLength: projects.length,
};
const walk = (dir, from, n) => {
  let s = { ...base, ...from };
  const seen = [];
  for (let i = 0; i < n; i++) {
    const r = stepSelection(dir, s);
    if (!r) break;
    if (r.goSec) {
      const [sec, stop] = r.goSec;
      s = {
        ...s,
        activeSec: sec,
        heroSel: sec === 0 && stop ? stop : "head",
        sel: sec === 1 ? (stop ?? -1) : s.sel,
        expSel: sec === 2 ? (stop ?? -1) : s.expSel,
      };
    } else s = { ...s, ...r };
    seen.push(
      s.activeSec +
        ":" +
        (s.activeSec === 0
          ? s.heroSel
          : s.activeSec === 1
            ? s.sel
            : s.activeSec === 2
              ? s.expSel
              : "-"),
    );
  }
  return seen;
};

test("j walks every stop top to bottom, then stops", () => {
  const seen = walk(1, {}, 100);
  assert.deepEqual(seen.slice(0, 3), ["0:more", "0:egg", "1:-1"]);
  assert.ok(seen.includes("1:" + (projects.length - 1)));
  assert.ok(seen.includes("2:" + EXP_LAST), "every role is a stop, none folded away");
  assert.equal(seen.at(-1), "3:-");
  assert.equal(stepSelection(1, { ...base, activeSec: 3 }), null);
});

test("k from the bottom retraces j exactly", () => {
  const down = ["0:head", ...walk(1, {}, 100)];
  const up = walk(-1, { activeSec: 3 }, 100);
  assert.deepEqual(["3:-", ...up], [...down].reverse());
});

test("rules chip joins the hero stops once seen", () => {
  assert.deepEqual(heroStops(true), ["head", "more", "rules", "egg"]);
  assert.deepEqual(stepSelection(1, { ...base, heroSel: "more", rulesSeen: true }), {
    heroSel: "rules",
  });
  assert.deepEqual(stepSelection(-1, { ...base, activeSec: 3 }), { goSec: [2, EXP_LAST] });
});

test("the selection is read out by name; headers read nothing", () => {
  const at = (s) => selectionLabel({ mode: "gui", view: null, list: projects, ...base, ...s });
  assert.equal(at({}), "", "the hero's heading");
  assert.equal(at({ heroSel: "more" }), "more about me");
  assert.equal(at({ heroSel: "rules" }), "how to play");
  assert.equal(at({ heroSel: "egg" }), "egg minigame");
  assert.equal(at({ activeSec: 1 }), "", "the work header");
  assert.equal(
    at({ activeSec: 1, sel: 0 }),
    projects[0].title + ", project 1 of " + projects.length,
  );
  assert.equal(at({ activeSec: 1, sel: projects.length }), "", "a row past the list");
  assert.equal(at({ activeSec: 2 }), "", "the experience header");
  const e = experienceEntries[EXP_LAST];
  assert.equal(at({ activeSec: 2, expSel: EXP_LAST }), e.title + " at " + e.company);
  assert.equal(at({ activeSec: 3 }), "");
  assert.equal(at({ mode: "term", heroSel: "egg" }), "", "terminal mode");
  assert.equal(at({ view: projects[0].slug, activeSec: 1, sel: 0 }), "", "a project page");
});

test("a project reads as n of the filtered list", () => {
  const list = projects.filter((p) => p.category === "hackathon");
  assert.ok(list.length > 1 && list.length < projects.length);
  assert.equal(
    selectionLabel({ mode: "gui", view: null, ...base, activeSec: 1, sel: 1, list }),
    list[1].title + ", project 2 of " + list.length,
  );
});
