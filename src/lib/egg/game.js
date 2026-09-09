// Pure rules for the egg minigame: clock, grading and stats. No DOM, no timers.

import { pad } from "../format";

/** Clock settings. Everything is in the clock's own unit (seconds or "minutes" shown as m:ss). */
export function clockConfig(mode = "seconds") {
  if (mode === "minutes") {
    const fmt = (x) => pad(Math.floor(x / 60)) + ":" + pad(Math.floor(x % 60));
    return { m: true, T: 390, hide: 180, ice: 120, max: 900, fmt };
  }
  return { m: false, T: 6.5, hide: 3, ice: 2, max: 15, fmt: (x) => x.toFixed(2) + "s" };
}

export const fillTimes = (s, C) => s.replace(/\{T\}/g, C.fmt(C.T)).replace(/\{H\}/g, C.fmt(C.hide));

/** Clock text while boiling: live time, then a "hides in" countdown, then hidden. */
export function boilClockText(elapsed, C) {
  const left = C.hide - elapsed;
  if (left > 3) return C.fmt(elapsed);
  if (left > 0) return C.fmt(elapsed) + "  hides in " + Math.ceil(left);
  return C.m ? "?:??" : "?.??s";
}

/**
 * Grade a cook time. d = elapsed − goal (in seconds; ×60 thresholds in minutes mode).
 * `type` is the counter bucket ("so close" counts as jammy).
 */
export function gradeEgg(cook, C) {
  const d = cook - C.T,
    u = C.m ? 60 : 1,
    ad = Math.abs(d);
  const word =
    ad <= 0.15 * u
      ? "perfect"
      : ad <= 0.25 * u
        ? "so close"
        : ad <= 0.5 * u
          ? "jammy"
          : d < 0
            ? "runny"
            : d <= 1.5 * u
              ? "firm"
              : "hard-boiled";
  const yolk = ad <= 0.5 * u ? "jammy" : d < 0 ? "runny" : d <= 1.5 * u ? "firm" : "hard";
  const dripMax = { runny: 1.2, jammy: 0.85, firm: 0.25, hard: 0 }[yolk];
  const off =
    ad < (C.m ? 1 : 0.005)
      ? "dead on"
      : (C.m ? Math.round(ad) + "s " : ad.toFixed(2) + "s ") + (d < 0 ? "early" : "late");
  return { word, type: word === "so close" ? "jammy" : word, yolk, dripMax, off };
}

/** Closer to the goal than the previous best? */
export const isNewBest = (cook, best, C) =>
  best == null || Math.abs(cook - C.T) < Math.abs(best - C.T);

/** Header + rows for the visitor stats panel. */
export function statsView(stats, types) {
  const tot = stats.vals.reduce((x, y) => x + y, 0) || 1;
  return {
    head: stats.live
      ? tot.toLocaleString() + " eggs cooked by visitors"
      : tot + " eggs cooked on this device",
    rows: types.map((x, i) => {
      const f = Math.round((stats.vals[i] / tot) * 10);
      return {
        name: (x === stats.you ? "› " : "  ") + x,
        bar: "■".repeat(f) + "□".repeat(10 - f),
        n: String(stats.vals[i]),
      };
    }),
  };
}
