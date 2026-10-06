import { test } from "node:test";
import assert from "node:assert/strict";
import { routeKey } from "@/lib/keyRouter";

// The facts App reads for one keydown. BASE is the gui at rest: home page, the hero's
// header selected, nothing open, shortcuts on, focus on the page.
const BASE = {
  key: "x",
  repeat: false,
  shift: false,
  meta: false,
  ctrl: false,
  alt: false,
  typing: false,
  onButton: false,
  onControl: false,
  tabFocused: false,
  selectionCollapsed: true,
  mode: "gui",
  vim: false,
  help: false,
  aboutOpen: false,
  termOpen: false,
  keysOn: true,
  view: null,
  viewIdx: -1,
  projectCount: 10,
  activeSec: 0,
  heroSel: "head",
  sel: -1,
  expSel: -1,
  expOpen: -1,
  expEarlier: false,
  rulesOpen: false,
  rulesSeen: false,
  briefing: false,
  eggOnScreen: true,
  listLength: 10,
  filterIdx: 0,
  folderCount: 4,
};
// A focused link/button (onButton) is always a focused control (onControl) too.
const route = (over) =>
  routeKey({ ...BASE, ...over, onControl: !!(over.onControl || over.onButton) });
const term = (over) => route({ mode: "term", ...over });

test("terminal mode: vim takes every key but Enter/Space on a focused button", () => {
  assert.deepEqual(term({ vim: true, key: "j" }), { do: "vim" });
  assert.deepEqual(term({ vim: true, key: "Escape", ctrl: true }), { do: "vim" });
  assert.equal(term({ vim: true, key: "Enter", onButton: true }), null);
  assert.equal(term({ vim: true, key: " ", onButton: true }), null);
});

test("terminal mode: Enter and Ctrl-C run in the shell; typing anywhere goes to the prompt", () => {
  assert.deepEqual(term({ key: "Enter" }), { do: "termShell" });
  assert.equal(term({ key: "Enter", onButton: true }), null, "a focused [exit] keeps its Enter");
  assert.deepEqual(term({ key: "c", ctrl: true }), { do: "termShell" });
  assert.equal(term({ key: "c", ctrl: true, selectionCollapsed: false }), null, "copying");
  assert.deepEqual(term({ key: "a" }), { do: "focusTerm" });
  assert.deepEqual(term({ key: "t" }), { do: "focusTerm" }, "no gui shortcuts here");
  assert.equal(term({ key: " ", onButton: true }), null);
  assert.equal(term({ key: "a", meta: true }), null);
  assert.equal(term({ key: "ArrowUp" }), null);
  assert.equal(term({ key: "a", typing: true }), null, "the input has it");
  assert.equal(term({ key: "Enter", typing: true }), null);
});

test("a held toggle/open/activate key acts once; moving keys repeat", () => {
  for (const key of ["t", "?", "m", "s", "`", "Enter", "Escape", "Backspace", "g"])
    assert.deepEqual(route({ key, repeat: true }), { prevent: true }, key);
  assert.equal(route({ key: "j", repeat: true }).do, "selectHero");
  assert.equal(route({ key: "t", repeat: true, typing: true }), null, "typing repeats");
});

// A popup owns the keyboard: only Esc, ? / m (which swap) and s act; scroll keys scroll
// the popup's list; Enter/Space on a focused button inside it are left to the button.
test("a popup open: scroll keys scroll it, other keys do nothing", () => {
  const pop = (over) => route({ help: true, ...over });
  assert.deepEqual(pop({ key: "ArrowDown" }), { prevent: true, do: "scrollPopup", dir: 1 });
  assert.deepEqual(pop({ key: "PageUp" }), { prevent: true, do: "scrollPopup", dir: -2 });
  assert.deepEqual(pop({ key: " " }), { prevent: true, do: "scrollPopup", dir: 2 });
  assert.deepEqual(pop({ key: " ", shift: true }), { prevent: true, do: "scrollPopup", dir: -2 });
  assert.deepEqual(pop({ key: "End" }), { prevent: true, do: "scrollPopup", dir: 3 });
  assert.deepEqual(pop({ key: "ArrowLeft" }), { prevent: true }, "←/→ only stop the page");
  assert.equal(pop({ key: " ", onButton: true }), null, "Space presses a focused button");
  assert.equal(pop({ key: "Enter" }), null);
  assert.equal(pop({ key: "t" }), null, "no shortcuts behind a popup");
  assert.equal(route({ aboutOpen: true, key: "j" }), null);
  // (pinned) today modifiers don't get past the popup: Alt+← is swallowed.
  assert.deepEqual(pop({ key: "ArrowLeft", alt: true }), { prevent: true });
  // Esc, ? and m reach the shortcut table; s flips shortcuts in the keys popup.
  assert.equal(pop({ key: "Escape" }).do, "closeHelp");
  assert.equal(pop({ key: "m" }).do, "toggleAbout");
  assert.deepEqual(pop({ key: "s" }), { prevent: true, do: "toggleKeys", flashKey: "s" });
  assert.equal(route({ aboutOpen: true, key: "s" }), null, "s only in the keys popup");
});

