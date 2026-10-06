// The gui's j/k selection model as pure functions (App.jsx applies the results). Every
// section's header is its first stop; j/k then move through its elements and on into the
// next/previous section. Rows are indices with -1 = the header.

import { experienceEntries } from "@/data/experience";

// Experience rows: one stop per role.
export const EXP_LAST = experienceEntries.length - 1;

/** Hero stops in order; the rules chip joins once the rules have been seen. */
export const heroStops = (rulesSeen) => ["head", "more", ...(rulesSeen ? ["rules"] : []), "egg"];

/**
 * One j (`dir` 1) or k (-1) step from `s` = { activeSec, heroSel, sel, expSel, rulesSeen,
 * listLength }. Returns what to change: { heroSel } | { sel } |
 * { expSel }, or { goSec: [n, stop] } to jump to section n (landing on `stop`: a row
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
    return null;
  }
  if (s.activeSec === 3) return { goSec: [2, EXP_LAST] };
  if (s.activeSec === 2)
    return s.expSel < 0 ? { goSec: [1, s.listLength - 1] } : { expSel: s.expSel - 1 };
  if (s.activeSec === 1) return s.sel < 0 ? { goSec: [0, "egg"] } : { sel: s.sel - 1 };
  const i = stops.indexOf(s.heroSel);
  return i > 0 ? { heroSel: stops[i - 1] } : null;
}
