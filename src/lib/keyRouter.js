// Every keydown the app handles, decided in one place (no DOM): App reads the facts of
// the key and the page (`facts`, see test/keys.test.mjs), routeKey decides, App applies
// the decision. The order of the checks below is the keyboard model (CLAUDE.md).
//
// A decision is null (leave the key alone) or { prevent?, do?, ...args, blur?,
// flashKey?, flashSelected? }:
//   prevent        preventDefault the event
//   do             what App does (its applyKey switch), with args such as `n` or `row`
//   blur           first drop focus (a button a click left it on, before j/k and the
//                  arrows; the embedded shell's input, on Esc)
//   flashKey       flash the topmost [data-key] button for this key (src/lib/pressFx.js)
//   flashSelected  a selector: flash the selected element (before acting, since acting
//                  can remove it, e.g. a project row)

import { EXP_TOGGLE, stepSelection } from "@/lib/selection";

// While a popup is open, these scroll its list ([data-popup-scroll]) instead of the page
// behind it: lines (±1), pages (±2) or the ends (±3); 0 just stops the page moving.
const POPUP_SCROLL = {
  ArrowDown: 1,
  ArrowUp: -1,
  ArrowLeft: 0,
  ArrowRight: 0,
  PageDown: 2,
  PageUp: -2,
  " ": 2,
  Home: -3,
  End: 3,
};
// The keys a popup lets through to the shortcut table.
const POPUP_KEYS = new Set(["Escape", "?", "m", "s"]);

const isPress = (f) => f.key === "Enter" || f.key === " ";
const onPopup = (f) => f.help || f.aboutOpen;
// Something covers the section list: a project page, a popup or the embedded shell.
const covered = (f) => f.view || f.help || f.termOpen || f.aboutOpen;

/**
 * The shortcut table: every key the gui routes. `act(f)` returns the decision's action
 * part ({ do, ...args }, or {} to do nothing but still take the key); entries without
 * `act` are handled before the table (` and s) and are here for their flags. Flags:
 * `noRepeat` (a held key acts once: a held t would strobe the whole page between
 * themes), `nav` (moves the selection, so it first drops focus a click left on a
 * button), `mainOnly` (does nothing on a project page; the browser keeps the key).
 */
export const KEYS = {
  Escape: { noRepeat: true, act: escape },
  "?": { noRepeat: true, act: () => ({ do: "toggleHelp" }) },
  m: { noRepeat: true, act: () => ({ do: "toggleAbout" }) },
  i: { noRepeat: true, act: (f) => (f.view ? {} : { do: "toggleRules" }) },
  t: { noRepeat: true, act: () => ({ do: "toggleTheme" }) },
  h: { nav: true, act: () => ({ do: "goHome" }) },
  1: { nav: true, act: () => ({ do: "goSec", n: 1 }) },
  2: { nav: true, act: () => ({ do: "goSec", n: 2 }) },
  3: { nav: true, act: () => ({ do: "goSec", n: 3 }) },
  ArrowDown: {
    nav: true,
    mainOnly: true,
    act: (f) => ({ do: "goSec", n: Math.min(3, f.activeSec + 1) }),
  },
  ArrowUp: {
    nav: true,
    mainOnly: true,
    act: (f) => ({ do: "goSec", n: Math.max(0, f.activeSec - 1) }),
  },
  f: { noRepeat: true, act: (f) => ({ do: "setFilter", idx: (f.filterIdx + 1) % f.folderCount }) },
  j: { nav: true, act: (f) => step(f, 1) },
  k: { nav: true, act: (f) => step(f, -1) },
  Enter: { noRepeat: true, act: enter },
  // On the main page ←/→ move like k/j; on a project they step between projects.
  ArrowRight: { nav: true, act: (f) => (f.view ? stepProject(f, 1) : step(f, 1)) },
  ArrowLeft: { nav: true, act: (f) => (f.view ? stepProject(f, -1) : step(f, -1)) },
  Backspace: { noRepeat: true, act: (f) => (f.view ? { do: "goBack" } : {}) },
  e: { noRepeat: true, act: () => ({ do: "mail" }) },
  g: { noRepeat: true, act: () => ({ do: "openLink", link: "github" }) },
  l: { noRepeat: true, act: () => ({ do: "openLink", link: "linkedin" }) },
  r: { noRepeat: true, act: () => ({ do: "openLink", link: "resume" }) },
  "`": { noRepeat: true },
  s: { noRepeat: true },
};

