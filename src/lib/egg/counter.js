// Egg counter: eggs cooked on this device, kept in localStorage. Nothing leaves the
// browser (an earlier version called a public counter service).

const LOCAL_KEY = "danny-egg-local";

/** A stored count as a finite non-negative whole number; anything else is 0. */
export const count = (v) =>
  typeof v === "number" && Number.isFinite(v) && v > 0 ? Math.floor(v) : 0;

/** Count one `type` on this device and return { vals, you } for all `types`. */
export function countEgg(type, types) {
  let loc = {};
  try {
    loc = JSON.parse(localStorage.getItem(LOCAL_KEY) || "{}");
  } catch {
    // ignore unreadable storage
  }
  if (!loc || typeof loc !== "object" || Array.isArray(loc)) loc = {};
  loc[type] = count(loc[type]) + 1;
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(loc));
  } catch {
    // ignore blocked storage
  }
  return { vals: types.map((x) => count(loc[x])), you: type };
}

const bestKey = (C) => "danny-egg-best-" + (C.m ? "min" : "sec");

export function readBest(C) {
  try {
    const v = localStorage.getItem(bestKey(C));
    const n = v == null || v.trim() === "" ? NaN : +v;
    return Number.isFinite(n) && n >= 0 ? n : null;
  } catch {
    return null;
  }
}

export function writeBest(C, value) {
  try {
    localStorage.setItem(bestKey(C), String(value));
  } catch {
    // ignore blocked storage
  }
}