test("` toggles the embedded shell (shortcuts on only), even from its own input", () => {
  assert.deepEqual(route({ key: "`" }), { prevent: true, do: "toggleShell", flashKey: "`" });
  assert.deepEqual(route({ key: "`", typing: true, termOpen: true }).do, "toggleShell");
  assert.equal(route({ key: "`", keysOn: false }), null);
  // (pinned) today Ctrl+` toggles it too.
  assert.equal(route({ key: "`", ctrl: true }).do, "toggleShell");
});

test("typing in an input: only Esc acts (closes the shell, drops focus)", () => {
  assert.deepEqual(route({ key: "Escape", typing: true }), { do: "closeShell", blur: true });
  assert.equal(route({ key: "t", typing: true }), null);
  assert.equal(route({ key: "Enter", typing: true }), null);
});

test("Cmd/Ctrl/Alt combinations are left to the browser", () => {
  for (const mod of ["meta", "ctrl", "alt"]) {
    assert.equal(route({ key: "t", [mod]: true }), null, mod);
    assert.equal(route({ key: "ArrowLeft", [mod]: true }), null, mod);
  }
});

// The embedded shell is open but its input lost focus: typing goes back to its prompt
// (Enter runs it) instead of firing gui shortcuts; a focused control keeps Enter/Space.
test("embedded shell open but unfocused: keys go back to its prompt", () => {
  const sh = (over) => route({ termOpen: true, ...over });
  assert.deepEqual(sh({ key: "t" }), { do: "focusEmbed", enter: false });
  assert.deepEqual(sh({ key: "Backspace" }), { do: "focusEmbed", enter: false });
  assert.deepEqual(sh({ key: "Enter" }), { do: "focusEmbed", enter: true });
  assert.equal(sh({ key: "Enter", onButton: true }), null);
  assert.equal(sh({ key: "Escape" }).do, "closeShell", "Esc closes it (shortcut table)");
  assert.equal(sh({ key: "ArrowDown" }).do, "goSec", "arrows still move the page");
});

test("rules card up: Esc puts it away, Enter/Space/any character proceeds, Tab+Enter doesn't", () => {
  const card = (over) => route({ briefing: true, ...over });
  assert.deepEqual(card({ key: "Escape" }), { prevent: true, do: "resetEgg" });
  assert.deepEqual(card({ key: "Enter" }), { prevent: true, do: "proceedRules" });
  assert.deepEqual(card({ key: " " }), { prevent: true, do: "proceedRules" });
  assert.deepEqual(card({ key: "q" }), { prevent: true, do: "proceedRules" });
  assert.equal(card({ key: "q", keysOn: false }), null, "shortcuts off: only Enter/Space");
  assert.equal(card({ key: "Enter", onButton: true, tabFocused: true }), null);
  assert.equal(card({ key: "ArrowDown" }).do, "goSec", "arrows keep their jobs");
  assert.equal(card({ key: "Enter", eggOnScreen: false }).do, "selectHero", "off screen: normal");
});

test("j/k and arrows drop focus a click left on a button, then act", () => {
  assert.equal(route({ key: "j", onButton: true }).blur, true);
  assert.equal(route({ key: "ArrowDown", onButton: true }).blur, true);
  assert.equal(route({ key: "t", onButton: true }).blur, undefined);
  assert.equal(route({ key: "j", onButton: true, keysOn: false }), null, "keys off: j is inert");
  assert.equal(route({ key: "ArrowDown", onButton: true, keysOn: false }).blur, true);
  // on a deep-linked page with no project index, ←/→ still drop the stale focus
  assert.deepEqual(route({ key: "ArrowLeft", view: "x", viewIdx: -1, onButton: true }), {
    blur: true,
  });
});