/** Decide what one keydown does. */
export function routeKey(f) {
  if (f.mode === "term") return terminal(f);
  return gui(f);
}

// Terminal mode: vim takes the keys while it's open; otherwise Enter and Ctrl-C run in
// the shell and any other typed character goes to the prompt. A focused button or link
// ([exit], links from `cat contact.vcf`) keeps its own Enter/Space.
function terminal(f) {
  if (f.vim) return isPress(f) && f.onButton ? null : { do: "vim" };
  if (f.typing) return null;
  if ((f.key === "Enter" && !f.onButton) || (f.ctrl && f.key === "c" && f.selectionCollapsed))
    return { do: "termShell" };
  if (!f.meta && !f.ctrl && !f.alt && f.key.length === 1 && !(f.key === " " && f.onButton))
    return { do: "focusTerm" };
  return null;
}

// The gui (and any popup over it), checked in this order.
function gui(f) {
  const { key } = f;
  if (f.repeat && !f.typing && KEYS[key]?.noRepeat) return { prevent: true };
  if (onPopup(f) && !POPUP_KEYS.has(key)) return popup(f);
  const mod = f.meta || f.ctrl || f.alt;
  // A plain ` toggles the embedded shell, even from its own input.
  if (key === "`" && !mod)
    return f.keysOn ? { prevent: true, do: "toggleShell", flashKey: "`" } : null;
  if (f.typing) return key === "Escape" ? { do: "closeShell", blur: true } : null;
  if (mod) return null;
  if (f.help && key === "s") return { prevent: true, do: "toggleKeys", flashKey: "s" };
  // The embedded shell is open but its input lost focus (e.g. after selecting output to
  // copy): typing goes back to its prompt instead of firing shortcuts.
  if (
    f.termOpen &&
    !onPopup(f) &&
    (key.length === 1 || key === "Backspace" || key === "Enter") &&
    !(isPress(f) && f.onButton)
  )
    return { do: "focusEmbed", enter: key === "Enter" };
  // A link or button reached with Tab keeps its Enter/Space, even with the egg selected or
  // the rules card up; focus a click left behind doesn't.
  const tabbed = isPress(f) && f.tabFocused;
  // The first-round rules card is up: Enter, Space or any character key proceeds (only
  // Enter and Space with shortcuts off); Esc puts it away; other keys keep their jobs.
  if (f.briefing && f.eggOnScreen && !f.view && !onPopup(f)) {
    if (key === "Escape") return { prevent: true, do: "resetEgg" };
    if ((isPress(f) || (f.keysOn && key.length === 1)) && !tabbed)
      return { prevent: true, do: "proceedRules" };
  }
  // Moving the selection drops focus a click left on a button, so Enter/Space then act on
  // the selection rather than that button.
  const blur = !!KEYS[key]?.nav && (f.keysOn || key.length > 1) && f.onButton;
  const d = table(f, tabbed);
  return blur ? { ...d, blur: true } : d;
}

// The popup branch: scroll keys scroll its list. Cmd+↑/↓ jump to its ends (they'd
// scroll the inert page behind it); every other combination is the browser's (Alt/Cmd+←/→
// are Back/Forward).
function popup(f) {
  if (f.meta || f.ctrl || f.alt) {
    const end = f.meta && !f.ctrl && !f.alt && { ArrowDown: 3, ArrowUp: -3 }[f.key];
    return end ? { prevent: true, do: "scrollPopup", dir: end } : null;
  }
  const dir = POPUP_SCROLL[f.key];
  if (dir === undefined || (f.key === " " && f.onButton)) return null;
  if (!dir) return { prevent: true };
  return { prevent: true, do: "scrollPopup", dir: f.key === " " && f.shift ? -2 : dir };
}

