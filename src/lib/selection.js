// The gui's j/k selection model as pure functions (App.jsx applies the results). Every
// section's header is its first stop; j/k then move through its elements and on into the
// next/previous section. Rows are indices with -1 = the header.

import { experienceEntries } from "@/data/experience";

// Experience rows: the main roles, then (if any roles are `early`) an "earlier · n roles"
// toggle that unfolds them. The toggle is a stop after the rows it sits below: right
// after the main roles when folded, after the early roles when unfolded.
export const EXP_MAIN = ((i) => (i < 0 ? experienceEntries.length : i))(
  experienceEntries.findIndex((e) => e.early),
);
export const HAS_EARLY = EXP_MAIN < experienceEntries.length;
export const EXP_TOGGLE = (earlier) =>
  HAS_EARLY ? (earlier ? experienceEntries.length : EXP_MAIN) : -1;
export const EXP_LAST = (earlier) => (HAS_EARLY ? EXP_TOGGLE(earlier) : EXP_MAIN - 1);

/** Hero stops in order; the rules chip joins once the rules have been seen. */
export const heroStops = (rulesSeen) => ["head", "more", ...(rulesSeen ? ["rules"] : []), "egg"];

/**
 * One j (`dir` 1) or k (-1) step from `s` = { activeSec, heroSel, sel, expSel,
 * expEarlier, rulesSeen, listLength }. Returns what to change: { heroSel } | { sel } |
 * { expSel }, or { goSec: [n, stop] } to jump to section n (landing on `stop`: a row
 * index, or a hero stop), or null when there's nowhere to go.
 */
export function stepSelection(dir, s) {
  const stops = heroStops(s.rulesSeen),
    lastExp = EXP_LAST(s.expEarlier);
  if (dir > 0) {
    if (s.activeSec === 0) {
      const i = stops.indexOf(s.heroSel);
      return i < stops.length - 1 ? { heroSel: stops[i + 1] } : { goSec: [1] };
    }
    if (s.activeSec === 1) return s.sel >= s.listLength - 1 ? { goSec: [2] } : { sel: s.sel + 1 };
    if (s.activeSec === 2) return s.expSel >= lastExp ? { goSec: [3] } : { expSel: s.expSel + 1 };
    return null;
  }
  if (s.activeSec === 3) return { goSec: [2, lastExp] };
  if (s.activeSec === 2)
    return s.expSel < 0 ? { goSec: [1, s.listLength - 1] } : { expSel: s.expSel - 1 };
  if (s.activeSec === 1) return s.sel < 0 ? { goSec: [0, "egg"] } : { sel: s.sel - 1 };
  const i = stops.indexOf(s.heroSel);
  return i > 0 ? { heroSel: stops[i - 1] } : null;
}
