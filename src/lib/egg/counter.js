// Egg counter: eggs cooked on this device, kept in localStorage. Nothing leaves the
// browser (an earlier version called a public counter service).

const LOCAL_KEY = "danny-egg-local";

/** Count one `type` on this device and return { vals, you } for all `types`. */
export function countEgg(type, types) {
  let loc = {};
  try {
    loc = JSON.parse(localStorage.getItem(LOCAL_KEY) || "{}") || {};
  } catch {
    // ignore unreadable storage
  }
  loc[type] = (loc[type] || 0) + 1;
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(loc));
  } catch {
    // ignore blocked storage
  }
  return { vals: types.map((x) => loc[x] || 0), you: type };
}

const bestKey = (C) => "danny-egg-best-" + (C.m ? "min" : "sec");

export function readBest(C) {
  try {
    const v = localStorage.getItem(bestKey(C));
    return v == null ? null : +v;
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