// After the guards: the egg key, Space, then the shortcut table.
function table(f, tabbed) {
  const { key } = f;
  // With the egg selected, Enter/Space play it even if a button kept focus from an
  // earlier click (e.g. the rules chip), so a timed press never goes elsewhere.
  const eggKey = isPress(f) && !tabbed && !covered(f) && f.activeSec === 0 && f.heroSel === "egg";
  if (eggKey) return { prevent: true, ...(f.repeat ? {} : press(f)) };
  // Otherwise Enter/Space on a focused link or button are left to the browser.
  if (isPress(f) && f.onControl) return null;
  // Space presses the selected element like Enter (with nothing selected it scrolls).
  if (key === " ") return selection(f) ? { prevent: true, ...(f.repeat ? {} : press(f)) } : null;
  // Shortcuts off: every single-character key is left alone.
  if (!f.keysOn && key.length === 1) return null;
  const entry = KEYS[key];
  if (!entry?.act) return null;
  if ((key === "ArrowLeft" || key === "ArrowRight") && f.view && f.viewIdx < 0) return null;
  if (entry.mainOnly && f.view) return null;
  return { prevent: true, ...entry.act(f), flashKey: key };
}

// Esc closes the topmost thing: a popup, the rules card, the shell, the project page, an
// open role, else it clears the selection.
function escape(f) {
  if (f.help) return { do: "closeHelp" };
  if (f.aboutOpen) return { do: "closeAbout" };
  if (f.rulesOpen && !f.view) return { do: "closeRules" };
  if (f.termOpen) return { do: "closeShell" };
  if (f.view) return { do: "goBack" };
  if (f.expOpen >= 0) return { do: "collapseExp" };
  return { do: "clearSelection" };
}

// Enter: on the hero heading it jumps to the egg; otherwise it presses the selection.
function enter(f) {
  if (covered(f)) return {};
  if (f.activeSec === 0 && f.heroSel === "head") return { do: "selectHero", heroSel: "egg" };
  return press(f);
}

// The selected element that Enter/Space would press (null on a section header or while
// something covers the page): its selector, to flash it, and what pressing it does.
function selection(f) {
  if (covered(f)) return null;
  if (f.activeSec === 0) {
    if (f.heroSel === "more") return { el: '[data-key="m"]', act: { do: "openAbout" } };
    if (f.heroSel === "rules") return { el: '[data-key="i"]', act: { do: "toggleRules" } };
    // The egg plays only while its frame is on screen.
    if (f.heroSel === "egg")
      return { el: "[data-egg]", act: f.eggOnScreen ? { do: "startEgg" } : {} };
    return null;
  }
  if (f.activeSec === 1 && f.sel >= 0 && f.sel < f.listLength)
    return { el: `[data-row="${f.sel}"]`, act: { do: "openProject", row: f.sel } };
  if (f.activeSec === 2 && f.expSel >= 0) {
    if (f.expSel === EXP_TOGGLE(f.expEarlier))
      return { el: "[data-earlier]", act: { do: "toggleEarlier" } };
    const i = f.expOpen === f.expSel ? -1 : f.expSel;
    return { el: `[data-exprow="${f.expSel}"] > button`, act: { do: "setExpOpen", i } };
  }
  return null;
}

// Press the selected element: it flashes, then acts.
function press(f) {
  const s = selection(f);
  return s ? { flashSelected: s.el, ...s.act } : {};
}

// j/k: one step of the selection model (src/lib/selection.js); nothing on a project page.
function step(f, dir) {
  if (f.view) return {};
  const r = stepSelection(dir, f);
  if (!r) return {};
  if (r.goSec) return { do: "goSec", n: r.goSec[0], stop: r.goSec[1] };
  if (r.heroSel) return { do: "selectHero", heroSel: r.heroSel };
  if (r.sel != null) return { do: "selectRow", sel: r.sel };
  return { do: "selectExp", expSel: r.expSel };
}

// ←/→ on a project page: the previous/next project (wrapping).
function stepProject(f, dir) {
  const n = f.projectCount;
  return { do: "openProjectIdx", idx: (f.viewIdx + dir + n) % n };
}