test("egg selected: Enter/Space play it (once), unless a link or button was reached with Tab", () => {
  const egg = (over) => route({ heroSel: "egg", ...over });
  const plays = { prevent: true, flashSelected: "[data-egg]", do: "startEgg" };
  assert.deepEqual(egg({ key: "Enter" }), plays);
  assert.deepEqual(egg({ key: " " }), plays);
  assert.deepEqual(egg({ key: "Enter", onButton: true }), plays, "focus a click left");
  assert.deepEqual(egg({ key: " ", repeat: true }), { prevent: true }, "held: once");
  assert.equal(egg({ key: "Enter", onButton: true, tabFocused: true }), null, "Tab wins");
  assert.deepEqual(egg({ key: "Enter", eggOnScreen: false }), {
    prevent: true,
    flashSelected: "[data-egg]",
  });
});

test("Enter/Space on a focused control are the browser's; Space presses the selection", () => {
  assert.equal(route({ key: "Enter", onControl: true, activeSec: 1, sel: 2 }), null);
  assert.equal(route({ key: " ", onButton: true, activeSec: 1, sel: 2 }), null);
  assert.deepEqual(route({ key: " ", activeSec: 1, sel: 2 }), {
    prevent: true,
    flashSelected: '[data-row="2"]',
    do: "openProject",
    row: 2,
  });
  assert.equal(route({ key: " ", activeSec: 1, sel: -1 }), null, "nothing selected: scroll");
  assert.equal(route({ key: " ", heroSel: "head" }), null);
  assert.deepEqual(route({ key: " ", activeSec: 1, sel: 2, repeat: true }), { prevent: true });
});

test("shortcuts off: every one-character key is left alone; Enter, arrows, Esc still work", () => {
  const off = (over) => route({ keysOn: false, ...over });
  for (const key of ["t", "?", "m", "j", "1", "g"]) assert.equal(off({ key }), null, key);
  assert.equal(off({ key: "Escape" }).do, "clearSelection");
  assert.equal(off({ key: "ArrowDown" }).do, "goSec");
  assert.equal(off({ key: "Enter" }).do, "selectHero");
});

test("on a project page: ←/→ step projects (wrapping), ↑/↓ do nothing, Esc/Backspace go back", () => {
  const proj = (over) => route({ view: "recall", viewIdx: 0, ...over });
  assert.deepEqual(proj({ key: "ArrowRight" }), {
    prevent: true,
    do: "openProjectIdx",
    idx: 1,
    flashKey: "ArrowRight",
  });
  assert.equal(proj({ key: "ArrowLeft" }).idx, 9, "wraps to the last project");
  assert.equal(proj({ key: "ArrowUp" }), null);
  assert.equal(proj({ key: "ArrowDown" }), null);
  assert.equal(proj({ key: "Escape" }).do, "goBack");
  assert.equal(proj({ key: "Backspace" }).do, "goBack");
  assert.equal(route({ key: "Backspace" }).do, undefined, "home: Backspace takes the key only");
  assert.equal(proj({ key: "j" }).do, undefined, "j/k don't move on a project");
  assert.equal(proj({ key: "i" }).do, undefined, "no rules card on a project");
  assert.equal(proj({ key: "Enter" }).do, undefined);
});

test("Esc closes the topmost thing first", () => {
  const esc = (over) => route({ key: "Escape", ...over }).do;
  assert.equal(esc({ help: true, aboutOpen: true, termOpen: true }), "closeHelp");
  assert.equal(esc({ aboutOpen: true, termOpen: true }), "closeAbout");
  assert.equal(esc({ rulesOpen: true, termOpen: true }), "closeRules");
  assert.equal(esc({ rulesOpen: true, view: "recall", viewIdx: 0 }), "goBack");
  assert.equal(esc({ termOpen: true, view: "recall", viewIdx: 0 }), "closeShell");
  assert.equal(esc({ expOpen: 1 }), "collapseExp");
  assert.equal(esc({}), "clearSelection");
});

