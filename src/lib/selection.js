// The gui's j/k selection model as pure functions (App.jsx applies the results). Every
// section's header is its first stop; j/k then move through its elements and on into the
// next/previous section. Rows are indices with -1 = the header.

import { experienceEntries } from "@/data/experience";
import { coreTechStack } from "@/data/home";

// Experience rows: one stop per role.
export const EXP_LAST = experienceEntries.length - 1;

// Skills: one stop per skill, in the order the section lists them (group by group).
export const SKILL_NAMES = coreTechStack.flatMap((g) => g.items.map((it) => it.name));
export const SKILL_LAST = SKILL_NAMES.length - 1;

/** Hero stops in order; the rules chip joins once the rules have been seen. */
export const heroStops = (rulesSeen) => ["head", "more", ...(rulesSeen ? ["rules"] : []), "egg"];

/**
 * One j (`dir` 1) or k (-1) step from `s` = { activeSec, heroSel, sel, expSel, skillSel,
 * rulesSeen, listLength }. Returns what to change: { heroSel } | { sel } |
 * { expSel } | { skillSel }, or { goSec: [n, stop] } to jump to section n (landing on `stop`: a row
 * index, or a hero stop), or null when there's nowhere to go.
 */
export function stepSelection(dir, s) {
  const stops = heroStops(s.rulesSeen);
  if (dir > 0) {
    if (s.activeSec === 0) {
      const i = stops.indexOf(s.heroSel);
      return i < stops.length - 1 ? { heroSel: stops[i + 1] } : { goSec: [1] };
    }
    if (s.activeSec === 1) return s.sel >= s.listLength - 1 ? { goSec: [2] } : { sel: s.sel + 1 };
    if (s.activeSec === 2) return s.expSel >= EXP_LAST ? { goSec: [3] } : { expSel: s.expSel + 1 };
    return s.skillSel >= SKILL_LAST ? null : { skillSel: s.skillSel + 1 };
  }
  if (s.activeSec === 3)
    return s.skillSel < 0 ? { goSec: [2, EXP_LAST] } : { skillSel: s.skillSel - 1 };
  if (s.activeSec === 2)
    return s.expSel < 0 ? { goSec: [1, s.listLength - 1] } : { expSel: s.expSel - 1 };
  if (s.activeSec === 1) return s.sel < 0 ? { goSec: [0, "egg"] } : { sel: s.sel - 1 };
  const i = stops.indexOf(s.heroSel);
  return i > 0 ? { heroSel: stops[i - 1] } : null;
}

// The hero's stops as read out (the heading, its first stop, reads nothing).
const HERO_NAMES = { more: "more about me", rules: "how to play", egg: "egg minigame" };

/**
 * What the polite live region reads for the hero's j/k stops (they are shown by colour only),
 * from `s` = { mode, view, activeSec, heroSel }. "" on the heading, on every other section (their
 * rows take focus and carry their own names), in terminal mode and on a project page.
 */
export function selectionLabel(s) {
  if (s.mode !== "gui" || s.view || s.activeSec !== 0) return "";
  return HERO_NAMES[s.heroSel] ?? "";
}
