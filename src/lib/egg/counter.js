// Visitor egg counter. Uses the public abacus counter service; anyone can inflate
// it and idle counters expire, so treat the numbers as a toy. Falls back to
// device-only counts in localStorage when the service is unreachable.

const BASE = "https://abacus.jasoncameron.dev/";
const NS = "danh295-portfolio-eggs";
const LOCAL_KEY = "danny-egg-local";
const key = (x) => x.replace(/[^a-z]/g, "");

// verb is "hit" (increment and read) or "get".
async function read(verb, type) {
  const r = await fetch(BASE + verb + "/" + NS + "/" + key(type));
  if (r.status === 404) return 0;
  if (!r.ok) throw new Error("counter " + r.status);
  return (await r.json()).value || 0;
}

function countLocally(type, types) {
  let loc = {};
  try {
    loc = JSON.parse(localStorage.getItem(LOCAL_KEY) || "{}");
  } catch {
    // ignore unreadable storage
  }
  loc[type] = (loc[type] || 0) + 1;
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(loc));
  } catch {
    // ignore blocked storage
  }
  return { vals: types.map((x) => loc[x] || 0), you: type, live: false };
}

/**
 * Count one `type` and return { vals, you, live } for all `types`, or null.
 * The egg is recorded exactly once: remotely if the `hit` lands, otherwise on this
 * device. If the hit lands but reading the other totals fails, there are no honest
 * numbers to show, so it returns null (no stats panel) rather than counting again.
 */
export async function countEgg(type, types) {
  let mine;
  try {
    mine = await read("hit", type);
  } catch {
    return countLocally(type, types);
  }
  try {
    const vals = await Promise.all(types.map((x) => (x === type ? mine : read("get", x))));
    return { vals, you: type, live: true };
  } catch {
    return null;
  }
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