test("j/k land where the selection model says; Enter on the hero heading goes to the egg", () => {
  assert.deepEqual(route({ key: "j" }), {
    prevent: true,
    do: "selectHero",
    heroSel: "more",
    flashKey: "j",
  });
  assert.deepEqual(route({ key: "j", heroSel: "egg" }), {
    prevent: true,
    do: "goSec",
    n: 1,
    stop: undefined,
    flashKey: "j",
  });
  assert.equal(route({ key: "k", activeSec: 1, sel: -1 }).stop, "egg");
  assert.equal(route({ key: "ArrowRight", activeSec: 1, sel: 3 }).sel, 4);
  assert.deepEqual(route({ key: "k" }), { prevent: true, flashKey: "k" }, "top: nowhere to go");
  assert.equal(route({ key: "Enter" }).heroSel, "egg");
  assert.equal(route({ key: "Enter", heroSel: "more" }).do, "openAbout");
  assert.equal(route({ key: "Enter", heroSel: "rules" }).do, "toggleRules");
});

test("the rest of the table", () => {
  const act = (key, over) => {
    const { prevent, flashKey, ...rest } = route({ key, ...over });
    assert.ok(prevent && flashKey === key, key);
    return rest;
  };
  assert.deepEqual(act("?"), { do: "toggleHelp" });
  assert.deepEqual(act("m"), { do: "toggleAbout" });
  assert.deepEqual(act("i"), { do: "toggleRules" });
  assert.deepEqual(act("t"), { do: "toggleTheme" });
  assert.deepEqual(act("h", { activeSec: 2 }), { do: "goHome" });
  assert.deepEqual(act("2"), { do: "goSec", n: 2 });
  assert.deepEqual(act("ArrowDown", { activeSec: 3 }), { do: "goSec", n: 3 });
  assert.deepEqual(act("ArrowUp", { activeSec: 0 }), { do: "goSec", n: 0 });
  assert.deepEqual(act("f", { filterIdx: 3 }), { do: "setFilter", idx: 0 });
  assert.deepEqual(act("e"), { do: "mail" });
  assert.deepEqual(act("g"), { do: "openLink", link: "github" });
  assert.deepEqual(act("l"), { do: "openLink", link: "linkedin" });
  assert.deepEqual(act("r"), { do: "openLink", link: "resume" });
  assert.equal(route({ key: "q" }), null, "not a shortcut");
  assert.equal(route({ key: "s" }), null, "s outside the keys popup");
  assert.equal(route({ key: "Tab" }), null);
});

// The keys popup (src/config/ui.js) lists what the router routes, and nothing else.
test("every keys-popup row is a routed key, and every one-character shortcut has a row", async () => {
  const { shortcuts } = await import("@/config/ui");
  const { KEYS } = await import("@/lib/keyRouter");
  const listed = new Set(shortcuts.flatMap((r) => r.keys));
  // Space presses the selection before the table; s is the popup's own toggle; Backspace
  // is a quiet alias of Esc on a project page.
  const routed = new Set([...Object.keys(KEYS), " "]);
  for (const k of listed) assert.ok(routed.has(k), JSON.stringify(k) + " is listed but not routed");
  for (const k of Object.keys(KEYS))
    if (k.length === 1 && k !== "s") assert.ok(listed.has(k), k + " is routed but not listed");
  assert.ok(!listed.has("Backspace"));
});

test("pressing a stop flashes its element", async () => {
  const { EXP_TOGGLE } = await import("@/lib/selection");
  const flash = (over) => route({ key: " ", ...over }).flashSelected;
  assert.equal(flash({ heroSel: "more" }), '[data-key="m"]');
  assert.equal(flash({ heroSel: "rules" }), '[data-key="i"]');
  assert.equal(flash({ activeSec: 1, sel: 0 }), '[data-row="0"]');
  assert.equal(flash({ activeSec: 2, expSel: 1 }), '[data-exprow="1"] > button');
  if (EXP_TOGGLE(false) >= 0)
    assert.equal(flash({ activeSec: 2, expSel: EXP_TOGGLE(false) }), "[data-earlier]");
  assert.deepEqual(route({ key: " ", activeSec: 2, expSel: 1, expOpen: 1 }).i, -1, "folds");
});
