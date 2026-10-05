import { test } from "node:test";
import assert from "node:assert/strict";
import { leavePlan, openPlan, popPlan } from "@/lib/projectHistory";

// A history entry Next's router owns (it marks them with __NA).
const NEXT = { __NA: true };

// A project opened from the list, then the browser's Back: the home entry it was opened
// from comes back, and with it the list position.
test("Back from a project lands on the list position it was opened from", () => {
  const open = openPlan({ slug: "recall", view: null, scrollY: 1234, state: NEXT, loadId: "L" });
  assert.equal(open.mode, "push");
  assert.equal(open.url, "/projects/recall/");
  const back = popPlan({ pathname: "/", hash: "", state: open.homeState });
  assert.deepEqual(back, { view: null, land: { scrollTo: 1234 } });
});

// Esc on a project the app opened goes back to the entry it came from (the list, at its
// saved position), even after stepping with ←/→, so no dead /#projects entry is left.
test("Esc after stepping between projects goes back to the list entry", () => {
  const a = openPlan({ slug: "recall", view: null, scrollY: 900, state: NEXT, loadId: "L" });
  const b = openPlan({
    slug: "portfolio",
    view: "recall",
    scrollY: 0,
    state: a.state,
    loadId: "L",
  });
  assert.equal(b.mode, "replace", "stepping replaces the project entry");
  assert.equal(b.url, "/projects/portfolio/");
  assert.deepEqual(leavePlan({ n: 1, how: "back", state: b.state, loadId: "L" }), { mode: "back" });
});

// history.state survives a reload, so a project entry from an earlier page load must not
// be trusted: back() would leave this document. It replaces instead.
test("Esc after a reload, or on a deep-linked project, replaces with the projects section", () => {
  const replace = { mode: "replace", url: "/#projects", land: { sec: 1 } };
  assert.deepEqual(
    leavePlan({ n: 1, how: "back", state: { fromApp: "OLD" }, loadId: "L" }),
    replace,
  );
  assert.deepEqual(leavePlan({ n: 1, how: "back", state: {}, loadId: "L" }), replace);
  assert.deepEqual(leavePlan({ n: 1, how: "back", state: null, loadId: "L" }), replace);
});

// h, 1–3, a nav click or the shell leave a project for a section: the entry is replaced,
// so one Back skips the project and lands on the list entry it was opened from.
test("jumping to a section from a project replaces its entry; Back then skips it", () => {
  const a = openPlan({ slug: "recall", view: null, scrollY: 700, state: NEXT, loadId: "L" });
  assert.deepEqual(leavePlan({ n: 0, how: "jump", state: a.state, loadId: "L" }), {
    mode: "replace",
    url: "/#home",
    land: { sec: 0 },
  });
  assert.deepEqual(popPlan({ pathname: "/", hash: "", state: a.homeState }), {
    view: null,
    land: { scrollTo: 700 },
  });
});

test("Back/Forward onto a project page opens it", () => {
  assert.deepEqual(popPlan({ pathname: "/projects/recall/", hash: "", state: {} }), {
    view: "recall",
  });
});

// The old-style link /#projects/<slug> (or /#<slug>) opens the project and shows its
// real URL, on Back/Forward as on first load.
test("an old /#projects/<slug> entry opens the project and is rewritten to its path", () => {
  const want = { view: "recall", rewrite: "/projects/recall/" };
  assert.deepEqual(popPlan({ pathname: "/", hash: "#projects/recall", state: null }), want);
  assert.deepEqual(popPlan({ pathname: "/", hash: "#recall", state: {} }), want);
});

// A hash-only entry with no saved position (a deep link, an edited address bar) lands
// on its section, whether or not a project was open.
test("a section entry without a saved position lands on its section", () => {
  assert.deepEqual(popPlan({ pathname: "/", hash: "#experience", state: null }), {
    view: null,
    land: { sec: 2 },
  });
  assert.deepEqual(popPlan({ pathname: "/", hash: "", state: {} }), {
    view: null,
    land: { sec: 0 },
  });
});

// 1 (or the projects nav link) from a project opened off the list still puts the list
// back where it was, as before; other sections align under the nav.
test("jumping to projects from a project restores the remembered list position", () => {
  const leave = (n) => leavePlan({ n, how: "jump", state: {}, loadId: "L", listY: 640 });
  assert.deepEqual(leave(1).land, { scrollTo: 640 });
  assert.deepEqual(leave(2).land, { sec: 2 });
  assert.deepEqual(leavePlan({ n: 1, how: "jump", state: {}, loadId: "L" }).land, { sec: 1 });
});

// A home entry Next doesn't own (a #hash typed into the address bar has no state) is
// left alone: giving it a state without Next's __NA makes Next reload the page on Back.
test("the list position is only saved on a home entry Next owns", () => {
  const opened = (state) =>
    openPlan({ slug: "recall", view: null, scrollY: 300, state, loadId: "L" });
  assert.equal(opened(null).homeState, undefined);
  assert.equal(opened({}).homeState, undefined);
  assert.deepEqual(opened({ __NA: true }).homeState, { __NA: true, listY: 300 });
});

// Esc's own back() onto such an entry still restores the list from the position the hook
// remembered when the project was opened (`listY`); any other Back lands on the section.
test("Esc back onto an entry with no saved position uses the remembered one", () => {
  const pop = (listY) => popPlan({ pathname: "/", hash: "#projects", state: null, listY });
  assert.deepEqual(pop(450), { view: null, land: { scrollTo: 450 } });
  assert.deepEqual(pop(null), { view: null, land: { sec: 1 } });
});
